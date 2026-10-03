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
import { isWellFormedShareToken } from "@/lib/share-token";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";
import { SHARE_CARD_IMAGE } from "@/lib/og/share-card";
import { getPublicAgentBranding } from "@/lib/agent-share";
import { getPublicDealComps } from "@/lib/public-deal-comps";
import {
  hashShareValues,
  signLeadCaptureAuthorization,
} from "@/lib/share-attribution";
import { SharedDealShell } from "@/components/investcalc/shared-deal-shell";
import { canShowSharedProAnalysis } from "@/lib/public-share-access";
import { TRUECAP_UNDERWRITING_STANDARD_VERSION } from "@/lib/underwriting-methodology";
import { resolveOfferCeilingForAccess } from "@/lib/offer-ceiling-server";
import { normalizeMaoTargetForFinancing } from "@/lib/mao-target-editor";
import { createIpRateLimit, getRequestIp } from "@/lib/ip-rate-limit";
import {
  isAdoptedOfferCeilingTargetSource,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import type { OfferCeilingAccessPayload } from "@/lib/offer-ceiling-access-contract";
import { buildPublicShareAnalysisPayload } from "@/lib/public-share-analysis-result";

type Props = { params: Promise<{ token: string }> };

// Best-effort server-instance abuse brake. The random token remains the access
// capability and every invalid/lapsed outcome stays the same 404; this simply
// limits high-rate token enumeration without creating a validity oracle.
const opaqueShareReadRateLimit = createIpRateLimit({
  windowMs: 60 * 60 * 1000,
  maxPerWindow: 300,
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Never resolve the private snapshot for metadata. Link unfurlers cache OG
  // fields outside TrueCap's access boundary, so the address/title belongs
  // only in the authorized page body.
  // The root layout's title template appends " | TrueCap" to `title`; the
  // social titles take no template, so they carry the brand themselves.
  const title = "Shared rental analysis";
  const socialTitle = `${title} | TrueCap`;
  // og:url is the link itself and nothing more: the token is read from the
  // path (no database call, so metadata stamps no view) and echoed only when
  // it has the minted shape, never as free text.
  const { token } = await params;
  const url = isWellFormedShareToken(token) ? `/s/${token}` : undefined;
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
      ...OPEN_GRAPH_BASE,
      type: "website",
      title: socialTitle,
      description: "Shared via TrueCap.",
      ...(url ? { url } : {}),
      // The one deal-free card every share link shows (app/og/share): the
      // same image for every link, with no address, number or sender on it,
      // served outside /s/ so robots.txt does not put it off limits.
      images: [SHARE_CARD_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: "Shared via TrueCap.",
      images: [SHARE_CARD_IMAGE.url],
    },
  };
}

export default async function OpaqueSharePage({ params }: Props) {
  const { token } = await params;
  if (opaqueShareReadRateLimit.isOverLimit(await getRequestIp())) notFound();
  const resolved = await resolvePublicShare(token);
  if (!resolved) notFound();

  const parsed = releasedInvestmentFormSchema.safeParse(
    resolved.snapshot.values,
  );
  if (!parsed.success) notFound();

  let currentResult;
  try {
    currentResult = calculateAnalysis(parsed.data);
  } catch {
    notFound();
  }
  const result = currentResult;

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
  const sig = ownerId
    ? signLeadCaptureAuthorization({
        shareSurface: "opaque_share",
        ownerId,
        dealId,
        valuesHash,
        dealAddress: displayValues.address,
      })
    : null;
  const displayMaoTargetSource: OfferCeilingTargetSource =
    resolved.snapshot.maoTargetSource ?? "selected-targets";
  const displayMaoTarget =
    resolved.snapshot.maoTarget &&
    isAdoptedOfferCeilingTargetSource(displayMaoTargetSource)
      ? (normalizeMaoTargetForFinancing(resolved.snapshot.maoTarget, {
          isCashPurchase: result.monthlyPayment <= 0,
        }) ?? undefined)
      : undefined;
  let offerCeilingAccess: OfferCeilingAccessPayload | null = null;
  if (displayMaoTarget) {
    offerCeilingAccess = resolveOfferCeilingForAccess({
      values: parsed.data,
      target: displayMaoTarget,
      source: displayMaoTargetSource,
      paidAccess: showProAnalysis,
    });
  }

  return (
    <SharedDealShell
      shareSurface="opaque_share"
      copyShareToken={token}
      values={displayValues}
      analysis={buildPublicShareAnalysisPayload(result, showProAnalysis)}
      comps={addressVisible ? comps : null}
      agent={agent}
      maoTarget={displayMaoTarget}
      maoTargetSource={displayMaoTarget ? displayMaoTargetSource : undefined}
      offerCeilingAccess={offerCeilingAccess}
      methodologyVersion={
        resolved.methodologyVersion ?? TRUECAP_UNDERWRITING_STANDARD_VERSION
      }
      legacyMethodologyWarning={
        resolved.legacyUnpinned || resolved.legacyInputOnly
      }
      outputsRecomputed
      recordedResult={false}
      addressIncluded={addressVisible}
      priceEstimated={resolved.snapshot.meta.priceEstimated === true}
      specialistAnalysis={null}
      specialistAnalysisCaptured={false}
      analyzerStrategyKey={resolved.snapshot.analyzerStrategyKey ?? "buy-hold"}
      leadCapture={
        agent && ownerId
          ? {
              shareSurface: "opaque_share",
              ownerId,
              dealId,
              valuesHash,
              sig: sig ?? undefined,
              opaqueShareToken: token,
            }
          : undefined
      }
    />
  );
}
