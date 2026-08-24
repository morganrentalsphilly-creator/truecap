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
import { investmentFormSchema } from "@/lib/investcalc-schema";
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

  // Never silently recompute a pinned historical share under a different
  // formula contract. Version adapters can be added here when Standard v2
  // ships; until then the preserved snapshot fails closed and asks for a new
  // share rather than changing its financial answer.
  if (
    resolved.methodologyVersion &&
    resolved.methodologyVersion !== TRUECAP_UNDERWRITING_STANDARD_VERSION
  ) {
    return (
      <main id="main" className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-16">
        <section className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold text-foreground">This analysis is preserved</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            It was created with TrueCap Underwriting Standard v{resolved.methodologyVersion}.
            This viewer runs v{TRUECAP_UNDERWRITING_STANDARD_VERSION}, so it will not silently
            recalculate the historical decision. Ask the owner to create a refreshed share.
          </p>
          <Link href="/" className="mt-4 inline-flex min-h-11 items-center font-bold text-primary hover:underline">
            Open TrueCap
          </Link>
        </section>
      </main>
    );
  }

  const parsed = investmentFormSchema.safeParse(resolved.snapshot.values);
  if (!parsed.success) notFound();

  let result;
  try {
    result = calculateAnalysis(parsed.data);
  } catch {
    notFound();
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
  const displayMaoTarget = resolved.snapshot.maoTarget
    ? normalizeMaoTargetForFinancing(resolved.snapshot.maoTarget, {
        isCashPurchase: result.monthlyPayment <= 0,
      }) ?? undefined
    : undefined;
  const offerCeilingAccess = displayMaoTarget
    ? resolveOfferCeilingForAccess({
        values: parsed.data,
        target: displayMaoTarget,
        source:
          resolved.snapshot.maoTargetSource ?? "selected-targets",
        paidAccess: showProAnalysis,
      })
    : null;

  return (
    <SharedDealShell
      values={displayValues}
      result={result}
      comps={addressVisible ? comps : null}
      agent={agent}
      showProAnalysis={showProAnalysis}
      maoTarget={displayMaoTarget}
      maoTargetSource={
        resolved.snapshot.maoTargetSource ?? "selected-targets"
      }
      offerCeilingAccess={offerCeilingAccess}
      methodologyVersion={resolved.methodologyVersion ?? TRUECAP_UNDERWRITING_STANDARD_VERSION}
      legacyMethodologyWarning={resolved.legacyUnpinned}
      addressIncluded={addressVisible}
      leadCapture={
        agent && ownerId
          ? { ownerId, dealId, valuesHash, sig: sig ?? undefined }
          : undefined
      }
    />
  );
}
