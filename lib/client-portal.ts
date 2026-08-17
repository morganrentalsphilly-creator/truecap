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
 *     query below for why archived deals are deliberately included — each
 *     recomputed on read (never a stale stored snapshot) and given a signed
 *     /d/ share link so the buyer can open the full analysis.
 *
 * Returns null for any failure — bad token, missing entitlement, unknown
 * client, DB error — so the route renders a single generic 404. Never throws.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getEntitlementsForUser, hasPlanFeature } from "@/lib/entitlements";
import { getPublicAgentBranding, type PublicAgentBranding } from "@/lib/agent-share";
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
import {
  recomputeSavedDealVerdict,
  toRecomputedSavedAnalysisSnapshot,
} from "@/lib/recompute-saved-deal-verdict";
import {
  isLegacySavedMethodologyVersion,
  parseFrozenDealScore,
  resolveSavedAnalysisSnapshot,
} from "@/lib/saved-analysis-methodology";
import { TRUECAP_UNDERWRITING_STANDARD_VERSION } from "@/lib/underwriting-methodology";
import { normalizeInvestmentFormSnapshot } from "@/lib/investcalc-schema";
import type { DealRecommendation, DealRiskLevel } from "@/lib/deal-score";
import { isFeatureReleased } from "@/lib/entitlements-catalog";

export const PORTAL_SCOPE = "client-portal.v1";

/** Max deals rendered on one portal page. The roster count uses the SAME cap
 *  so "N deals assigned" can never exceed what the buyer actually sees. */
export const PORTAL_DEAL_LIMIT = 50;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  result_snapshot: Record<string, unknown> | null;
  methodology_version: string | null;
  address: string | null;
};

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

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
      .select("id, form_snapshot, result_snapshot, methodology_version, address")
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
    const criteriaSummary = primaryBox ? summarizeBuyBoxCriteria(primaryBox) : null;

    const deals: PortalDeal[] = [];
    for (const row of (rows ?? []) as DealRow[]) {
      const recomputed = recomputeSavedDealVerdict(row.form_snapshot);
      const resolution = resolveSavedAnalysisSnapshot({
        methodologyVersion: row.methodology_version,
        resultSnapshot: row.result_snapshot,
        recomputedSnapshot: recomputed
          ? toRecomputedSavedAnalysisSnapshot(recomputed)
          : undefined,
      });
      const snapshot = resolution.snapshot;
      const currentVerdict = resolution.didRecompute ? recomputed : null;
      const frozenScore = resolution.shouldFreeze
        ? parseFrozenDealScore(snapshot)
        : null;
      const score = currentVerdict?.score ?? frozenScore?.score ?? finiteNumber(snapshot.score);
      const recommendation =
        currentVerdict?.recommendation ?? frozenScore?.recommendation;
      const riskLevel = currentVerdict?.riskLevel ?? frozenScore?.riskLevel;
      const netCashFlowMonthly =
        currentVerdict?.netCashFlowMonthly ?? finiteNumber(snapshot.netCashFlow);
      const capRatePct = currentVerdict?.capRatePct ?? finiteNumber(snapshot.capRate);
      const cocReturnPct = currentVerdict?.cocReturnPct ?? finiteNumber(snapshot.cocReturn);
      const dscr = currentVerdict?.dscr ?? finiteNumber(snapshot.dscr);
      const monthlyPayment =
        currentVerdict?.monthlyPayment ?? finiteNumber(snapshot.monthlyPayment);
      if (
        score == null ||
        !recommendation ||
        !riskLevel ||
        netCashFlowMonthly == null ||
        capRatePct == null ||
        cocReturnPct == null
      ) {
        continue; // incomplete stored output — skip, never mix in current math
      }
      const values = normalizeInvestmentFormSnapshot(row.form_snapshot);
      // Nested portal route — NO deal data in the URL (no public URL may carry
      // encoded analysis payloads). The nested page re-verifies the portal
      // token and the deal's ownership server-side, then recomputes with
      // TODAY'S engine — so a FROZEN card (methodology-pinned) must not link
      // to it: the buyer would open a page contradicting the card they were
      // sent. Same suppression origin applied to the legacy encoded link.
      const sharePath: string | null =
        values && !resolution.shouldFreeze ? `/portal/${portalToken}/d/${row.id}` : null;
      // Evaluate against the buyer's own criteria (never the agent's other
      // clients' — computeDealOfferLine scopes by client internally).
      let meetsCriteria: boolean | null = null;
      let gapLine: string | null = null;
      if (clientBoxes.length > 0 && values) {
        try {
          const metrics: BuyBoxDealMetrics = {
            capRatePct,
            cocPct: cocReturnPct,
            dscr,
            cashFlowMonthly: netCashFlowMonthly,
            purchasePrice: values.purchasePrice,
            propertyType: values.propertyType,
            state: deriveStateFromAddress(values.address),
            isCashPurchase:
              currentVerdict?.isCashPurchase ??
              (monthlyPayment != null && monthlyPayment <= 0),
          };
          const evaluated = evaluateBuyBoxes(clientBoxes, metrics).filter(
            (entry) => entry.result.active
          );
          if (evaluated.length > 0) {
            const fit = summarizeBuyBoxFit(evaluated);
            meetsCriteria = fit.anyPass;
            gapLine = fit.anyPass ? null : evaluated[0]?.result.personalLine ?? null;
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
        methodologyLabel: resolution.shouldFreeze
          ? `Frozen Standard v${resolution.storedMethodologyVersion}`
          : isLegacySavedMethodologyVersion(resolution.storedMethodologyVersion)
            ? resolution.didRecompute
              ? `Legacy analysis · recomputed with current v${TRUECAP_UNDERWRITING_STANDARD_VERSION}`
              : `Legacy analysis · stored snapshot (current v${TRUECAP_UNDERWRITING_STANDARD_VERSION} recompute unavailable)`
            : `Standard v${resolution.storedMethodologyVersion}`,
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
