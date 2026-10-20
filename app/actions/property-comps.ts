"use server";

/**
 * On-demand property enrichment — facts + sale comps + rent comps for a
 * deal's address, via RentCast (lib/property-enrichment/rentcast.ts).
 *
 * - Paid-gated: enrichment costs money per call, so it's for paid plans.
 * - Cache-first: results are cached globally (property_enrichment_cache,
 *   service-role) for 30 days to conserve API quota — the same address
 *   never costs two API calls within the window.
 * - Budgeted: RentCast's free plan is 50 requests per billing period, and
 *   every request past that is billed. The authoritative reservation happens
 *   INSIDE lib/property-enrichment/rentcast.ts, immediately before the
 *   requests (lib/property-enrichment/rentcast-budget.ts). This action only
 *   READS the budget early so it can short-circuit — a free user's one lookup
 *   is never claimed when the pool is empty — and serves any cached row,
 *   regardless of age, while the pool is paused.
 * - Dormant without RENTCAST_API_KEY: returns NOT_CONFIGURED so the UI
 *   stays hidden until the founder provisions the key.
 */
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasPaidPlanSubscription } from "@/lib/entitlements";
import { fetchRentCastEnrichment, type PropertyEnrichment } from "@/lib/property-enrichment/rentcast";
import {
  currentRentCastPeriod,
  formatResumesOn,
  getRentCastBudgetStatus,
} from "@/lib/property-enrichment/rentcast-budget";
import { captureServerEvent } from "@/lib/posthog-server";

import * as Sentry from "@sentry/nextjs";

/** One report per server instance — a structural cache failure is a
 *  standing condition, not a per-request event. */
let hasReportedCacheReadFailure = false;

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Per-Pro-user cap on live lookups (distinct properties) per RentCast billing
// period. The shared pool is 50 REQUESTS a period (about 25 lookups site-wide),
// so one account must not be able to drain it: default 10 lookups per user per
// period. Free users instead get one lifetime lookup (profiles.comps_free_used).
// Tunable via env. Keyed to the same billing period as the shared pool.
const PER_USER_CAP_RAW = Number.parseInt(process.env.RENTCAST_PER_USER_MONTHLY_CAP ?? "10", 10);
const PER_USER_MONTHLY_CAP = Number.isFinite(PER_USER_CAP_RAW) ? PER_USER_CAP_RAW : 10;

// How many "no data / provider error" lookups per user per period still hand the
// free user's one-shot freebie back. Without a ceiling the refund path is an
// unlimited free-lookup generator (junk address → miss → refund → repeat), each
// iteration still costing real RentCast calls. Tunable via env.
const MISS_REFUND_CAP_RAW = Number.parseInt(process.env.RENTCAST_MISS_REFUND_CAP ?? "3", 10);
const MISS_REFUND_CAP = Number.isFinite(MISS_REFUND_CAP_RAW) && MISS_REFUND_CAP_RAW > 0 ? MISS_REFUND_CAP_RAW : 3;

/** The fire-and-forget pull on a Pro user's first save spends 2 requests
 *  nobody clicked for, so it is OFF unless RENTCAST_AUTOPULL_ON_SAVE=on. */
function isAutoPullOnSaveEnabled(): boolean {
  return (process.env.RENTCAST_AUTOPULL_ON_SAVE ?? "off").trim().toLowerCase() === "on";
}

/** What a paused pool tells the user. Never "error", "failed", "quota", "API". */
const PAUSED_BODY =
  "Your analysis still runs. Enter beds, baths and price yourself, or use comps already pulled for this address.";
const PER_USER_PAUSED_BODY =
  "You've used this period's comps lookups on your plan. Your analysis still runs. Enter beds, baths and price yourself, or use comps already pulled for this address.";
const FREEBIE_USED_MESSAGE =
  "You've used your free comps lookup. Pro includes comps lookups, subject to monthly availability.";
const PROVIDER_UNAVAILABLE_MESSAGE = "Couldn't reach the data provider. Try again.";

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
  /** Set by the fire-and-forget pull on first save. Refused unless
   *  RENTCAST_AUTOPULL_ON_SAVE=on, before any auth or database work. */
  autoPull: z.boolean().optional(),
});

