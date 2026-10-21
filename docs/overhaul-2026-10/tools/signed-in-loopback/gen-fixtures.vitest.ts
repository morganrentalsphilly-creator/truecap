/**
 * Builds the loopback stand-in's fixtures through the real engine, the way a
 * save does: calculateAnalysis + the Deal score (recomputeSavedDealVerdict),
 * then the Offer Ceiling captured with resolveOfferCeilingForAccess, recorded
 * at today's methodology version. One Pro user, eight saved deals.
 *
 *   npx vitest run -c docs/overhaul-2026-10/tools/signed-in-loopback/gen-fixtures.config.ts
 *
 * Named *.vitest.ts so `npm test` never picks it up; gen-fixtures.config.ts
 * runs it with the repo's aliases (`@/`, the server-only stub). Writes
 * fixtures.json beside this file (git-ignored). Every address starts with
 * "Fixture " and the user is a .invalid address; mock-supabase.mjs refuses
 * fixtures that break either rule.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { it } from "vitest";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";
import {
  recomputeSavedDealVerdict,
  toRecomputedSavedAnalysisSnapshot,
} from "@/lib/recompute-saved-deal-verdict";
import { resolveOfferCeilingForAccess } from "@/lib/offer-ceiling-server";
import { TRUECAP_UNDERWRITING_STANDARD_VERSION } from "@/lib/underwriting-methodology";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { MaoTarget } from "@/lib/max-allowable-offer";

const USER_ID = "00000000-0000-4000-8000-00000000e2e1";
// capture-signed-in.mjs signs in with these; keep the two in step.
const EMAIL = "internal-e2e@usetruecap.invalid";
const PASSWORD = "loopback-mock-password-0123456789";
const DAY = 86_400_000;

type Spec = {
  address: string;
  purchasePrice: number;
  monthlyRent: number;
  target: MaoTarget | null;
  downPaymentPct?: number;
  ageDays: number;
};

const specs: Spec[] = [
  { address: "Fixture 1 Elm St, Philadelphia, PA 19140", purchasePrice: 265_000, monthlyRent: 3_050, target: { monthlyCashFlow: 750, dscr: 1.25 }, ageDays: 1 },
  { address: "Fixture 2 Oak Ave, Pittsburgh, PA 15210", purchasePrice: 189_000, monthlyRent: 2_100, target: { monthlyCashFlow: 250, dscr: 1.25 }, ageDays: 2 },
  { address: "Fixture 3 Birch Ln, Cleveland, OH 44105", purchasePrice: 142_000, monthlyRent: 1_650, target: { monthlyCashFlow: 200, dscr: 1.2 }, ageDays: 3 },
  { address: "Fixture 4 Cedar Ct, Columbus, OH 43206", purchasePrice: 310_000, monthlyRent: 2_600, target: { monthlyCashFlow: 200, dscr: 1.25 }, ageDays: 5 },
  { address: "Fixture 5 Maple Dr, Indianapolis, IN 46201", purchasePrice: 175_000, monthlyRent: 2_250, target: { monthlyCashFlow: 300, dscr: 1.25 }, ageDays: 6 },
  // A long address, to show how a row wraps at 375.
  { address: "Fixture 6 Walnut Street Rowhomes, Unit 3B, Philadelphia, PA 19143", purchasePrice: 224_500, monthlyRent: 2_400, target: { capRate: 6, monthlyCashFlow: 150 }, ageDays: 8 },
  // A cash purchase: DSCR is N/A (CLAUDE.md §3.4).
  { address: "Fixture 7 Spruce Way, Baltimore, MD 21218", purchasePrice: 98_000, monthlyRent: 1_450, target: { capRate: 8 }, downPaymentPct: 100, ageDays: 10 },
  // No targets, so no Offer Ceiling.
  { address: "Fixture 8 Pine Rd, Akron, OH 44310", purchasePrice: 129_900, monthlyRent: 1_400, target: null, ageDays: 14 },
];

it("writes the fixtures", () => {
  const now = Date.now();
  const rows = specs.map((spec, i) => {
    if (!spec.address.startsWith("Fixture ")) {
      throw new Error(`fixture ${i + 1}: addresses start with "Fixture "`);
    }
    const values = {
      ...SAMPLE_DEAL_VALUES,
      address: spec.address,
      purchasePrice: spec.purchasePrice,
      monthlyRent: spec.monthlyRent,
      ...(spec.downPaymentPct != null ? { downPaymentPct: spec.downPaymentPct } : {}),
    } as InvestmentFormValues;
    const verdict = recomputeSavedDealVerdict(values);
    if (!verdict) throw new Error(`fixture ${i + 1} did not parse`);
    const result: Record<string, unknown> = toRecomputedSavedAnalysisSnapshot(verdict);
    if (spec.target) {
      result.maxOfferTarget = spec.target;
      result.maxOfferTargetSource = "selected-targets";
      const access = resolveOfferCeilingForAccess({
        values,
        target: spec.target,
        source: "selected-targets",
        paidAccess: true,
      });
      if (access.access !== "exact" || !access.exact) throw new Error(`fixture ${i + 1}: no exact ceiling`);
      result.offerCeilingExact = access.exact;
      const p = access.exact.presentation;
      console.log(spec.address, "price", spec.purchasePrice, "ceiling", p.ceiling, "gap", p.listPriceGap, verdict.recommendation, verdict.score);
    } else {
      console.log(spec.address, "no target", verdict.recommendation, verdict.score);
    }
    const at = new Date(now - spec.ageDays * DAY).toISOString();
    return {
      id: `00000000-0000-4000-8000-0000000000${String(i + 1).padStart(2, "0")}`,
      user_id: USER_ID,
      address: spec.address,
      title: spec.address,
      property_type: "single-family",
      purchase_price: spec.purchasePrice,
      net_cash_flow_monthly: verdict.netCashFlowMonthly,
      coc_return_pct: verdict.cocReturnPct,
      created_at: at,
      updated_at: at,
      methodology_version: TRUECAP_UNDERWRITING_STANDARD_VERSION,
      result_snapshot: result,
      form_snapshot: values,
      pipeline_stage: "analyzing",
      tags: [],
      data_confidence: null,
      client_id: null,
      deleted_at: null,
      is_completed: false,
      is_archived: false,
      close_date: null,
    };
  });

  const fixtures = {
    users: [{ id: USER_ID, email: EMAIL, password: PASSWORD }],
    tables: {
      profiles: [
        { id: USER_ID, first_name: "Sam", last_name: "Rivera", display_name: "Sam Rivera", avatar_url: null },
      ],
      plans: [
        {
          id: "plan-pro-monthly",
          slug: "pro_monthly",
          entitlements: {
            max_saved_deals: null,
            features: [
              "cash_flow", "save_deal", "dashboard_access", "compare_deals", "deal_score",
              "tax_strategy", "projections", "exit_scenarios", "template_manage", "pdf_export",
              "dashboard_insights", "custom_branding", "buy_box", "pipeline",
            ],
          },
        },
      ],
      subscriptions: [
        { id: "sub-1", user_id: USER_ID, plan_id: "plan-pro-monthly", status: "active", updated_at: new Date(now).toISOString() },
      ],
      saved_analyses: rows,
      user_buy_boxes: [],
      deal_due_diligence: [],
      deal_leads: [],
    },
  };
  const out = fileURLToPath(new URL("fixtures.json", import.meta.url));
  writeFileSync(out, JSON.stringify(fixtures, null, 2));
  console.log(`wrote ${out}`);
});
