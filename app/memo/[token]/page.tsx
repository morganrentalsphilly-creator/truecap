/**
 * GET /memo/[token] — a memo lead's own read-only decision
 * (docs/funnel-leaks-plan.md Phase A).
 *
 * The link in the "Email me this decision memo" email lands here. The token
 * is a signed, stateless capability carrying only the memo_leads row id
 * (lib/memo-lead.ts); the inputs live in that row and every output is
 * recomputed on open, exactly as /s/[token] does. Deleting the row (180-day
 * retention) kills the link.
 *
 * Unknown, tampered, expired and deleted tokens all render the same 404.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { createIpRateLimit, getRequestIp } from "@/lib/ip-rate-limit";
import { normalizeMaoTarget, normalizeMaoTargetForFinancing } from "@/lib/mao-target-editor";
import { DEFAULT_MAO_TARGET } from "@/lib/mao-targets";
import { isMemoLinkExpired, readMemoToken } from "@/lib/memo-lead";
import { resolveOfferCeilingForAccess } from "@/lib/offer-ceiling-server";
import { buildPublicShareAnalysisPayload } from "@/lib/public-share-analysis-result";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { TRUECAP_UNDERWRITING_STANDARD_VERSION } from "@/lib/underwriting-methodology";
import { releasedInvestmentFormSchema } from "@/lib/underwriting-model-release";
import { SharedDealShell } from "@/components/investcalc/shared-deal-shell";

type Props = { params: Promise<{ token: string }> };

// Always rendered per request and never cached: a deleted lead's link must
// die immediately. (/s gets the same guarantees from header rules in
// next.config.mjs; this route sets them here so that build-executed file is
// left untouched.)
export const dynamic = "force-dynamic";

// Best-effort enumeration brake; the signed token is the access control.
const memoReadRateLimit = createIpRateLimit({
  windowMs: 60 * 60 * 1000,
  maxPerWindow: 300,
});

export function generateMetadata(): Metadata {
  // Never resolve the private snapshot for metadata (same rule as /s).
  return {
    title: "Your decision memo — TrueCap",
    description: "A read-only rental decision memo from TrueCap.",
    robots: { index: false, follow: false, noarchive: true, nosnippet: true },
    // The token is a bearer credential: keep it out of Referer headers.
    referrer: "no-referrer",
  };
}

export default async function MemoPage({ params }: Props) {
  const { token } = await params;
  if (memoReadRateLimit.isOverLimit(await getRequestIp())) notFound();
  const leadId = readMemoToken(token);
  if (!leadId) notFound();

  let row: { snapshot: unknown; memo_requested_at: string } | null = null;
  try {
    const { data, error } = await createAdminSupabaseClient()
      .from("memo_leads")
      .select("snapshot, memo_requested_at")
      .eq("id", leadId)
      .maybeSingle();
    if (!error) row = data;
  } catch {
    row = null;
  }
  if (!row || isMemoLinkExpired(row.memo_requested_at)) notFound();

  const snapshot = (row.snapshot ?? {}) as { values?: unknown; maoTarget?: unknown };
  const parsed = releasedInvestmentFormSchema.safeParse(snapshot.values);
  if (!parsed.success) notFound();

  let result;
  try {
    result = calculateAnalysis(parsed.data);
  } catch {
    notFound();
  }

  // The free decision the visitor saw included the exact Offer Ceiling for
  // these inputs, so the memo shows it too. Targets fall back to the
  // analyzer's starter criteria when none were captured.
  const capturedTarget = normalizeMaoTarget(snapshot.maoTarget);
  const maoTarget =
    normalizeMaoTargetForFinancing(capturedTarget ?? DEFAULT_MAO_TARGET, {
      isCashPurchase: result.monthlyPayment <= 0,
    }) ?? undefined;
  const maoTargetSource = capturedTarget ? "selected-targets" : "starter-criteria";
  const offerCeilingAccess = maoTarget
    ? resolveOfferCeilingForAccess({
        values: parsed.data,
        target: maoTarget,
        source: maoTargetSource,
        paidAccess: true,
      })
    : null;

  return (
    <SharedDealShell
      shareSurface="memo_link"
      values={parsed.data}
      analysis={buildPublicShareAnalysisPayload(result, false)}
      comps={null}
      agent={null}
      maoTarget={maoTarget}
      maoTargetSource={maoTarget ? maoTargetSource : undefined}
      offerCeilingAccess={offerCeilingAccess}
      methodologyVersion={TRUECAP_UNDERWRITING_STANDARD_VERSION}
      outputsRecomputed
      recordedResult={false}
      addressIncluded
      specialistAnalysis={null}
      specialistAnalysisCaptured={false}
    />
  );
}
