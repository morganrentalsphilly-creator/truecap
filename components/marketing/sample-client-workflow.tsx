import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { Section, SectionHeading } from "@/components/marketing/section";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";
import { buildSampleClientWorkflow, SAMPLE_WORKFLOW_BOXES, SAMPLE_WORKFLOW_CLIENTS } from "@/lib/sample-client-workflow";
import { formatLedgerDollars } from "@/lib/sample-deal-ledger";

const STEP_TITLE = "font-display text-h3-sm";

export function SampleClientPreview() {
  const screens = buildSampleClientWorkflow();
  return <aside aria-labelledby="client-preview-title" className="rounded-object border border-border bg-card p-5 shadow-rest sm:p-6">
    <h2 id="client-preview-title" className="font-display text-h3-sm">Same rental. Different client fit.</h2>
    <p className="mt-2 text-sm text-muted-foreground">{formatLedgerDollars(SAMPLE_DEAL_VALUES.purchasePrice)} asking · illustrative clients · calculated sample</p>
    <dl className="mt-4 divide-y divide-border">
      {screens.map((screen, index) => <div key={screen.clientId} className="py-4">
        <dt className="font-semibold">{screen.clientName}</dt>
        <dd className="mt-1 text-sm text-muted-foreground">Target: at least {formatLedgerDollars(SAMPLE_WORKFLOW_BOXES[index].minCashFlowMonthly ?? 0)}/mo cash flow</dd>
        <dd className={`mt-2 text-sm font-semibold ${screen.status === "meets" ? "text-positive" : "text-highlight-text"}`}>{screen.status === "meets" ? "Meets selected criteria at asking" : screen.status === "misses" ? "Misses selected criteria at asking" : "Needs verification"}</dd>
        <dd className="mt-3 flex flex-wrap items-baseline justify-between gap-3"><span className="text-sm">Offer Ceiling</span><strong className="break-words font-display text-2xl tabular-nums sm:text-key-sm">{screen.offerCeiling == null ? "Unavailable" : formatLedgerDollars(screen.offerCeiling)}</strong></dd>
      </div>)}
    </dl>
    <IntentPrefetchLink href="#sample-client-workflow" className="tc-link mt-2 inline-flex min-h-11 items-center">Follow the client workflow</IntentPrefetchLink>
  </aside>;
}

/** Server-rendered walkthrough: real engine outputs, clearly illustrative inputs. */
export function SampleClientWorkflow() {
  const screens = buildSampleClientWorkflow();
  return (
    <Section id="sample-client-workflow" aria-labelledby="sample-client-workflow-heading">
      <SectionHeading id="sample-client-workflow-heading">One property, two client decisions.</SectionHeading>
      <p className="mt-3 max-w-[64ch] text-base text-muted-foreground">
        Sample property · illustrative clients · results calculated by TrueCap&apos;s engine. No customer data.
      </p>
      <ol className="mt-8 grid gap-x-12 gap-y-8 lg:grid-cols-2">
        <li className="min-w-0 border-t-2 border-foreground pt-4">
          <h3 className={STEP_TITLE}>1. Review the listing</h3>
          <p className="mt-3 text-base text-muted-foreground">Save the property once, with the assumptions you reviewed.</p>
          <dl className="mt-4 divide-y divide-border text-base">
            <div className="flex justify-between gap-4 py-2"><dt>Asking price</dt><dd className="font-semibold tabular-nums">{formatLedgerDollars(SAMPLE_DEAL_VALUES.purchasePrice)}</dd></div>
            <div className="flex justify-between gap-4 py-2"><dt>Sample rent assumption</dt><dd className="font-semibold tabular-nums">{formatLedgerDollars(SAMPLE_DEAL_VALUES.monthlyRent ?? 0)}/mo</dd></div>
          </dl>
          <p className="mt-3 text-sm text-muted-foreground">Review rent, property tax, repairs, and financing before relying on a result.</p>
        </li>
        <li className="min-w-0 border-t-2 border-foreground pt-4">
          <h3 className={STEP_TITLE}>2. Set each client&apos;s targets</h3>
          <dl className="mt-3 divide-y divide-border">
            {SAMPLE_WORKFLOW_CLIENTS.map((client, index) => <div key={client.id} className="py-3">
              <dt className="font-semibold">{client.name}</dt>
              <dd className="mt-1 text-base text-muted-foreground">Cash flow ≥ {formatLedgerDollars(SAMPLE_WORKFLOW_BOXES[index].minCashFlowMonthly ?? 0)}/mo · DSCR ≥ 1.25</dd>
              <dd className="mt-1 text-sm text-muted-foreground">25% down · {client.financingAssumptions.interestRate}% interest · 30 years</dd>
            </div>)}
          </dl>
        </li>
        <li className="min-w-0 border-t-2 border-foreground pt-4">
          <h3 className={STEP_TITLE}>3. Compare fit and Offer Ceilings</h3>
          <p className="mt-3 text-base text-muted-foreground">Select <strong className="font-semibold text-foreground">Screen my clients</strong> on the saved property. Each client gets a separate result.</p>
          <dl className="mt-4 divide-y divide-border">
            {screens.map(screen => <div key={screen.clientId} className="py-3" data-sample-client-result={screen.clientId}>
              <dt className="font-semibold">{screen.clientName}</dt>
              <dd className="mt-1 text-sm">{screen.status === "meets" ? "Meets selected criteria at asking" : screen.status === "misses" ? "Misses selected criteria at asking" : "Needs verification"}</dd>
              <dd className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-base"><span>Offer Ceiling</span><strong className="font-display text-2xl tabular-nums">{screen.offerCeiling == null ? "Unavailable" : formatLedgerDollars(screen.offerCeiling)}</strong></dd>
            </div>)}
          </dl>
        </li>
        <li className="min-w-0 border-t-2 border-foreground pt-4">
          <h3 className={STEP_TITLE}>4. Save the match and send the report</h3>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">Save the matches worth pursuing. Each preserves the criteria and financing used. Export that client&apos;s PDF or prepare a client link, then choose whether to show the address.</p>
          <p className="mt-3 text-sm text-muted-foreground">Criteria fit is preliminary screening. Confirm the property facts and lender terms with your client.</p>
          <IntentPrefetchLink href="/sample-decision-memo" className="tc-link mt-4 inline-flex min-h-11 items-center">See the sample report layout</IntentPrefetchLink>
          <p className="text-sm text-muted-foreground">The report example uses the standard sample targets, not either illustrative buyer above.</p>
        </li>
      </ol>
    </Section>
  );
}
