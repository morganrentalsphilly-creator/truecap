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
 *   - every deal ASSIGNED to that client (and not deleted) is listed — see the
 *     query below for why archived deals are deliberately included — using
 *     current server-recomputed results. Owner-writable saved result JSON is
 *     never treated as TrueCap authority on this public surface.
 *
 * Returns null for any failure — bad token, missing entitlement, unknown
 * client, DB error — so the route renders a single generic 404. Never throws.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getEntitlementsForUser, hasPlanFeature } from "@/lib/entitlements";
import {
  getPublicAgentBranding,
  type PublicAgentBranding,
} from "@/lib/agent-share";
import {
  buyBoxHasCriteria,
  rowToNamedBuyBox,
  summarizeBuyBoxCriteria,
  deriveStateFromAddress,
  evaluateBuyBoxes,
  summarizeBuyBoxFit,
  type BuyBoxDealMetrics,
  type BuyBoxesRow,
  type NamedBuyBox,
} from "@/lib/buy-box";
import { recomputeSavedDealVerdict } from "@/lib/recompute-saved-deal-verdict";
import {
  isLegacySavedMethodologyVersion,
  shouldFreezeSavedMethodology,
} from "@/lib/saved-analysis-methodology";
import { TRUECAP_UNDERWRITING_STANDARD_VERSION } from "@/lib/underwriting-methodology";
import {
  isReleasedUnderwritingSnapshot,
  normalizeReleasedInvestmentFormSnapshot,
} from "@/lib/underwriting-model-release";
import type { DealRecommendation, DealRiskLevel } from "@/lib/deal-score";
import { isFeatureReleased } from "@/lib/entitlements-catalog";
import { calculateMaoIrr } from "@/lib/mao-target-evaluation";

export const PORTAL_SCOPE = "client-portal.v1";

/** Max deals rendered on one portal page. The roster count uses the SAME cap
 *  so "N deals assigned" can never exceed what the buyer actually sees. */
export const PORTAL_DEAL_LIMIT = 50;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PortalDeal = {
  id: string;
  address: string;
  /** Does this deal meet the buyer's own criteria? null when they have no buy
   *  box set — the portal then simply omits fit rather than implying a pass. */
  meetsCriteria: boolean | null;
  /** The one number-carrying reason when it misses ("Cap rate: 5.2% vs ≥ 6%"). */
  gapLine: string | null;
  recommendation: DealRecommendation;
  riskLevel: DealRiskLevel;
  score: number;
  netCashFlowMonthly: number;
  capRatePct: number;
  cocReturnPct: number;
  /** Signed /d/ path (co-branded to the agent) for the full analysis, or null
   *  when the snapshot can't be encoded. */
  sharePath: string | null;
  methodologyLabel: string;
};

export type ClientPortalData = {
  clientName: string;
  branding: PublicAgentBranding | null;
  deals: PortalDeal[];
  /** The buyer's own criteria, in words. Null when the agent hasn't set a box
   *  for them — "screened to your criteria" must not appear without them. */
  criteriaSummary: string | null;
  /** How many of the listed deals meet those criteria. */
  meetingCount: number;
};

type DealRow = {
  id: string;
  form_snapshot: unknown;
  methodology_version: string | null;
  address: string | null;
};

