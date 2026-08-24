/**
 * GET /portal/[token]/d/[dealId] — one deal from a client portal, full
 * read-only analysis, co-branded to the agent.
 *
 * Replaces the portal's old deep links to /d/[encoded] (which put the entire
 * analysis in the URL). Authorization chain, all server-side:
 *   1. the portal token's HMAC must verify (same PORTAL_SCOPE as the parent);
 *   2. the agent must still hold the agent_portal entitlement;
 *   3. the deal must belong to that agent AND be assigned to that client.
 * Any failure → the same 404. The buyer's URL carries only the token and a
 * deal id — no address, no numbers.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getEntitlementsForUser, hasPlanFeature } from "@/lib/entitlements";
import { readSignedToken } from "@/lib/signed-token";
import { PORTAL_SCOPE } from "@/lib/client-portal";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { normalizeInvestmentFormSnapshot } from "@/lib/investcalc-schema";
import { getPublicAgentBranding } from "@/lib/agent-share";
import { getPublicDealComps } from "@/lib/public-deal-comps";
import { hashShareValues, signShareAttribution } from "@/lib/share-attribution";
import { SharedDealShell } from "@/components/investcalc/shared-deal-shell";
import {
  normalizeMaoTarget,
  normalizeMaoTargetForFinancing,
} from "@/lib/mao-target-editor";
import { isFeatureReleased } from "@/lib/entitlements-catalog";
import {
  normalizeOfferCeilingTargetSource,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import { resolveOfferCeilingForAccess } from "@/lib/offer-ceiling-server";
import {
  recomputeSavedDealVerdict,
  toRecomputedSavedAnalysisSnapshot,
} from "@/lib/recompute-saved-deal-verdict";
import { resolveSavedAnalysisSnapshot } from "@/lib/saved-analysis-methodology";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { params: Promise<{ token: string; dealId: string }> };

export const metadata: Metadata = {
  title: "Shared deal",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default async function PortalDealPage({ params }: Props) {
  // The parent portal and every minting action fail closed behind this catalog
  // switch. Enforce it again on the deep route so an old/bookmarked bearer URL
  // cannot bypass a product-wide portal kill switch.
  if (!isFeatureReleased("agent_portal")) notFound();
  const { token, dealId } = await params;
  const decoded = readSignedToken(PORTAL_SCOPE, token);
  if (!decoded?.a || !decoded?.c || !UUID_RE.test(dealId)) notFound();

  const agentUserId = decoded.a;
  const clientId = decoded.c;
  if (!UUID_RE.test(agentUserId) || !UUID_RE.test(clientId)) notFound();

  let values, result, maoTarget, offerCeilingAccess;
  let maoTargetSource: OfferCeilingTargetSource = "selected-targets";
  let showProAnalysis = false;
  try {
    const admin = createAdminSupabaseClient();

    // Same live entitlement re-check as the parent portal page.
    const [entitlements, { data: client }] = await Promise.all([
      getEntitlementsForUser(admin, agentUserId),
      admin
        .from("agent_clients")
        .select("id, is_archived")
        .eq("id", clientId)
        .eq("agent_user_id", agentUserId)
        .maybeSingle(),
    ]);
    if (!hasPlanFeature(entitlements, "agent_portal")) notFound();
    // The signed token names a client, but archiving/revoking that client must
    // invalidate bookmarked deep links just as it invalidates the parent
    // portal. Assignment alone is not sufficient authorization.
    if (!client || client.is_archived) notFound();
    // Reaching this point already proves the owner has the Agent Pro portal
    // entitlement. Offer Ceiling is a paid-status feature, not a separately named
    // `max_offer` plan flag (that key does not exist in the catalog), so a
    // second flag check incorrectly hid the saved target from every portal.
    showProAnalysis = true;

    const { data: deal } = await admin
      .from("saved_analyses")
      .select("id, form_snapshot, result_snapshot, methodology_version")
      .eq("id", dealId)
      .eq("user_id", agentUserId)
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!deal) notFound();

    values = normalizeInvestmentFormSnapshot(deal.form_snapshot);
    if (!values) notFound();
    const recomputedVerdict = recomputeSavedDealVerdict(deal.form_snapshot);
    const methodologyResolution = resolveSavedAnalysisSnapshot({
      methodologyVersion: deal.methodology_version,
      resultSnapshot: deal.result_snapshot as Record<string, unknown> | null,
      recomputedSnapshot: recomputedVerdict
        ? toRecomputedSavedAnalysisSnapshot(recomputedVerdict)
        : undefined,
    });
    // Parent portal cards deliberately do not link frozen analyses. Enforce
    // the same rule here so an old bookmark cannot pair historical metrics
    // with today's calculation engine.
    if (methodologyResolution.shouldFreeze) notFound();
    result = calculateAnalysis(values);
    const savedResultSnapshot = deal.result_snapshot as Record<string, unknown> | null;
    const savedMaoTarget = normalizeMaoTarget(savedResultSnapshot?.maxOfferTarget);
    maoTarget = normalizeMaoTargetForFinancing(savedMaoTarget, {
      isCashPurchase: result.monthlyPayment <= 0,
    }) ?? undefined;
    maoTargetSource =
      normalizeOfferCeilingTargetSource(savedResultSnapshot?.maxOfferTargetSource) ??
      "selected-targets";
    offerCeilingAccess = maoTarget
      ? resolveOfferCeilingForAccess({
          values,
          target: maoTarget,
          source: maoTargetSource,
          paidAccess: true,
        })
      : null;
  } catch (err) {
    // notFound() throws a Next control-flow error — let it through.
    if (err && typeof err === "object" && "digest" in err) throw err;
    notFound();
  }

  const [agent, comps] = await Promise.all([
    getPublicAgentBranding(agentUserId),
    getPublicDealComps(dealId, agentUserId),
  ]);

  const valuesHash = hashShareValues(values);
  const sig = signShareAttribution({ ownerId: agentUserId, dealId, valuesHash });

  return (
    <SharedDealShell
      values={values}
      result={result}
      comps={comps}
      agent={agent}
      showProAnalysis={showProAnalysis}
      maoTarget={maoTarget}
      maoTargetSource={maoTargetSource}
      offerCeilingAccess={offerCeilingAccess}
      leadCapture={
        agent ? { ownerId: agentUserId, dealId, valuesHash, sig: sig ?? undefined } : undefined
      }
    />
  );
}
