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

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Hard monthly cap on LIVE enrichments (each ≈ 2 RentCast API calls), to
// guard the 1,000-calls/mo plan limit even across many paid users. Tunable
// via env; default 300 enrichments (~900 calls), leaving headroom.
const MONTHLY_ENRICHMENT_CAP = Number.parseInt(process.env.RENTCAST_MONTHLY_ENRICHMENT_CAP ?? "300", 10);

const inputSchema = z.object({
  address: z.string().trim().min(5).max(300),
  propertyType: z.enum(["single-family", "multi-family", "owner-occupant"]).optional(),
  bedrooms: z.number().min(0).max(50).nullish(),
  bathrooms: z.number().min(0).max(50).nullish(),
  squareFootage: z.number().min(0).max(1_000_000).nullish(),
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
        message: "You've used your free comps lookup. Upgrade to Pro for unlimited sale + rent comps.",
      };
    }
  }

  if (!process.env.RENTCAST_API_KEY) {
    return { ok: false, code: "NOT_CONFIGURED", message: "Comps aren't enabled yet." };
  }

  const key = addressKey(parsed.data.address);
  const admin = createAdminSupabaseClient();

  // Cache-first. Read the row once; serve it if fresh, keep it as a stale
  // fallback for the cap / fetch-failure paths below.
  const { data: cached } = await admin
    .from("property_enrichment_cache")
    .select("payload, fetched_at")
    .eq("address_key", key)
    .maybeSingle();
  const cachedPayload = cached ? (cached as { payload: PropertyEnrichment }).payload : null;
  if (cached) {
    const fetchedAt = new Date((cached as { fetched_at: string }).fetched_at).getTime();
    if (Number.isFinite(fetchedAt) && Date.now() - fetchedAt < CACHE_TTL_MS) {
      return { ok: true, source: "cache", enrichment: cachedPayload! };
    }
  }

  // Monthly spend guard — a live call would consume API quota, so stop before
  // the plan limit. Counts live enrichments per calendar month (UTC).
  const monthKey = `rentcast_enrichments_${new Date().toISOString().slice(0, 7)}`;
  if (Number.isFinite(MONTHLY_ENRICHMENT_CAP) && MONTHLY_ENRICHMENT_CAP > 0) {
    const { data: counterRow } = await admin
      .from("app_counters")
      .select("count")
      .eq("key", monthKey)
      .maybeSingle();
    const used = Number((counterRow as { count?: number } | null)?.count ?? 0);
    if (used >= MONTHLY_ENRICHMENT_CAP) {
      // At the cap: serve a stale cached copy if we have one, else say so.
      if (cachedPayload) return { ok: true, source: "cache", enrichment: cachedPayload };
      return {
        ok: false,
        code: "CAP_REACHED",
        message: "Comps have reached this month's data limit. They'll reset at the start of next month.",
      };
    }
  }

  // Committing to a live lookup (cache miss, under cap). For a free user this
  // spends their one freebie — mark it now so it's consumed on the attempt and
  // can't be gamed by retrying after an error.
  if (freeUser) {
    await supabase
      .from("profiles")
      .update({ comps_free_used: true })
      .eq("id", user.id)
      .then(
        () => undefined,
        () => undefined
      );
  }

  // Live fetch.
  let enrichment: PropertyEnrichment | null = null;
  try {
    enrichment = await fetchRentCastEnrichment({
      address: parsed.data.address,
      propertyType: rentCastType(parsed.data.propertyType),
      bedrooms: parsed.data.bedrooms ?? null,
      bathrooms: parsed.data.bathrooms ?? null,
      squareFootage: parsed.data.squareFootage ?? null,
    });
  } catch {
    if (cachedPayload) return { ok: true, source: "cache", enrichment: cachedPayload };
    return { ok: false, code: "SERVER_ERROR", message: "Couldn't reach the data provider. Try again." };
  }

  if (!enrichment) {
    if (cachedPayload) return { ok: true, source: "cache", enrichment: cachedPayload };
    return { ok: false, code: "NOT_FOUND", message: "No comps found for this address." };
  }

  // Count this live enrichment against the monthly cap (atomic; best-effort).
  await admin.rpc("increment_app_counter", { counter_key: monthKey }).then(
    () => undefined,
    () => undefined
  );

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

  return { ok: true, source: "live", enrichment };
}
