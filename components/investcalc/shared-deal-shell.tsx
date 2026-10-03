/**
 * Shared-deal page shell — the one renderer behind BOTH public share routes:
 *
 *   /d/[encoded]  legacy stateless links (payload in the URL, being retired)
 *   /s/[token]    opaque server-backed shares (payload in public_shares)
 *   /memo/[token] a memo lead's own emailed decision (shareSurface "memo_link")
 *
 * Extracted from the /d/ page so the two routes cannot drift: same banner,
 * same read-only view, same lead capture, same disclaimer footer.
 * Server component — callers do the decoding/resolution + verification and
 * hand this only trusted, ready-to-render data.
 *
 * TrueCap asks the visitor for one thing, once: the "Analyze a deal free"
 * block the read-only view renders below the Disclaimer. The banner and the
 * footer name TrueCap and carry no call to action, and nothing here repeats
 * the upsell (2026-10 go-to-market audit, rows P1-45 and P2-137).
 */

import Link from "next/link";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { PublicAgentBranding } from "@/lib/agent-share";
import type { ReportComps } from "@/lib/report-comps";
import { ReadOnlyAnalysisView } from "@/components/investcalc/read-only-analysis-view";
import { TrackSharedDealView } from "@/components/analytics/track-shared-deal-view";
import { LeadCaptureForm } from "@/components/investcalc/lead-capture-form";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import type { OfferCeilingAccessPayload } from "@/lib/offer-ceiling-access-contract";
import type { OfferCeilingTargetSource } from "@/lib/offer-ceiling-contract";
import type { PublicShareAnalysisPayload } from "@/lib/public-share-analysis-result";
import type { AnalyzerStrategyKey } from "@/lib/analyzer-strategy-persistence";
import type { SpecialistAnalysisSnapshot } from "@/lib/specialist-analysis-snapshot";

export type SharedDealLeadCapture = {
  ownerId: string;
  shareSurface: "opaque_share" | "legacy_share" | "portal_share";
  dealId?: string;
  valuesHash: string;
  sig?: string;
  opaqueShareToken?: string;
};

/**
 * The head of a share whose sender hid the exact address (the Share dialog's
 * choice; app/s/[token]/page.tsx passes addressIncluded={false}). The page is
 * named for what it is and says once, plainly, why no address is shown. The
 * Share dialog quotes the heading to the agent before the link is made
 * (components/investcalc/share-link-button.tsx).
 */
export const HIDDEN_ADDRESS_HEADING = "Rental analysis";
export const HIDDEN_ADDRESS_NOTE =
  "The sender kept the property address private.";

/**
 * Whether a client's message is also emailed to the agent. The mode test is
 * the same as notificationsLive() in app/actions/capture-deal-lead.ts, which
 * decides the send, and the mail key is checked because that action's
 * notifyOwner returns without sending when RESEND_API_KEY is absent: with the
 * mode live and no key, no agent is emailed. The form's confirmation may say
 * TrueCap emails the agent only when this is true (row P1-67). It is the
 * configuration, not proof that one message went out, so the confirmation
 * states the rule and reports only the save.
 * lib/__tests__/share-page-one-cta.test.tsx holds the expressions together.
 */
function leadNotificationsLive(): boolean {
  return (
    (process.env.LEAD_NOTIFICATIONS_MODE ?? "off").trim().toLowerCase() ===
      "live" && Boolean(process.env.RESEND_API_KEY?.trim())
  );
}

