/**
 * GET /s/[token] — opaque public share viewer (Fable 5 brief, Phase 1.1).
 *
 * The successor to /d/[encoded]: the URL carries a random 256-bit token and
 * NOTHING else — no address, no rent, no assumptions in the path, so nothing
 * sensitive lands in referrer logs or link previews. The snapshot lives in
 * public_shares (hashed token at rest) and expires by default. Newly minted
 * links have a signed-in owner who can revoke them; historical ownerless rows
 * remain readable until expiry for compatibility.
 *
 * Owner attribution here is server-trusted (we minted the row from the owner's
 * session), so co-branding needs no HMAC verification — but the lead-capture
 * WRITE path still expects the legacy signed attribution, so we mint a valid
 * signature on the fly with the same server secret. Zero changes to that
 * hardened write path.
 *
 * Revoked, expired, malformed, or unknown tokens all render the same 404 —
 * no oracle distinguishing "never existed" from "revoked".
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { releasedInvestmentFormSchema } from "@/lib/underwriting-model-release";
import { resolvePublicShare } from "@/lib/public-share";
import { getPublicAgentBranding } from "@/lib/agent-share";
import { getPublicDealComps } from "@/lib/public-deal-comps";
import { hashShareValues, signShareAttribution } from "@/lib/share-attribution";
import { SharedDealShell } from "@/components/investcalc/shared-deal-shell";
import { canShowSharedProAnalysis } from "@/lib/public-share-access";
import { TRUECAP_UNDERWRITING_STANDARD_VERSION } from "@/lib/underwriting-methodology";
import { resolveOfferCeilingForAccess } from "@/lib/offer-ceiling-server";
import { normalizeMaoTargetForFinancing } from "@/lib/mao-target-editor";
import Link from "next/link";
import { createIpRateLimit, getRequestIp } from "@/lib/ip-rate-limit";
import {
  isAdoptedOfferCeilingTargetSource,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
} from "@/lib/deal-score";
import { resolveSavedAnalysisResult } from "@/lib/saved-analysis-methodology";
import type { OfferCeilingAccessPayload } from "@/lib/offer-ceiling-access-contract";
import { readRecordedOfferCeiling } from "@/lib/recorded-offer-ceiling";

type Props = { params: Promise<{ token: string }> };

// Best-effort server-instance abuse brake. The random token remains the access
// capability and every invalid/lapsed outcome stays the same 404; this simply
// limits high-rate token enumeration without creating a validity oracle.
const opaqueShareReadRateLimit = createIpRateLimit({
  windowMs: 60 * 60 * 1000,
  maxPerWindow: 300,
});

export async function generateMetadata(): Promise<Metadata> {
  // Never resolve the private snapshot for metadata. Link unfurlers cache OG
  // fields outside TrueCap's access boundary, so the address/title belongs
  // only in the authorized page body.
  const title = "Shared rental analysis — TrueCap";
  return {
    title,
    description:
      "A rental property analysis shared with you via TrueCap — transparent rental math, no spreadsheet required.",
    // Private hand-off pages: never indexed, never archived, never snippeted.
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
    },
    openGraph: {
      title,
      description: "Shared via TrueCap.",
    },
    twitter: {
      card: "summary",
      title,
      description: "Shared via TrueCap.",
    },
  };
}

export default async function OpaqueSharePage({ params }: Props) {
  const { token } = await params;
  if (opaqueShareReadRateLimit.isOverLimit(await getRequestIp())) notFound();
  const resolved = await resolvePublicShare(token);
  if (!resolved) notFound();

  const parsed = releasedInvestmentFormSchema.safeParse(resolved.snapshot.values);
  if (!parsed.success) notFound();

  let currentResult;
  try {
    currentResult = calculateAnalysis(parsed.data);
  } catch {
    notFound();
  }
  const currentScore = computeDealScore(
    buildDealScoreInputFromAnalysis(parsed.data, currentResult)
  );
  const recordedResolution = resolved.snapshot.resultSnapshot
    ? resolveSavedAnalysisResult({
        methodologyVersion: resolved.methodologyVersion,
        resultSnapshot: resolved.snapshot.resultSnapshot,
        recomputedResult: currentResult,
        recomputedExtras: {
          score: currentScore.score,
          recommendation: currentScore.recommendation,
          riskLevel: currentScore.riskLevel,
          breakdown: currentScore.breakdown,
          explanation: currentScore.explanation,
        },
      })
    : null;
  const canRecomputeInputOnlyShare =
    resolved.legacyInputOnly &&
    (!resolved.methodologyVersion ||
      resolved.methodologyVersion === TRUECAP_UNDERWRITING_STANDARD_VERSION);
  const result = recordedResolution?.result ??
    (canRecomputeInputOnlyShare ? currentResult : null);
  if (!result) {
    return (
      <main id="main" className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-16">
        <section className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold text-foreground">This analysis is preserved</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Its recorded TrueCap result is not complete enough for this viewer. It has not been
            silently recalculated. Ask the owner to create a refreshed share from a new
            re-underwritten scenario.
          </p>
          <Link href="/" className="mt-4 inline-flex min-h-11 items-center font-bold text-primary hover:underline">
            Open TrueCap
          </Link>
        </section>
      </main>
    );
  }

  // Access, branding, comps, and lead attribution are bound to immutable,
  // typed row columns selected by the service-role resolver. Snapshot JSON is
  // owner-readable and must never be an authorization or attribution source.
  const ownerId = resolved.ownerId ?? undefined;
  const dealId = resolved.dealId ?? undefined;

  const [agent, comps, showProAnalysis] = await Promise.all([
    getPublicAgentBranding(ownerId),
    getPublicDealComps(dealId, ownerId),
    canShowSharedProAnalysis(ownerId),
  ]);

  const addressVisible = resolved.snapshot.meta.addressVisibility === "full";
  const displayValues = addressVisible
    ? parsed.data
    : { ...parsed.data, address: "Property address hidden by sharer" };
  // Never serialize a deterministic digest of a hidden address to the
  // recipient. The lead HMAC binds the exact values visible on the page;
  // otherwise the digest plus the remaining inputs becomes an offline address
  // oracle for anyone testing candidate listings.
  const valuesHash = hashShareValues(displayValues);
  const sig = ownerId ? signShareAttribution({ ownerId, dealId, valuesHash }) : null;
  const displayMaoTargetSource: OfferCeilingTargetSource =
    resolved.snapshot.maoTargetSource ?? "selected-targets";
  const displayMaoTarget =
    resolved.snapshot.maoTarget &&
    isAdoptedOfferCeilingTargetSource(displayMaoTargetSource)
    ? normalizeMaoTargetForFinancing(resolved.snapshot.maoTarget, {
        isCashPurchase: result.monthlyPayment <= 0,
      }) ?? undefined
    : undefined;
  let offerCeilingAccess: OfferCeilingAccessPayload | null = null;
  if (displayMaoTarget) {
    const hasRecordedSolve = Object.prototype.hasOwnProperty.call(
      resolved.snapshot,
      "offerCeilingExact"
    );
    const recordedCeiling = hasRecordedSolve
      ? readRecordedOfferCeiling({
          maxOfferTarget: resolved.snapshot.maoTarget,
          maxOfferTargetSource: resolved.snapshot.maoTargetSource,
          offerCeilingExact: resolved.snapshot.offerCeilingExact,
        })
      : { captured: false as const };
    if (recordedCeiling.captured) {
      offerCeilingAccess = showProAnalysis
        ? { access: "exact", exact: recordedCeiling.exact }
        : { access: "preview", range: null };
    } else if (resolved.legacyInputOnly) {
      offerCeilingAccess = resolveOfferCeilingForAccess({
        values: parsed.data,
        target: displayMaoTarget,
        source: displayMaoTargetSource,
        paidAccess: showProAnalysis,
      });
    }
  }

  return (
    <SharedDealShell
      values={displayValues}
      result={result}
      comps={addressVisible ? comps : null}
      agent={agent}
      showProAnalysis={showProAnalysis}
      maoTarget={displayMaoTarget}
      maoTargetSource={
        displayMaoTarget ? displayMaoTargetSource : undefined
      }
      offerCeilingAccess={offerCeilingAccess}
      methodologyVersion={resolved.methodologyVersion ?? TRUECAP_UNDERWRITING_STANDARD_VERSION}
      legacyMethodologyWarning={resolved.legacyUnpinned || resolved.legacyInputOnly}
      recordedResult={Boolean(recordedResolution?.usesRecordedSnapshot)}
      addressIncluded={addressVisible}
      leadCapture={
        agent && ownerId
          ? { ownerId, dealId, valuesHash, sig: sig ?? undefined }
          : undefined
      }
    />
  );
}
