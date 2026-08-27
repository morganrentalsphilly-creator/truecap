"use server";

/**
 * On-demand property enrichment — facts + sale comps + rent comps for a
 * deal's address, via RentCast (lib/property-enrichment/rentcast.ts).
 *
 * - Paid-gated: enrichment costs money per call, so it's for paid plans.
 * - Cache-first: results are cached globally (property_enrichment_cache,
 *   service-role) for 30 days to conserve API quota — the same address
 *   never costs two API calls within the window.
 * - Dormant without RENTCAST_API_KEY: returns NOT_CONFIGURED so the UI
 *   stays hidden until Morgan provisions the key.
 */
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasPaidPlanSubscription } from "@/lib/entitlements";
import { fetchRentCastEnrichment, type PropertyEnrichment } from "@/lib/property-enrichment/rentcast";
import { captureServerEvent } from "@/lib/posthog-server";

import * as Sentry from "@sentry/nextjs";

/** One report per server instance — a structural cache failure is a
 *  standing condition, not a per-request event. */
let hasReportedCacheReadFailure = false;

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Hard monthly cap on LIVE enrichments (each ≈ 2 RentCast API calls; a
// listing-paste enrichment is 3 calls and counts as 2 cap-units), to guard the
// 1,000-calls/mo plan limit even across many paid users. Tunable via env;
// default 300 enrichments (~600 calls), leaving headroom.
const MONTHLY_ENRICHMENT_CAP = Number.parseInt(process.env.RENTCAST_MONTHLY_ENRICHMENT_CAP ?? "300", 10);

// Per-Pro-user monthly cap on live lookups (distinct properties). Each property
// ≈ 2 API calls. Default 50 properties/user/month. Free users instead get one
// lifetime lookup (profiles.comps_free_used). Tunable via env.
const PER_USER_MONTHLY_CAP = Number.parseInt(process.env.RENTCAST_PER_USER_MONTHLY_CAP ?? "50", 10);

// How many "no data / provider error" lookups per user per month still hand the
// free user's one-shot freebie back. Without a ceiling the refund path is an
// unlimited free-lookup generator (junk address → miss → refund → repeat), each
// iteration still costing real RentCast calls. Tunable via env.
const MISS_REFUND_CAP_RAW = Number.parseInt(process.env.RENTCAST_MISS_REFUND_CAP ?? "3", 10);
const MISS_REFUND_CAP = Number.isFinite(MISS_REFUND_CAP_RAW) && MISS_REFUND_CAP_RAW > 0 ? MISS_REFUND_CAP_RAW : 3;

const inputSchema = z.object({
  address: z.string().trim().min(5).max(300),
  propertyType: z.enum(["single-family", "multi-family", "owner-occupant"]).optional(),
  bedrooms: z.number().min(0).max(50).nullish(),
  bathrooms: z.number().min(0).max(50).nullish(),
  squareFootage: z.number().min(0).max(1_000_000).nullish(),
  /** When present, the pulled comp set is saved onto this saved deal. */
  dealId: z.string().uuid().optional(),
  /** Auto-fill paths (e.g. pasting a listing link) set this so the lookup runs
   *  ONLY for Pro users — a free user's one-time freebie is never spent on an
   *  action they didn't explicitly click. Non-Pro callers get ENTITLEMENT_REQUIRED
   *  before any freebie is touched. */
  proOnly: z.boolean().optional(),
  /** Also fetch the real for-sale list price (one extra RentCast call to
   *  /listings/sale). Used by the listing-link paste so the deal gets the
   *  actual asking price, not just the AVM estimate. */
  includeListing: z.boolean().optional(),
});

export type PropertyCompsResult =
  | { ok: true; source: "cache" | "live"; enrichment: PropertyEnrichment }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "ENTITLEMENT_REQUIRED"
        | "NOT_CONFIGURED"
        | "NOT_FOUND"
        | "CAP_REACHED"
        | "VALIDATION_ERROR"
        | "SERVER_ERROR";
      message: string;
    };