export function SharedDealShell({
  values,
  analysis,
  comps,
  agent,
  maoTarget,
  maoTargetSource,
  offerCeilingAccess,
  leadCapture,
  methodologyVersion,
  legacyMethodologyWarning = false,
  outputsRecomputed = false,
  inputsSource = "captured-share",
  recordedResult = false,
  addressIncluded = true,
  priceEstimated = false,
  specialistAnalysis = null,
  specialistAnalysisCaptured = false,
  analyzerStrategyKey = "buy-hold",
  shareSurface,
  copyShareToken,
}: {
  values: InvestmentFormValues;
  /** Entitlement-redacted before crossing into the public client renderer. */
  analysis: PublicShareAnalysisPayload;
  comps: ReportComps | null;
  agent: PublicAgentBranding | null;
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
  /** True when captured inputs were evaluated by the current server engines
   * when this view opened, rather than presenting a frozen result payload. */
  outputsRecomputed?: boolean;
  /** Whether the displayed inputs were captured with an immutable share or
   * read from the agent's current saved deal when a portal view opened. */
  inputsSource?: "captured-share" | "live-saved";
  /** True when result is the immutable output captured with an opaque share. */
  recordedResult?: boolean;
  addressIncluded?: boolean;
  /** The shared price was an automated estimate — never headline it "Asking". */
  priceEstimated?: boolean;
  /** Entitlement-redacted frozen strategy result. Never pass this to the
   * client unless the verified share owner may expose Pro analysis. */
  specialistAnalysis?: SpecialistAnalysisSnapshot | null;
  /** Non-sensitive availability bit used to distinguish an entitlement gate
   * from a legacy/malformed snapshot without serializing the result itself. */
  specialistAnalysisCaptured?: boolean;
  analyzerStrategyKey?: AnalyzerStrategyKey;
  /** Coarse analytics source only; never pass a share token or account id. */
  shareSurface: "opaque_share" | "legacy_share" | "portal_share" | "memo_link";
  /** Present only for a revocable /s capability. The client sends it back to
   * the auth-gated action, which re-resolves revocation and expiry at click. */
  copyShareToken?: string;
}) {
  const tenYearProjectionVersion =
    analysis.access === "pro"
      ? analysis.result.tenYearProjectionVersion
      : undefined;
  // A memo link is the visitor's OWN decision, not something shared with
  // them: it is labelled as theirs and stays out of the share-recipient
  // funnel (shared_analysis_opened).
  const isMemo = shareSurface === "memo_link";
  return (
    <div className="min-h-screen bg-background">
      {isMemo ? null : <TrackSharedDealView referralSource={shareSurface} />}
      {/* Top banner — agent-branded when a Pro owner shared it, else TrueCap. */}
      {agent ? (
        <div
          className="flex items-center justify-center gap-2 py-2.5 px-4 text-center text-xs font-semibold text-white sm:text-sm"
          style={{ background: agent.primaryColor ?? "var(--primary)" }}
        >
          {agent.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agent.logoUrl}
              alt=""
              className="h-5 w-auto rounded-sm bg-white/90 p-0.5"
            />
          ) : null}
          <span>Shared by {agent.displayName}</span>
        </div>
      ) : (
        <div className="bg-primary text-primary-foreground py-2 px-4 text-center text-xs sm:text-sm">
          {isMemo ? "Your decision memo from" : "Shared via"}{" "}
          <Link href="/" className="font-bold underline underline-offset-2">
            TrueCap
          </Link>
          . View only.
        </div>
      )}

      {/* pb-28/sm:pb-16 reserves clearance so the footer's last row scrolls
          clear of the fixed cookie-consent banner (z-50, bottom-0) that overlays
          shares for a first-visit, pre-consent viewer. */}
      <main
        id="main"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-28 sm:pb-16"
      >
        <header className="mb-6 sm:mb-8">
          {/* A share with the address hidden is headed by what it is, with
              one line saying why there is no address. `values.address` then
              holds a placeholder the lead form's signature is bound to
              (app/s/[token]/page.tsx), which is not a heading. */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
            {addressIncluded ? values.address : HIDDEN_ADDRESS_HEADING}
          </h1>
          {addressIncluded ? null : (
            <p className="mt-1 text-sm text-muted-foreground">
              {HIDDEN_ADDRESS_NOTE}
            </p>
          )}
          {values.purchasePrice && (
            <p className="text-sm text-muted-foreground mt-1">
              {/* The body already labels an estimated price honestly; this
                  header stated it as a bare fact, so the first line a
                  recipient read contradicted the disclosure below it. */}
              {priceEstimated ? "Estimated price" : "Purchase price"} $
              {values.purchasePrice.toLocaleString("en-US")}
              {priceEstimated ? " (automated estimate)" : ""}
              {values.yearBuilt ? ` · built ${values.yearBuilt}` : ""}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            TrueCap Underwriting Standard v
            {methodologyVersion ?? analysis.result.methodologyVersion}
            {analysis.access === "pro"
              ? ` · 10-year projection ${tenYearProjectionVersion ? `method v${tenYearProjectionVersion}` : "method recorded-unversioned"}`
              : ""}
          </p>
          {outputsRecomputed ? (
            <p
              role="status"
              className="mt-2 rounded-lg border border-caution/40 bg-caution-light p-3 text-xs leading-relaxed text-foreground"
            >
              {inputsSource === "live-saved"
                ? `This view uses the agent’s current saved inputs and ${maoTargetSource === "starter-criteria" ? "adopted TrueCap starter criteria" : maoTargetSource === "buy-box" ? "captured Buy Box criteria" : "selected targets"}. TrueCap outputs were recomputed server-side when you opened it using the labeled standard.`
                : isMemo
                  ? "These are the inputs you entered when you requested this memo. TrueCap outputs were recomputed server-side when you opened it using the labeled standard."
                  : `The inputs and ${maoTargetSource === "starter-criteria" ? "adopted TrueCap starter criteria" : maoTargetSource === "buy-box" ? "captured Buy Box criteria" : "selected targets"} were captured when this view was shared. TrueCap outputs were recomputed server-side when you opened it using the labeled standard.`}
              {legacyMethodologyWarning
                ? " This link uses a legacy publication format; ask the owner to refresh it before relying on it for a decision."
                : ""}
            </p>
          ) : null}
        </header>

        <ReadOnlyAnalysisView
          values={values}
          analysis={analysis}
          comps={comps}
          maoTarget={maoTarget}
          maoTargetSource={maoTargetSource}
          offerCeilingAccess={offerCeilingAccess}
          recordedResult={recordedResult}
          addressIncluded={addressIncluded}
          priceEstimated={priceEstimated}
          specialistAnalysis={specialistAnalysis}
          specialistAnalysisCaptured={specialistAnalysisCaptured}
          analyzerStrategyKey={analyzerStrategyKey}
          copyShareToken={copyShareToken}
          // The agent's form sits above the Disclaimer and above TrueCap's
          // own block, so on a co-branded page the client reaches the agent
          // before TrueCap's promo (row P1-67).
          leadForm={
            agent && leadCapture ? (
              <LeadCaptureForm
                shareSurface={leadCapture.shareSurface}
                ownerId={leadCapture.ownerId}
                dealId={leadCapture.dealId}
                valuesHash={leadCapture.valuesHash}
                sig={leadCapture.sig}
                opaqueShareToken={leadCapture.opaqueShareToken}
                agentName={agent.displayName}
                dealAddress={values.address}
                accentColor={agent.primaryColor}
                agentEmailed={leadNotificationsLive()}
                contact={{
                  name: agent.contactName,
                  email: agent.contactEmail,
                  phone: agent.contactPhone,
                  website: agent.contactWebsite,
                }}
              />
            ) : null
          }
        />

        {/* One disclaimer per page (docs/voice.md rule 3): the analysis view
            above renders <Disclaimer /> and, below it, the page's one
            TrueCap call to action, so this footer carries only the brand
            line. */}
        <footer className="mt-10 pb-8 text-center text-xs text-muted-foreground">
          <p>
            Built with{" "}
            <Link
              href="/"
              className="font-bold text-foreground hover:underline"
            >
              TrueCap
            </Link>{" "}
            — transparent, editable rental analysis, free to start.
          </p>
        </footer>
      </main>
    </div>
  );
}
