import "server-only";

/**
 * Public-facing comps for a /d/[encoded] share page. When a saved deal is
 * shared, the link carries the deal id (meta.dealId) + the owner id
 * (meta.ownerId). This reads that deal's stored RentCast comp set so the
 * shared view can back the rent/value with real comparables — the same data
 * that already prints in the owner's PDF, which just died at the share boundary.
 *
 * Uses the service-role admin client because the share page is public (no
 * viewer session) and deal_comps RLS is owner-only. We ONLY return comps whose
 * row user_id matches the claimed owner, and comps are non-PII market data the
 * owner already chose to put on their exported report. Best-effort: any miss
 * (no deal id, no row, owner mismatch, migration pending) returns null and the
 * shared view simply omits the comps section.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enrichmentToReportComps, type ReportComps } from "@/lib/report-comps";
import type { PropertyEnrichment } from "@/lib/property-enrichment/rentcast";

export async function getPublicDealComps(
  dealId: string | undefined | null,
  ownerId: string | undefined | null,
): Promise<ReportComps | null> {
  if (!dealId || !ownerId) return null;
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