function addressKey(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Map our form's property type to a RentCast propertyType hint. */
function rentCastType(t?: "single-family" | "multi-family" | "owner-occupant"): string | null {
  if (t === "multi-family") return "Multi-Family";
  if (t === "single-family" || t === "owner-occupant") return "Single Family";
  return null;
}

export async function getPropertyCompsAction(input: unknown): Promise<PropertyCompsResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Enter a full property address first." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }

  // Pro = unlimited (within the monthly cap). Free users get ONE live lookup
  // as a taste, then are gated. Cached views never burn the freebie (handled
  // at the live-fetch commit point below).
  const isPaid = await hasPaidPlanSubscription(supabase, user.id);
  const freeUser = !isPaid;
  // Pro-only auto-fill (e.g. listing-link paste): never spend a free user's
  // freebie on a lookup they didn't explicitly request.
  if (parsed.data.proOnly && freeUser) {
    return {
      ok: false,
      code: "ENTITLEMENT_REQUIRED",
      message: "Pull comps to fill beds, baths, and value — included with Pro.",
    };
  }
  if (freeUser) {
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("comps_free_used")
      .eq("id", user.id)
      .maybeSingle();
    // Column missing (migration pending) → don't risk free spend; gate.
    if (profErr || Boolean((prof as { comps_free_used?: boolean } | null)?.comps_free_used)) {
      return {
        ok: false,
        code: "ENTITLEMENT_REQUIRED",
        message: "You've used your free comps lookup. Upgrade to Pro for up to 50 sale + rent comp lookups per month.",
      };
    }
  }

  if (!process.env.RENTCAST_API_KEY) {
    return { ok: false, code: "NOT_CONFIGURED", message: "Comps aren't enabled yet." };
  }

  const key = addressKey(parsed.data.address);
  const admin = createAdminSupabaseClient();

  // When a dealId is supplied, persist the pulled comp set onto that saved
  // deal (a reference set — it never feeds the analysis math). Verify the
  // caller owns the deal first, since admin bypasses RLS.
  const dealId = parsed.data.dealId ?? null;
  const persistToDeal = async (payload: PropertyEnrichment) => {
    if (!dealId) return;
    const { data: owns } = await admin
      .from("saved_analyses")
      .select("id, address")
      .eq("id", dealId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!owns) return;
    // The pulled address must match the deal's stored address: a stale
    // dealId from a repurposed analyzer form (address typed over a loaded
    // deal) would otherwise permanently overwrite the ORIGINAL deal's comp
    // set with another property's comps. Skip persistence only — the caller
    // still gets the enrichment to display. Rows without a stored address
    // can't be checked and persist as before.
    const savedAddress = (owns as { address?: string | null }).address;
    if (
      typeof savedAddress === "string" &&
      savedAddress.trim().length > 0 &&
      addressKey(savedAddress) !== key
    ) {
      return;
    }
    await admin
      .from("deal_comps")
      .upsert(
        {
          analysis_id: dealId,
          user_id: user.id,
          payload: payload as unknown as Record<string, unknown>,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "analysis_id" }
      )
      .then(
        () => undefined,
        () => undefined
      );
  };

  // Cache-first. Read the row once; serve it if fresh, keep it as a stale
  // fallback for the cap / fetch-failure paths below.
  const { data: cached, error: cacheReadError } = await admin
    .from("property_enrichment_cache")
    .select("payload, fetched_at")
    .eq("address_key", key)
    .maybeSingle();
  // The error was previously destructured away, so a MISSING TABLE looked
  // identical to a cache miss: every lookup silently fell through to the
  // metered RentCast API and the 30-day cache never saved a call. Report the
  // structural failure once per cold start — loudly enough to notice, not so
  // loudly that a transient blip floods Sentry. Never fail the user's
  // request: an unreadable cache must still serve a live lookup.
  if (cacheReadError && !hasReportedCacheReadFailure) {
    hasReportedCacheReadFailure = true;
    Sentry.captureMessage(
      "[property-comps] enrichment cache unreadable — serving uncached (paid) lookups",
      {
        level: "error",
        tags: { feature: "property-comps", stage: "cache-read" },
        extra: { code: cacheReadError.code ?? null },
      }
    );
  }
  const cachedPayload = cached ? (cached as { payload: PropertyEnrichment }).payload : null;
  // When the asking price is requested, only serve a cached payload whose
  // listing was actually CHECKED (listingChecked) — a confirmed "not listed"
  // result is good enough and must be cacheable, or every repeat paste of a
  // non-listed address would re-fetch 3 calls forever. Cache rows that predate
  // the listing feature (listingChecked undefined) fall through once to refresh.
  const cacheHasWhatWeNeed =
    !parsed.data.includeListing || cachedPayload?.listingChecked === true;
  if (cached && cacheHasWhatWeNeed) {
    const fetchedAt = new Date((cached as { fetched_at: string }).fetched_at).getTime();
    if (Number.isFinite(fetchedAt) && Date.now() - fetchedAt < CACHE_TTL_MS) {
      await persistToDeal(cachedPayload!);
      return { ok: true, source: "cache", enrichment: cachedPayload! };
    }
  }

  // Spend guards — a live call consumes API quota, so stop before two limits:
  // a global monthly cap (across all users) and a per-Pro-user monthly cap.
  // Both count live enrichments per calendar month (UTC); cache hits above
  // never reach here, so they don't count.
  const month = new Date().toISOString().slice(0, 7);
  const monthKey = `rentcast_enrichments_${month}`;
  const userMonthKey = `comps_user_${user.id}_${month}`;

  // A listing-paste enrichment makes a 3rd RentCast call (/listings/sale), so it
  // costs 2 global budget units; a plain enrichment costs 1.
  const globalCost = parsed.data.includeListing ? 2 : 1;
  let reservedGlobal = 0; // units reserved on monthKey upfront (refund on failure)
  let legacyUserCounting = false; // RPC absent → fall back to post-fetch counting
  let legacyGlobalCounting = false; // RPC absent → fall back to post-fetch counting

  if (Number.isFinite(MONTHLY_ENRICHMENT_CAP) && MONTHLY_ENRICHMENT_CAP > 0) {
    // RESERVE atomically BEFORE the fetch — bumps the counter only while still
    // under the cap, so concurrent lookups can't all clear one read-gate and
    // overshoot the budget. NULL = already at cap.
    const { data: reserved, error: reserveErr } = await admin.rpc("increment_app_counter_if_under", {
      counter_key: monthKey,
      max_value: MONTHLY_ENRICHMENT_CAP,
      amount: globalCost,
    });
    if (reserveErr) {
      // Atomic RPC not deployed yet → legacy read-gate + post-fetch increment.
      legacyGlobalCounting = true;
      const { data: counterRow } = await admin
        .from("app_counters")
        .select("count")
        .eq("key", monthKey)
        .maybeSingle();
      const used = Number((counterRow as { count?: number } | null)?.count ?? 0);
      if (used >= MONTHLY_ENRICHMENT_CAP) {
        if (cachedPayload) {
          await persistToDeal(cachedPayload);
          return { ok: true, source: "cache", enrichment: cachedPayload };
        }
        return {
          ok: false,
          code: "CAP_REACHED",
          message: "Comps have reached this month's data limit. They'll reset at the start of next month.",
        };
      }
    } else if (reserved == null) {
      // At the global cap: serve a stale cached copy if we have one, else say so.
      if (cachedPayload) {
        await persistToDeal(cachedPayload);
        return { ok: true, source: "cache", enrichment: cachedPayload };
      }
      return {
        ok: false,
        code: "CAP_REACHED",
        message: "Comps have reached this month's data limit. They'll reset at the start of next month.",
      };
    } else {
      reservedGlobal = globalCost;
    }
  }

  // Per-Pro-user monthly cap (free users are bounded by the one-lifetime gate
  // above, so this only applies to paid users).
  // ATOMIC RESERVE, not read-then-act. This was a `select count` gate with the
  // increment only on SUCCESS, which meant (a) concurrent calls all read the
  // same pre-increment value and sailed past the cap together, and (b) every
  // lookup that MISSED cost the shared RentCast budget a unit while charging
  // the caller nothing — so one user could drain the site-wide monthly budget
  // with addresses RentCast cannot resolve. Reserving up front makes the
  // caller pay for the attempt; the refund paths below hand it back when we
  // never actually spend.
  if (isPaid && Number.isFinite(PER_USER_MONTHLY_CAP) && PER_USER_MONTHLY_CAP > 0) {
    const { data: userReserved, error: userReserveErr } = await admin.rpc(
      "increment_app_counter_if_under",
      { counter_key: userMonthKey, max_value: PER_USER_MONTHLY_CAP, amount: 1 }
    );
    let atUserCap = false;
    if (userReserveErr) {
      // Atomic RPC not deployed yet → legacy read-gate + post-fetch increment,
      // exactly as the global cap above degrades.
      legacyUserCounting = true;
      const { data: userRow } = await admin
        .from("app_counters")
        .select("count")
        .eq("key", userMonthKey)
        .maybeSingle();
      atUserCap = Number((userRow as { count?: number } | null)?.count ?? 0) >= PER_USER_MONTHLY_CAP;
    } else if (userReserved == null) {
      atUserCap = true;
    }
    // NOTE: a successful per-user reserve is never refunded. That is the point
    // of reserving: a lookup that MISSES still consumed a paid RentCast call,
    // so it must consume the caller's allowance too. Only the global counter
    // has refund paths, and only for lookups we never actually send.
    if (atUserCap) {
      // We may have already reserved a global unit above — give it back since
      // this lookup won't proceed. (Nothing was reserved on the per-user
      // counter: we only get here when the reserve was refused.)
      if (reservedGlobal > 0) {
        await admin
          .rpc("decrement_app_counter", { counter_key: monthKey, amount: reservedGlobal })
          .then(() => undefined, () => undefined);
        reservedGlobal = 0;
      }
      if (cachedPayload) {
        await persistToDeal(cachedPayload);
        return { ok: true, source: "cache", enrichment: cachedPayload };
      }
      return {
        ok: false,
        code: "CAP_REACHED",
        message: `You've used all ${PER_USER_MONTHLY_CAP} comp lookups in your plan this month. Your limit resets on the 1st.`,
      };
    }
  }

  // Committing to a live lookup (cache miss, under cap). For a free user this
  // spends their one freebie. Claim it ATOMICALLY — a conditional update that
  // only succeeds while it's still unused — so two concurrent requests can't
  // both clear the earlier read-gate and spend two live RentCast calls on one
  // freebie (protects the monthly API budget).
  if (freeUser) {
    // Claimed with the ADMIN client on purpose: `comps_free_used` is an
    // entitlement ledger, not user data. The `profiles_update_own` RLS policy
    // is whole-row, so a signed-in free user could PATCH the column back to
    // false through PostgREST and mint unlimited "one lifetime" lookups. The
    // matching DB-side lock lives in
    // supabase/migrations/20260802130000_profiles_lock_comps_free_used.sql —
    // this action (service role) is the only writer.
    const { data: claimed } = await admin
      .from("profiles")
      .update({ comps_free_used: true })
      .eq("id", user.id)
      .eq("comps_free_used", false)
      .select("id")
      .maybeSingle();
    if (!claimed) {
      // Lost the freebie race — give back the global unit we reserved upfront.
      // (No per-user unit to refund: `freeUser === !isPaid`, and only paid
      // users reserve on the per-user counter.)
      if (reservedGlobal > 0) {
        await admin
          .rpc("decrement_app_counter", { counter_key: monthKey, amount: reservedGlobal })
          .then(() => undefined, () => undefined);
        reservedGlobal = 0;
      }
      return {
        ok: false,
        code: "ENTITLEMENT_REQUIRED",
        message: "You've used your free comps lookup. Upgrade to Pro for up to 50 sale + rent comp lookups per month.",
      };
    }
  }

  // Give the freebie back when the live lookup yields nothing billable (an
  // un-indexed address or a provider outage). RentCast doesn't charge for a
  // null result, so a free user shouldn't lose their one shot on empty data.
  //
  // The GLOBAL budget unit is deliberately NOT refunded here. That counter is a
  // spend/rate guard, and the request left the building either way — it consumed
  // provider rate whether or not RentCast billed it. Refunding it made the cap
  // self-defeating: a loop of junk addresses issued unbounded RentCast calls
  // while the counter never advanced (every gate variable was restored).
  // The upfront reservation IS still refunded on paths where no HTTP request was
  // made at all (per-user cap hit, lost freebie race) — see above.
  //
  // The freebie refund is itself bounded: each miss burns one unit of a small
  // per-user monthly allowance, so the refund can't be used as an unlimited
  // free-lookup generator.
  const refundUnbilledLookup = async () => {
    // (reservedGlobal stays spent — no decrement here, by design.)
    if (!freeUser) return;
    // Bounded: only refund while the caller is under their monthly miss
    // allowance. `increment_app_counter_if_under` returns null once the cap is
    // reached (atomic). If the RPC isn't deployed, `error` is set and we fall
    // back to refunding — the pre-existing behaviour.
    const { data: missAllowed, error: missErr } = await admin.rpc("increment_app_counter_if_under", {
      counter_key: `comps_miss_${user.id}_${month}`,
      max_value: MISS_REFUND_CAP,
      amount: 1,
    });
    if (!missErr && missAllowed == null) return; // allowance exhausted — freebie stays spent
    await admin
      .from("profiles")
      .update({ comps_free_used: false })
      .eq("id", user.id)
      .then(() => undefined, () => undefined);
  };

  // Live fetch. Operational telemetry is deliberately aggregate: provider,
  // lookup class, and outcome only — never the address or returned values.
  await captureServerEvent({
    distinctId: "$server",
    event: "data_lookup_started",
    properties: { provider: "rentcast", lookup_type: "property_comps" },
  });
  let enrichment: PropertyEnrichment | null = null;
  try {
    enrichment = await fetchRentCastEnrichment(
      {
        address: parsed.data.address,
        propertyType: rentCastType(parsed.data.propertyType),
        bedrooms: parsed.data.bedrooms ?? null,
        bathrooms: parsed.data.bathrooms ?? null,
        squareFootage: parsed.data.squareFootage ?? null,
      },
      { includeListing: parsed.data.includeListing }
    );
  } catch {
    await captureServerEvent({
      distinctId: "$server",
      event: "data_lookup_failed",
      properties: {
        provider: "rentcast",
        lookup_type: "property_comps",
        failure_class: "provider_error",
      },
    });
    if (cachedPayload) return { ok: true, source: "cache", enrichment: cachedPayload };
    await refundUnbilledLookup();
    return { ok: false, code: "SERVER_ERROR", message: "Couldn't reach the data provider. Try again." };
  }

  if (!enrichment) {
    await captureServerEvent({
      distinctId: "$server",
      event: "data_lookup_failed",
      properties: {
        provider: "rentcast",
        lookup_type: "property_comps",
        failure_class: "no_result",
      },
    });
    if (cachedPayload) return { ok: true, source: "cache", enrichment: cachedPayload };
    await refundUnbilledLookup();
    return { ok: false, code: "NOT_FOUND", message: "No comps found for this address." };
  }

  // Count this live enrichment against both the global + per-user monthly caps
  // (atomic; best-effort). A listing-paste enrichment makes a 3rd RentCast call
  // (/listings/sale), so charge the GLOBAL budget cap an extra unit to keep it
  // honest against the plan's call limit (the per-user cap counts properties, so
  // it stays 1 — still one property).
  // The per-user unit was RESERVED before the fetch (see above), so bumping it
  // again here would charge the caller twice for one lookup. Only the legacy
  // fallback (RPC absent, nothing reserved) still tallies post-fetch.
  const bumps: ReturnType<typeof admin.rpc>[] = [];
  if (legacyUserCounting) {
    bumps.push(admin.rpc("increment_app_counter", { counter_key: userMonthKey }));
  }
  // The global counter was already RESERVED atomically upfront — only count it
  // here in the legacy fallback path (RPC absent), where nothing was reserved.
  if (legacyGlobalCounting) {
    bumps.push(admin.rpc("increment_app_counter", { counter_key: monthKey }));
    if (parsed.data.includeListing) {
      bumps.push(admin.rpc("increment_app_counter", { counter_key: monthKey }));
    }
  }
  await Promise.all(bumps.map((p) => p.then(() => undefined, () => undefined)));

  // Upsert cache (best-effort — never fail the request on a cache write).
  await admin
    .from("property_enrichment_cache")
    .upsert(
      { address_key: key, payload: enrichment as unknown as Record<string, unknown>, fetched_at: new Date().toISOString() },
      { onConflict: "address_key" }
    )
    .then(
      () => undefined,
      () => undefined
    );

  // Save the comp set onto the deal (reference-only; never feeds the math).
  await persistToDeal(enrichment);

  await captureServerEvent({
    distinctId: "$server",
    event: "data_lookup_succeeded",
    properties: {
      provider: "rentcast",
      lookup_type: "property_comps",
      evidence_level: "estimated_from_comps",
    },
  });

  return { ok: true, source: "live", enrichment };
}

export type SavedDealCompsResult =
  | { ok: true; enrichment: PropertyEnrichment | null; fetchedAt: string | null }
  | { ok: false };

/** Load a previously-saved comp set for a deal (no API call, no quota). Returns
 *  the stored set, or null when none exists / the table isn't migrated yet. */
export async function getSavedDealCompsAction(dealId: unknown): Promise<SavedDealCompsResult> {
  const id = typeof dealId === "string" ? dealId.trim() : "";
  if (!id) return { ok: false };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data, error } = await supabase
    .from("deal_comps")
    .select("payload, fetched_at")
    .eq("analysis_id", id)
    .maybeSingle();
  // Table missing (migration pending) or no row → simply "no saved set".
  if (error || !data) return { ok: true, enrichment: null, fetchedAt: null };

  return {
    ok: true,
    enrichment: (data as { payload: PropertyEnrichment }).payload,
    fetchedAt: (data as { fetched_at: string | null }).fetched_at ?? null,
  };
}
