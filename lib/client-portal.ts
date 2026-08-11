import "server-only";

/**
 * The client portal — a public, co-branded page an Agent Pro user hands to one
 * buyer: "here are the deals I've screened for you, with my verdict on each."
 *
 * PORTAL_SCOPE-signed token carries {agentUserId, clientId}. This module reads
 * that (already-verified) pair and assembles the page's data via the
 * service-role admin client, because the page is public (no viewer session).
 * Every guard the public surface needs lives here:
 *   - the agent must STILL hold the agent_portal entitlement (re-checked at
 *     view time, like getPublicAgentBranding — a downgraded agent's links go
 *     dark rather than serving a paid surface for free);
 *   - the client must still belong to that agent;
 *   - only that client's non-archived, non-deleted deals are listed, each
 *     recomputed on read (never a stale stored snapshot) and given a signed
 *     /d/ share link so the buyer can open the full analysis.
 *
 * Returns null for any failure — bad token, missing entitlement, unknown
 * client, DB error — so the route renders a single generic 404. Never throws.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getEntitlementsForUser, hasPlanFeature } from "@/lib/entitlements";
import { getPublicAgentBranding, type PublicAgentBranding } from "@/lib/agent-share";
import { recomputeSavedDealVerdict } from "@/lib/recompute-saved-deal-verdict";
import { normalizeInvestmentFormSnapshot } from "@/lib/investcalc-schema";
import { encodeShareLink } from "@/lib/share-link";
import { signShareAttribution, hashShareValues } from "@/lib/share-attribution";
import type { DealRecommendation, DealRiskLevel } from "@/lib/deal-score";

export const PORTAL_SCOPE = "client-portal.v1";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PortalDeal = {
  id: string;
  address: string;
  recommendation: DealRecommendation;
  riskLevel: DealRiskLevel;
  score: number;
  netCashFlowMonthly: number;
  capRatePct: number;
  cocReturnPct: number;
  /** Signed /d/ path (co-branded to the agent) for the full analysis, or null
   *  when the snapshot can't be encoded. */
  sharePath: string | null;
};

export type ClientPortalData = {
  clientName: string;
  branding: PublicAgentBranding | null;
  deals: PortalDeal[];
};

type DealRow = {
  id: string;
  form_snapshot: unknown;
  address: string | null;
};

export async function loadClientPortal(input: {
  agentUserId: string;
  clientId: string;
}): Promise<ClientPortalData | null> {
  const { agentUserId, clientId } = input;
  // Both ids are URL-controlled (via the token payload). Reject anything not a
  // UUID before any admin round-trip.
  if (!UUID_RE.test(agentUserId) || !UUID_RE.test(clientId)) return null;

  try {
    const admin = createAdminSupabaseClient();

    // The portal is an Agent Pro surface — re-check the entitlement live so a
    // canceled/downgraded agent's link stops serving it.
    const entitlements = await getEntitlementsForUser(admin, agentUserId);
    if (!hasPlanFeature(entitlements, "agent_portal")) return null;

    // The client must still belong to this agent (and not be archived).
    const { data: client } = await admin
      .from("agent_clients")
      .select("name, is_archived")
      .eq("id", clientId)
      .eq("agent_user_id", agentUserId)
      .maybeSingle();
    if (!client || client.is_archived) return null;

    const { data: rows } = await admin
      .from("saved_analyses")
      .select("id, form_snapshot, address")
      .eq("user_id", agentUserId)
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(50);

    const branding = await getPublicAgentBranding(agentUserId);

    const deals: PortalDeal[] = [];
    for (const row of (rows ?? []) as DealRow[]) {
      const verdict = recomputeSavedDealVerdict(row.form_snapshot);
      if (!verdict) continue; // legacy/unparseable snapshot — skip, don't crash
      const values = normalizeInvestmentFormSnapshot(row.form_snapshot);
      let sharePath: string | null = null;
      if (values) {
        try {
          const valuesHash = hashShareValues(values);
          const sig = signShareAttribution({ ownerId: agentUserId, dealId: row.id, valuesHash });
          const encoded = encodeShareLink({
            v: 1,
            values,
            meta: {
              sharedAt: new Date().toISOString(),
              title: values.address || row.address || "Shared deal",
              ownerId: agentUserId,
              dealId: row.id,
              ...(sig ? { sig } : {}),
            },
          });
          sharePath = `/d/${encoded}`;
        } catch {
          sharePath = null; // a card without a deep link is still useful
        }
      }
      deals.push({
        id: row.id,
        address: (values?.address || row.address || "Saved deal").toString(),
        recommendation: verdict.recommendation,
        riskLevel: verdict.riskLevel,
        score: verdict.score,
        netCashFlowMonthly: verdict.netCashFlowMonthly,
        capRatePct: verdict.capRatePct,
        cocReturnPct: verdict.cocReturnPct,
        sharePath,
      });
    }

    return { clientName: client.name, branding, deals };
  } catch {
    return null;
  }
}
