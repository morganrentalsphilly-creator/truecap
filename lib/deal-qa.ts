/**
 * Deal Q&A — pure helpers for the "ask anything about this deal" AI
 * panel. The server action (app/actions/deal-qa.ts) recomputes the
 * analysis from the submitted form values via calculateAnalysis (the
 * single source of truth) and serializes a compact, grounded context
 * for the model. Keeping this pure + separate makes the prompt
 * deterministic and unit-testable without touching the network.
 */

import type { AnalysisResult } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { getDealTier } from "@/lib/verdict";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const pct = (n: number) => `${n.toFixed(2)}%`;

/**
 * Compact plain-text context the model is grounded in. Deliberately
 * text, not JSON — fewer tokens, and models follow "use only these
 * numbers" more reliably with labeled lines than nested JSON.
 */
export function buildDealQaContext(
  values: InvestmentFormValues,
  result: AnalysisResult
): string {
  const isCash = result.monthlyPayment <= 0;
  const lines = [
    `Property type: ${values.propertyType}`,
    values.address ? `Address: ${values.address}` : null,
    `Purchase price: ${money(values.purchasePrice)}`,
    `Monthly rental income: ${money(result.monthlyRentalIncome)}`,
    `Monthly operating expenses: ${money(result.totalOperatingExpenses)}`,
    isCash
      ? `Financing: all-cash purchase (no loan, DSCR not applicable)`
      : `Financing: ${values.downPaymentPct ?? 0}% down, ${values.interestRate}% rate, ${values.loanTermYears}-year term, monthly payment ${money(result.monthlyPayment)}`,
    `Loan amount: ${money(result.loanAmount)}`,
    `Cash invested (down + closing): ${money(result.downPayment + result.closingCosts)}`,
    `Net monthly cash flow: ${money(result.netCashFlow)}`,
    `Cap rate: ${pct(result.capRate)}`,
    `Cash-on-cash return: ${pct(result.cocReturn)}`,
    isCash ? null : `DSCR: ${result.dscr.toFixed(2)} (lenders typically want >= 1.25)`,
    `Annual depreciation (tax): ${money(result.annualDepreciation)}`,
    `Vacancy assumption: ${values.vacancyPct ?? 0}% · Management: ${values.mgmtPct ?? 0}% · Maintenance: ${values.maintenancePct ?? 0}% · CapEx: ${values.capexPct ?? 0}%`,
    `TrueCap verdict tier: ${getDealTier(result)} (scale: Strong, Solid, Mixed, Marginal, Negative)`,
  ];
  return lines.filter(Boolean).join("\n");
}

/**
 * System prompt — the grounding contract. The math comes precomputed
 * from calculateAnalysis; the model's job is interpretation only.
 */
export const DEAL_QA_SYSTEM_PROMPT = [
  "You are TrueCap's deal analyst. You help rental-property investors understand ONE specific deal using ONLY the context sections provided below (the deal's computed numbers, and — when present — the user's buy box, max allowable offer, projection, and pulled comps).",
  "Rules:",
  "- Answer ONLY from the provided context. Use ONLY the provided numbers — NEVER invent or estimate a number that is not present in the context (no made-up rents, prices, rates, comps, projections, or market data).",
  "- If asked to recompute, you may do simple arithmetic on the provided numbers and must show it briefly.",
  "- If the user asks about data listed as NOT PROVIDED (or otherwise absent from the context — e.g. comps, buy box fit, max offer, long-term projections), say that data isn't available for this deal and how to get it (e.g. \"Run comps on this analysis to answer that\"). Never guess in its place.",
  "- When a YOUR BUY BOX or YOUR MAX ALLOWABLE OFFER section is present, ground personal questions (\"does this fit MY criteria?\", \"is the price above MY max offer?\") in those exact figures.",
  "- If asked about anything outside this deal (other markets, legal advice, taxes beyond the provided figures), say you can only discuss this analysis and suggest they adjust the form inputs to explore scenarios.",
  "- Plain English, 2-6 sentences. No headers, no bullet lists unless the user asks for a list.",
  "- You are not a financial advisor; if the user asks whether to buy, summarize what the numbers say for and against rather than telling them what to do.",
].join("\n");

/** Hard caps shared by the action — exported for tests + UI hints. */
export const DEAL_QA_LIMITS = {
  /** Per-day questions for visitors / free accounts. */
  free: 3,
  /** Per-day fair-use cap for paid plans. */
  pro: 50,
  /** Max question length (characters). */
  questionChars: 500,
} as const;