export async function loadClientPortal(input: {
  agentUserId: string;
  clientId: string;
  /** The raw (already-verified) portal token, used only to build nested
   *  deal-view links under /portal/[token]/d/[dealId]. */
  portalToken: string;
}): Promise<ClientPortalData | null> {
  if (!isFeatureReleased("agent_portal")) return null;
  const { agentUserId, clientId, portalToken } = input;
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

    // ASSIGNMENT IS THE SINGLE SOURCE OF TRUTH for what a buyer sees.
    //
    // Deliberately NOT filtered on is_archived. That flag is the agent's own
    // pipeline bookkeeping, and it gets set by things the agent never chose:
    // archive_stale_saved_analyses() flips it on any deal untouched for 60
    // days. Filtering on it meant a buyer's bookmarked portal could silently
    // empty itself two months after it was sent — and that assigning an
    // already-archived deal did nothing while the UI said it worked.
    // An agent removes a deal from a portal by unassigning it; that is the one
    // lever, and it is the one the UI offers.
    const { data: rows } = await admin
      .from("saved_analyses")
      .select("id, form_snapshot, methodology_version, address")
      .eq("user_id", agentUserId)
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(PORTAL_DEAL_LIMIT);

    const branding = await getPublicAgentBranding(agentUserId);

    // The buyer's OWN criteria — the boxes this agent scoped to this client.
    // This is what makes "deals screened to your criteria" true rather than a
    // slogan: the buyer sees the bar and whether each deal clears it.
    let clientBoxes: NamedBuyBox[] = [];
    try {
      const { data: boxRows } = await admin
        .from("user_buy_boxes")
        .select("*")
        .eq("user_id", agentUserId)
        .eq("client_id", clientId)
        .eq("is_active", true);
      clientBoxes = ((boxRows ?? []) as unknown[])
        .map((r) => rowToNamedBuyBox(r as BuyBoxesRow))
        .filter((b): b is NamedBuyBox => b != null && buyBoxHasCriteria(b));
    } catch {
      clientBoxes = []; // fit is an enhancement; never fail the portal for it
    }
    // Grade against ONE box so the stated criteria and the verdict describe the
    // same bar. Showing box A's criteria while a deal could pass on box B made
    // "Meets your criteria" unexplainable to the buyer. Default box first, then
    // priority order — the same box the agent sees as primary.
    const primaryBox =
      clientBoxes.find((b) => b.isDefault) ??
      [...clientBoxes].sort((a, b) => a.sortOrder - b.sortOrder)[0] ??
      null;
    if (primaryBox) clientBoxes = [primaryBox];
    const criteriaSummary = primaryBox
      ? summarizeBuyBoxCriteria(primaryBox)
      : null;

    const deals: PortalDeal[] = [];
    for (const row of (rows ?? []) as DealRow[]) {
      // Internal/crafted v2 rows are never a public-portal surface. Check the
      // raw marker before either a recorded-result fallback or a tolerant
      // legacy normalizer can make the row look renderable.
      if (!isReleasedUnderwritingSnapshot(row.form_snapshot)) continue;
      const recomputed = recomputeSavedDealVerdict(row.form_snapshot);
      if (!recomputed) continue;
      // A future/older pinned formula cannot be safely republished by this
      // deployment. The agent must explicitly rerun it first. Current and
      // unversioned legacy inputs are recalculated atomically below.
      if (
        shouldFreezeSavedMethodology(
          row.methodology_version,
          recomputed.analysisResult.methodologyVersion,
        )
      ) {
        continue;
      }
      const {
        score,
        recommendation,
        riskLevel,
        netCashFlowMonthly,
        capRatePct,
        cocReturnPct,
        dscr,
      } = recomputed;
      const values = normalizeReleasedInvestmentFormSnapshot(row.form_snapshot);
      // Nested portal route — NO deal data in the URL (no public URL may carry
      // encoded analysis payloads). The nested page re-verifies the portal
      // token and the deal's ownership server-side, then uses this same exact
      // recorded result. Future-version rows remain intentionally unlinked:
      // this deployment may not know how to render their complete contract.
      const sharePath: string | null = values
        ? `/portal/${portalToken}/d/${row.id}`
        : null;
      // Evaluate against the buyer's own criteria (never the agent's other
      // clients' — computeDealOfferLine scopes by client internally).
      let meetsCriteria: boolean | null = null;
      let gapLine: string | null = null;
      if (clientBoxes.length > 0 && values) {
        try {
          const irr = calculateMaoIrr(values, recomputed.analysisResult);
          const metrics: BuyBoxDealMetrics = {
            capRatePct,
            cocPct: cocReturnPct,
            dscr,
            cashFlowMonthly: netCashFlowMonthly,
            purchasePrice: values.purchasePrice,
            propertyType: values.propertyType,
            state: deriveStateFromAddress(values.address),
            isCashPurchase: recomputed.isCashPurchase,
            cashRequired: recomputed.cashToClose,
            irrPct: irr.primaryIrrPct,
            irrStatus: irr.status,
          };
          const evaluated = evaluateBuyBoxes(clientBoxes, metrics).filter(
            (entry) => entry.result.active,
          );
          if (evaluated.length > 0) {
            const fit = summarizeBuyBoxFit(evaluated);
            meetsCriteria = fit.anyPass;
            gapLine = fit.anyPass
              ? null
              : (evaluated[0]?.result.personalLine ?? null);
          }
        } catch {
          /* fit stays null — the card still renders its numbers */
        }
      }

      deals.push({
        id: row.id,
        address: (values?.address || row.address || "Saved deal").toString(),
        meetsCriteria,
        gapLine,
        recommendation,
        riskLevel,
        score,
        netCashFlowMonthly,
        capRatePct,
        cocReturnPct,
        sharePath,
        methodologyLabel: isLegacySavedMethodologyVersion(
          row.methodology_version,
        )
          ? `Legacy analysis · recomputed with current v${TRUECAP_UNDERWRITING_STANDARD_VERSION}`
          : `Standard v${recomputed.analysisResult.methodologyVersion}`,
      });
    }

    return {
      clientName: client.name,
      branding,
      deals,
      criteriaSummary,
      meetingCount: deals.filter((d) => d.meetsCriteria === true).length,
    };
  } catch {
    return null;
  }
}
