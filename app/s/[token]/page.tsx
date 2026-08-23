/**
 * GET /s/[token] — opaque public share viewer (Fable 5 brief, Phase 1.1).
 *
 * The successor to /d/[encoded]: the URL carries a random 256-bit token and
 * NOTHING else — no address, no rent, no assumptions in the path, so nothing
 * sensitive lands in referrer logs or link previews. The snapshot lives in
 * public_shares (hashed token at rest), is owner-revocable, and expires by
 * default.
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

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const resolved = await resolvePublicShare(token);
  const title = resolved?.snapshot.meta.title || resolved?.snapshot.values.address || "Shared deal";
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
      title: `${title} — Rental property analysis`,
      description: "Shared via TrueCap.",
    },
    twitter: {
      card: "summary",
      title: `${title} — Rental property analysis`,
      description: "Shared via TrueCap.",
    },
  };
}

export default async function OpaqueSharePage({ params }: Props) {
  const { token } = await params;
  const resolved = await resolvePublicShare(token);
  if (!resolved) notFound();

  const parsed = investmentFormSchema.safeParse(resolved.snapshot.values);
  if (!parsed.success) notFound();

  let result;
  try {
    result = calculateAnalysis(parsed.data);
  } catch {
    notFound();
  }

  const ownerId = resolved.snapshot.meta.ownerId;
  const dealId = resolved.snapshot.meta.dealId;

  const [agent, comps, showProAnalysis] = await Promise.all([
    getPublicAgentBranding(ownerId),
    getPublicDealComps(dealId, ownerId),
    canShowSharedProAnalysis(ownerId),
  ]);

  // Bridge to the legacy-hardened lead write path: it verifies an HMAC over
  // {ownerId, dealId, valuesHash}, so mint one with the server secret. If the
  // secret is unset, sig is null and the form simply won't verify — same
  // fail-safe as legacy shares.
  const valuesHash = hashShareValues(parsed.data);
  const sig = ownerId ? signShareAttribution({ ownerId, dealId, valuesHash }) : null;

  return (
    <SharedDealShell
      values={parsed.data}
      result={result}
      comps={comps}
      agent={agent}
      showProAnalysis={showProAnalysis}
      leadCapture={
        agent && ownerId
          ? { ownerId, dealId, valuesHash, sig: sig ?? undefined }
          : undefined
      }
    />
  );
}
