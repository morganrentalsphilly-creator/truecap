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

  // Paid-only — each lookup consumes paid API quota.
  const isPaid = await hasPaidPlanSubscription(supabase, user.id);
  if (!isPaid) {
    return {
      ok: false,
      code: "ENTITLEMENT_REQUIRED",
      message: "Live comps are a Pro feature. Upgrade to pull sale + rent comps for this address.",
    };
  }

  if (!process.env.RENTCAST_API_KEY) {
    return { ok: false, code: "NOT_CONFIGURED", message: "Comps aren't enabled yet." };
  }

  const key = addressKey(parsed.data.address);
  const admin = createAdminSupabaseClient();

  // Cache-first.
  const { data: cached } = await admin
    .from("property_enrichment_cache")
    .select("payload, fetched_at")
    .eq("address_key", key)
    .maybeSingle();
  if (cached) {
    const fetchedAt = new Date((cached as { fetched_at: string }).fetched_at).getTime();
    if (Number.isFinite(fetchedAt) && Date.now() - fetchedAt < CACHE_TTL_MS) {
      return {
        ok: true,
        source: "cache",
        enrichment: (cached as { payload: PropertyEnrichment }).payload,
      };
    }
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
    return { ok: false, code: "SERVER_ERROR", message: "Couldn't reach the data provider. Try again." };
  }

  if (!enrichment) {
    return { ok: false, code: "NOT_FOUND", message: "No comps found for this address." };
  }

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
