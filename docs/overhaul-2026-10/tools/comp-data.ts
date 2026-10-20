/**
 * Figures for the 2026-10 overhaul comps and brief (OVERHAUL.md §5).
 *
 * Every number is read from the production engine through
 * calculateSampleDealOutcome() and buildSampleDealLedger(); the price sweep
 * runs the same calculateAnalysis() the ledger uses, with the sample fixture
 * at each price, so the "drag the price" hero can be drawn from real points.
 * Prices come from the public catalog. Nothing is typed by hand.
 *
 * Usage: npx -y tsx docs/overhaul-2026-10/tools/comp-data.ts
 * Writes docs/overhaul-2026-10/directions/comp-data.json
 */
import fs from "node:fs";
import path from "node:path";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { calculateSampleDealOutcome } from "@/lib/sample-deal-analysis";
import { buildSampleDealLedger, formatLedgerDollars } from "@/lib/sample-deal-ledger";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import { formatDscr } from "@/lib/financial-presentation";
import {
  PLAN_CATALOG,
  PUBLIC_PRO_MONTHLY_USD,
  PUBLIC_PRO_ANNUAL_USD,
  PUBLIC_AGENT_PRO_MONTHLY_USD,
  PUBLIC_AGENT_PRO_ANNUAL_USD,
  formatPublicUsd,
} from "@/lib/public-pricing";

const { analysis, maxOffer, dealScore } = calculateSampleDealOutcome();
const ledger = buildSampleDealLedger();
if (!ledger || !maxOffer) throw new Error("sample deal did not compute");

const values = SAMPLE_DEAL_FIXTURE.values;
const target = SAMPLE_DEAL_FIXTURE.maoTarget;

// The price track: from $20k below the ceiling to $20k above asking, $1,000 steps.
const low = Math.floor((ledger.offerCeiling - 20_000) / 1000) * 1000;
const high = Math.ceil((ledger.askingPrice + 20_000) / 1000) * 1000;
const sweep: {
  price: number;
  cashFlow: number;
  dscr: number;
  coc: number;
  capRate: number;
  meets: boolean;
}[] = [];
for (let price = low; price <= high; price += 1000) {
  const r = calculateAnalysis({ ...values, purchasePrice: price });
  const meets =
    (target.monthlyCashFlow == null || r.netCashFlow >= target.monthlyCashFlow) &&
    (target.dscr == null || r.dscr >= target.dscr);
  sweep.push({
    price,
    cashFlow: r.netCashFlow,
    dscr: r.dscr,
    coc: r.cocReturn,
    capRate: r.capRate,
    meets,
  });
}

const out = {
  generatedAt: new Date().toISOString(),
  source: "calculateSampleDealOutcome() + calculateAnalysis() sweep; PLAN_CATALOG",
  title: ledger.title,
  asking: ledger.askingPrice,
  ceiling: ledger.offerCeiling,
  belowAsking: ledger.belowAsking,
  bindingTarget: ledger.bindingTarget,
  target,
  atAsking: {
    cashFlow: analysis.netCashFlow,
    dscr: analysis.dscr,
    coc: analysis.cocReturn,
    capRate: analysis.capRate,
    noiAnnual: analysis.noiAnnual,
    meets: ledger.meetsTargets.asking,
  },
  atCeiling: {
    cashFlow: maxOffer.achieved.netCashFlow,
    dscr: maxOffer.achieved.dscr,
    coc: maxOffer.achieved.cocReturn,
    capRate: maxOffer.achieved.capRate,
    noiAnnual: maxOffer.achieved.noiAnnual,
    meets: ledger.meetsTargets.ceiling,
  },
  dealScore: dealScore ? { score: (dealScore as { score?: number }).score ?? null } : null,
  inputs: {
    rent: values.monthlyRent,
    rate: values.interestRate,
    downPaymentPct: values.downPaymentPct,
    propertyTaxPct: values.propertyTaxPct,
    bedrooms: values.bedrooms,
  },
  formatted: {
    asking: formatLedgerDollars(ledger.askingPrice),
    ceiling: formatLedgerDollars(ledger.offerCeiling),
    belowAsking: formatLedgerDollars(ledger.belowAsking),
    cashFlowAsking: `${formatLedgerDollars(analysis.netCashFlow)}/mo`,
    cashFlowCeiling: `${formatLedgerDollars(maxOffer.achieved.netCashFlow)}/mo`,
    dscrAsking: formatDscr(analysis.dscr, true),
    dscrCeiling: formatDscr(maxOffer.achieved.dscr, true),
    cocAsking: `${analysis.cocReturn.toFixed(1)}%`,
    cocCeiling: `${maxOffer.achieved.cocReturn.toFixed(1)}%`,
    capAsking: `${analysis.capRate.toFixed(1)}%`,
    capCeiling: `${maxOffer.achieved.capRate.toFixed(1)}%`,
    rent: formatLedgerDollars(values.monthlyRent),
    rate: `${values.interestRate}%`,
  },
  monthlyLedger: ledger.monthly.map((l) => ({
    label: l.label,
    asking: Math.round(l.value.asking),
    ceiling: Math.round(l.value.ceiling),
    total: !!l.total,
  })),
  plans: {
    pro: {
      name: PLAN_CATALOG.pro?.name ?? "Pro",
      monthly: formatPublicUsd(PUBLIC_PRO_MONTHLY_USD),
      annual: formatPublicUsd(PUBLIC_PRO_ANNUAL_USD),
      annualPerMonth: formatPublicUsd(PUBLIC_PRO_ANNUAL_USD / 12),
    },
    agentPro: {
      name: PLAN_CATALOG.agent_pro?.name ?? "Agent Pro",
      monthly: formatPublicUsd(PUBLIC_AGENT_PRO_MONTHLY_USD),
      annual: formatPublicUsd(PUBLIC_AGENT_PRO_ANNUAL_USD),
      annualPerMonth: formatPublicUsd(PUBLIC_AGENT_PRO_ANNUAL_USD / 12),
    },
  },
  sweep,
};

const dir = path.join("docs", "overhaul-2026-10", "directions");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "comp-data.json"), JSON.stringify(out, null, 2));
console.log(
  `asking ${out.formatted.asking}, ceiling ${out.formatted.ceiling}, cash flow ${out.formatted.cashFlowAsking} → ${out.formatted.cashFlowCeiling}, DSCR ${out.formatted.dscrAsking} → ${out.formatted.dscrCeiling}, CoC ${out.formatted.cocAsking} → ${out.formatted.cocCeiling}; sweep ${sweep.length} points ${low}–${high}; meets flips at ${sweep.find((p) => !p.meets)?.price ?? "n/a"}`,
);
