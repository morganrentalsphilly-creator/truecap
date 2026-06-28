import "server-only";

/**
 * Public-facing comps for a /d/[encoded] share page. When a saved deal is
 * shared, the link carries the deal id (meta.dealId) + the owner id
 * (meta.ownerId). This reads that deal's stored RentCast comp set so the
 * shared view can back the rent/value with real comparables — the same data
 * that already prints in the owner's PDF, which just died at the share boundary.
 *
 * Uses the service-role admin client because the share page is public (no
 * viewer session) and deal_comps RLS is owner-only. The `user_id === ownerId`
 * check is a CONSISTENCY guard (comps belong to the link's stated owner), NOT
 * an authorization boundary: both ids come from the URL, so this adds no trust
 * boundary beyond the share link itself — which already encodes the full deal.
 * That's acceptable because comps are non-PII market data the owner already put
 * on their exported report. Best-effort: any miss (bad/absent id, no row, owner
 * mismatch, migration pending) returns null and the section is simply omitted.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enrichmentToReportComps, type ReportComps } from "@/lib/report-comps";
import type { PropertyEnrichment } from "@/lib/property-enrichment/rentcast";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getPublicDealComps(
  dealId: string | undefined | null,
  ownerId: string | undefined | null,
): Promise<ReportComps | null> {
  // Both are uuid columns — reject malformed ids before any DB round-trip.
  if (!dealId || !ownerId || !UUID_RE.test(dealId) || !UUID_RE.test(ownerId)) return null;
  try {
    const admin = createAdminSupabaseClient();
    const { data } = await admin
      .from("deal_comps")
      .select("user_id, payload")
      .eq("analysis_id", dealId)
      .maybeSingle();
    // Only show comps that genuinely belong to the link's claimed owner.
    if (!data || data.user_id !== ownerId) return null;
    return enrichmentToReportComps(data.payload as PropertyEnrichment | null);
  } catch {
    return null;
  }
}
