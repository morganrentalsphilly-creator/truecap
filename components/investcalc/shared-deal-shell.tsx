/**
 * Shared-deal page shell — the one renderer behind BOTH public share routes:
 *
 *   /d/[encoded]  legacy stateless links (payload in the URL, being retired)
 *   /s/[token]    opaque server-backed shares (payload in public_shares)
 *
 * Extracted from the /d/ page so the two routes cannot drift: same banner,
 * same read-only view, same lead capture/upsell, same disclaimer footer.
 * Server component — callers do the decoding/resolution + verification and
 * hand this only trusted, ready-to-render data.
 */

import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { AnalysisResult } from "@/lib/calc-analysis";
import type { PublicAgentBranding } from "@/lib/agent-share";
import type { ReportComps } from "@/lib/report-comps";
import { ReadOnlyAnalysisView } from "@/components/investcalc/read-only-analysis-view";
import { TrackSharedDealView } from "@/components/analytics/track-shared-deal-view";
import { LeadCaptureForm } from "@/components/investcalc/lead-capture-form";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import type { OfferCeilingAccessPayload } from "@/lib/offer-ceiling-access-contract";
import type { OfferCeilingTargetSource } from "@/lib/offer-ceiling-contract";

export type SharedDealLeadCapture = {
  ownerId: string;
  dealId?: string;
  valuesHash: string;
  sig?: string;
};

export function SharedDealShell({
  values,
  result,
  comps,
  agent,
  showProAnalysis,
  maoTarget,
  maoTargetSource,
  offerCeilingAccess,
  leadCapture,
  methodologyVersion,
  legacyMethodologyWarning = false,
  addressIncluded = true,
}: {
  values: InvestmentFormValues;
  result: AnalysisResult;
  comps: ReportComps | null;
  agent: PublicAgentBranding | null;
  /** Pro analysis follows the verified creator's current paid entitlement. */
  showProAnalysis: boolean;
  /** Exact acquisition criteria captured with an opaque share, when present. */
  maoTarget?: MaoTarget;
  /** Frozen provenance for the captured acquisition criteria. */
  maoTargetSource?: OfferCeilingTargetSource;
  /** Server-authorized exact result or coarse preview. */
  offerCeilingAccess?: OfferCeilingAccessPayload | null;
  /** Present only when owner attribution is VERIFIED (legacy HMAC or a
   *  server-backed share row) — powers the co-branded lead form. */
  leadCapture?: SharedDealLeadCapture;
  methodologyVersion?: string;
  legacyMethodologyWarning?: boolean;
  addressIncluded?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background">
      <TrackSharedDealView hasAddress={addressIncluded} />
      {/* Top banner — agent-branded when a Pro owner shared it, else TrueCap. */}
      {agent ? (
        <div
          className="flex items-center justify-center gap-2 py-2.5 px-4 text-center text-xs font-semibold text-white sm:text-sm"
          style={{ background: agent.primaryColor ?? "var(--primary)" }}
        >
          {agent.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={agent.logoUrl} alt="" className="h-5 w-auto rounded-sm bg-white/90 p-0.5" />
          ) : null}
          <span>Shared by {agent.displayName}</span>
        </div>
      ) : (
        <div className="bg-primary text-primary-foreground py-2 px-4 text-center text-xs sm:text-sm">
          Shared via{" "}
          <Link href="/" className="font-bold underline underline-offset-2">
            TrueCap
          </Link>{" "}
          — view-only. Want to edit, save, or run your own? Start free at{" "}
          <Link href="/" className="font-bold underline underline-offset-2">
            usetruecap.com
          </Link>
          .
        </div>
      )}

      {/* pb-28/sm:pb-16 reserves clearance so the footer's last row scrolls
          clear of the fixed cookie-consent banner (z-50, bottom-0) that overlays
          shares for a first-visit, pre-consent viewer. */}
      <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-28 sm:pb-16">
        <header className="mb-6 sm:mb-8">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">
            Shared analysis
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">{values.address}</h1>
          {values.purchasePrice && (
            <p className="text-sm text-muted-foreground mt-1">
              Purchase price ${values.purchasePrice.toLocaleString("en-US")}
              {values.yearBuilt ? ` · built ${values.yearBuilt}` : ""}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            TrueCap Underwriting Standard v{methodologyVersion ?? result.methodologyVersion}
          </p>
          {legacyMethodologyWarning ? (
            <p role="status" className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-foreground">
              Legacy share: this link did not capture a formula-version pin. It has been
              recalculated with the current standard and should be refreshed before it is
              used for a decision.
            </p>
          ) : null}
        </header>

        <ReadOnlyAnalysisView
          values={values}
          result={result}
          comps={comps}
          showProAnalysis={showProAnalysis}
          maoTarget={maoTarget}
          maoTargetSource={maoTargetSource}
          offerCeilingAccess={offerCeilingAccess}
          addressIncluded={addressIncluded}
        />

        {/* Agent lead capture (co-branded shares) OR the generic Pro upsell. */}
        {agent && leadCapture ? (
          <LeadCaptureForm
            ownerId={leadCapture.ownerId}
            dealId={leadCapture.dealId}
            valuesHash={leadCapture.valuesHash}
            sig={leadCapture.sig}
            agentName={agent.displayName}
            dealAddress={values.address}
            accentColor={agent.primaryColor}
          />
        ) : (
          <div className="mt-6 rounded-2xl border border-primary/30 bg-[var(--brand-blue-light)] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-foreground">
                  See 10-year projections, illustrative tax impact, modeled exit comparisons, and the secondary Screening Index
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  The full analysis with multi-year cash flow projections,
                  illustrative depreciation tax modeling, and exit-year
                  comparison is free to start. Run this property in your own account — your edits stay
                  private.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-primary hover:underline"
                >
                  Start free at usetruecap.com
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-10 pb-8 text-center text-xs text-muted-foreground">
          <p className="mx-auto max-w-2xl">
            This shared analysis is for informational purposes only and is not
            financial, tax, or legal advice. The figures are estimates based on
            the assumptions entered by whoever created this link — verify rent,
            expenses, and financing independently before making any investment
            decision.
          </p>
          <p className="mt-3">
            Built with{" "}
            <Link href="/" className="font-bold text-foreground hover:underline">
              TrueCap
            </Link>{" "}
            — transparent, editable rental analysis, free to start.
          </p>
        </footer>
      </main>
    </div>
  );
}
