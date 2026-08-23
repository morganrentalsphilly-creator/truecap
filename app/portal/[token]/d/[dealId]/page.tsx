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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { params: Promise<{ token: string; dealId: string }> };

export const metadata: Metadata = {
  title: "Shared deal",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default async function PortalDealPage({ params }: Props) {
  const { token, dealId } = await params;
  const decoded = readSignedToken(PORTAL_SCOPE, token);
  if (!decoded?.a || !decoded?.c || !UUID_RE.test(dealId)) notFound();

  const agentUserId = decoded.a;
  const clientId = decoded.c;
  if (!UUID_RE.test(agentUserId) || !UUID_RE.test(clientId)) notFound();

  let values, result;
  let showProAnalysis = false;
  try {
    const admin = createAdminSupabaseClient();

    // Same live entitlement re-check as the parent portal page.
    const entitlements = await getEntitlementsForUser(admin, agentUserId);
    if (!hasPlanFeature(entitlements, "agent_portal")) notFound();
    showProAnalysis = hasPlanFeature(entitlements, "max_offer");

    const { data: deal } = await admin
      .from("saved_analyses")
      .select("id, form_snapshot")
      .eq("id", dealId)
      .eq("user_id", agentUserId)
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!deal) notFound();

    values = normalizeInvestmentFormSnapshot(deal.form_snapshot);
    if (!values) notFound();
    result = calculateAnalysis(values);
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
      leadCapture={
        agent ? { ownerId: agentUserId, dealId, valuesHash, sig: sig ?? undefined } : undefined
      }
    />
  );
}