export type PropertyCompsResult =
  | {
      ok: true;
      source: "cache" | "live";
      enrichment: PropertyEnrichment;
      /** ISO instant the comp set was pulled — so the UI can say "Comps from Oct 3". */
      fetchedAt: string | null;
    }
  | {
      ok: false;
      code: "CAP_REACHED";
      message: string;
      /** "Nov 21" — the day live comps are back. */
      resumesOn: string;
      /** ISO instant live comps are back. */
      resumesAt: string;
    }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "ENTITLEMENT_REQUIRED"
        | "NOT_CONFIGURED"
        | "NOT_FOUND"
        | "AUTOPULL_OFF"
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

  // The auto-pull on save is off by default — refused before any work.
  if (parsed.data.autoPull && !isAutoPullOnSaveEnabled()) {
    return { ok: false, code: "AUTOPULL_OFF", message: "Comps are pulled when you ask for them." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };
  }

  // Pro = up to the per-user cap, within the shared pool. Free users get ONE
  // live lookup as a taste, then are gated. Cached views never burn the
  // freebie (handled at the live-fetch commit point below).
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
      return { ok: false, code: "ENTITLEMENT_REQUIRED", message: FREEBIE_USED_MESSAGE };
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
  // fallback for the paused-pool / fetch-failure paths below.
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
  const cachedFetchedAt = cached
    ? ((cached as { fetched_at: string | null }).fetched_at ?? cachedPayload?.fetchedAt ?? null)
    : null;
  const serveCached = async (): Promise<PropertyCompsResult> => {
    await persistToDeal(cachedPayload!);
    return { ok: true, source: "cache", enrichment: cachedPayload!, fetchedAt: cachedFetchedAt };
  };
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
      return serveCached();
    }
  }

  // Shared pool, read early (one SELECT, no reservation). When it is empty,
  // serve whatever we have for this address regardless of age, and never
  // claim a free user's one lookup or a Pro user's per-period unit for a
  // request that can't go out. The AUTHORITATIVE reservation still happens
  // inside fetchRentCastEnrichment, immediately before the requests.
  const budget = await getRentCastBudgetStatus();
  if (!budget.available) {
    if (cachedPayload) return serveCached();
    if (budget.reason === "unavailable") {
      return { ok: false, code: "SERVER_ERROR", message: PROVIDER_UNAVAILABLE_MESSAGE };
    }
    return {
      ok: false,
      code: "CAP_REACHED",
      message: PAUSED_BODY,
      resumesOn: budget.resumesOn ?? formatResumesOn(budget.resumesAt ?? new Date()),
      resumesAt: budget.resumesAt ?? new Date().toISOString(),
    };
  }

  // Per-Pro-user cap, keyed to the same billing period as the shared pool
  // (free users are bounded by the one-lifetime gate above).
  // ATOMIC RESERVE, not read-then-act: concurrent calls can't all read the
  // same pre-increment value and sail past the cap together, and a lookup
  // that MISSES still charges the caller for the attempt. The one refund is
  // when NO request was sent (the pool refused at the reservation).
  const period = currentRentCastPeriod();
  const userPeriodKey = `comps_user_${user.id}_${period.anchorIso}`;
  let reservedUserUnit = false;
  if (isPaid && PER_USER_MONTHLY_CAP > 0) {
    const { data: userReserved, error: userReserveErr } = await admin.rpc(
      "increment_app_counter_if_under",
      { counter_key: userPeriodKey, max_value: PER_USER_MONTHLY_CAP, amount: 1 }
    );
    if (userReserveErr) {
      // Fail closed: no counter, no spend.
      if (cachedPayload) return serveCached();
      return { ok: false, code: "SERVER_ERROR", message: PROVIDER_UNAVAILABLE_MESSAGE };
    }
    if (userReserved == null) {
      if (cachedPayload) return serveCached();
      return {
        ok: false,
        code: "CAP_REACHED",
        message: PER_USER_PAUSED_BODY,
        resumesOn: formatResumesOn(period.nextAnchor),
        resumesAt: period.nextAnchor.toISOString(),
      };
    }
    reservedUserUnit = true;
  }
  const releaseUserUnit = async () => {
    if (!reservedUserUnit) return;
    reservedUserUnit = false;
    await admin
      .rpc("decrement_app_counter", { counter_key: userPeriodKey, amount: 1 })
      .then(() => undefined, () => undefined);
  };

  // Committing to a live lookup (cache miss, pool open). For a free user this
  // spends their one freebie. Claim it ATOMICALLY — a conditional update that
  // only succeeds while it's still unused — so two concurrent requests can't
  // both clear the earlier read-gate and spend two live RentCast calls on one
  // freebie (protects the request budget).
  let claimedFreebie = false;
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
      // Lost the freebie race. (No per-user unit to refund: `freeUser ===
      // !isPaid`, and only paid users reserve on the per-user counter.)
      return { ok: false, code: "ENTITLEMENT_REQUIRED", message: FREEBIE_USED_MESSAGE };
    }
    claimedFreebie = true;
  }
  // The pool refused AFTER the freebie was claimed (a race): no request was
  // sent, so the freebie goes straight back — unconditionally, unlike the
  // bounded miss refund below.
  const returnFreebieUnspent = async () => {
    if (!claimedFreebie) return;
    claimedFreebie = false;
    await admin
      .from("profiles")
      .update({ comps_free_used: false })
      .eq("id", user.id)
      .then(() => undefined, () => undefined);
  };

  // Give the freebie back when the live lookup yields nothing billable (an
  // un-indexed address or a provider outage). RentCast doesn't charge for a
  // null result, so a free user shouldn't lose their one shot on empty data.
  //
  // The shared REQUEST budget is deliberately NOT refunded here: the request
  // left the building either way, and it consumed provider rate whether or
  // not RentCast billed it. Refunding it made the cap self-defeating: a loop
  // of junk addresses issued unbounded RentCast calls while the counter never
  // advanced. Only a reservation that never produced a request is released
  // (the pool refusing at reservation time — handled by the budget module).
  //
  // The freebie refund is itself bounded: each miss burns one unit of a small
  // per-user per-period allowance, so the refund can't be used as an unlimited
  // free-lookup generator.
  const refundUnbilledLookup = async () => {
    if (!freeUser) return;
    // Bounded: only refund while the caller is under their miss allowance.
    // `increment_app_counter_if_under` returns null once the cap is reached
    // (atomic). An RPC error keeps the freebie spent — fail closed.
    const { data: missAllowed, error: missErr } = await admin.rpc("increment_app_counter_if_under", {
      counter_key: `comps_miss_${user.id}_${period.anchorIso}`,
      max_value: MISS_REFUND_CAP,
      amount: 1,
    });
    if (missErr || missAllowed == null) return; // allowance exhausted — freebie stays spent
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
  const lookupFailed = async (failure_class: "provider_error" | "no_result") => {
    await captureServerEvent({
      distinctId: "$server",
      event: "data_lookup_failed",
      properties: { provider: "rentcast", lookup_type: "property_comps", failure_class },
    });
  };

  let result: Awaited<ReturnType<typeof fetchRentCastEnrichment>>;
  try {
    result = await fetchRentCastEnrichment(
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
    result = { status: "error" };
  }

  if (result.status === "capped") {
    // Nothing was sent: hand back the per-user unit and the freebie.
    await releaseUserUnit();
    await returnFreebieUnspent();
    if (cachedPayload) return serveCached();
    if (result.reason === "unavailable") {
      return { ok: false, code: "SERVER_ERROR", message: PROVIDER_UNAVAILABLE_MESSAGE };
    }
    return {
      ok: false,
      code: "CAP_REACHED",
      message: PAUSED_BODY,
      resumesOn: formatResumesOn(result.resumesAt),
      resumesAt: result.resumesAt,
    };
  }

  if (result.status === "not_configured") {
    await releaseUserUnit();
    await returnFreebieUnspent();
    return { ok: false, code: "NOT_CONFIGURED", message: "Comps aren't enabled yet." };
  }

  if (result.status === "error") {
    await lookupFailed("provider_error");
    if (cachedPayload) return serveCached();
    await refundUnbilledLookup();
    return { ok: false, code: "SERVER_ERROR", message: PROVIDER_UNAVAILABLE_MESSAGE };
  }

  if (result.status === "not_found") {
    await lookupFailed("no_result");
    if (cachedPayload) return serveCached();
    await refundUnbilledLookup();
    return { ok: false, code: "NOT_FOUND", message: "No comps found for this address." };
  }

  const enrichment = result.enrichment;

  // Upsert cache (best-effort — never fail the request on a cache write).
  await admin
    .from("property_enrichment_cache")
    .upsert(
      { address_key: key, payload: enrichment as unknown as Record<string, unknown>, fetched_at: enrichment.fetchedAt },
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

  return { ok: true, source: "live", enrichment, fetchedAt: enrichment.fetchedAt };
}

export type CompsAvailabilityResult =
  | {
      ok: true;
      /** False when RENTCAST_API_KEY is unset — the surface hides itself. */
      configured: boolean;
      /** False while the shared request pool is paused. */
      available: boolean;
      /** "Nov 21" — when live comps are back. Null while available or unknown. */
      resumesOn: string | null;
      resumesAt: string | null;
    }
  | { ok: false; code: "SIGN_IN_REQUIRED" | "SERVER_ERROR" };

/**
 * Read-only: is a live comps lookup possible right now? Signed-in users only;
 * one database read; no reservation, no spend. Called once when the Autofill
 * button or the comps card mounts so the paused state shows BEFORE a click.
 */
export async function getCompsAvailabilityAction(): Promise<CompsAvailabilityResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "SIGN_IN_REQUIRED" };

  if (!process.env.RENTCAST_API_KEY) {
    return { ok: true, configured: false, available: false, resumesOn: null, resumesAt: null };
  }

  try {
    const budget = await getRentCastBudgetStatus();
    if (budget.available) {
      return { ok: true, configured: true, available: true, resumesOn: null, resumesAt: null };
    }
    // An unreadable counter pauses spending but has no honest "back on" date.
    const known = budget.reason === "cap";
    return {
      ok: true,
      configured: true,
      available: false,
      resumesOn: known ? budget.resumesOn : null,
      resumesAt: known ? budget.resumesAt : null,
    };
  } catch {
    return { ok: false, code: "SERVER_ERROR" };
  }
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
