import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("no-card evaluation authorization boundaries", () => {
  const action = read("app/actions/product-evaluation.ts");
  const analyzer = read("components/investcalc/investcalc-page.tsx");
  const comparisonPage = read("app/dashboard/compare/page.tsx");
  const comparisonAction = read("app/actions/compare.ts");
  const comparisonClient = read("components/investcalc/compare-deals-client.tsx");
  const pdfAction = read("app/actions/generate-report-pdf.ts");
  const savedAnalysisAction = read("app/actions/saved-analyses.ts");
  const evaluationAccess = read("lib/evaluation-access-server.ts");
  const offerCeilingAction = read("app/actions/offer-ceiling.ts");
  const projectionsAction = read("app/actions/ten-year-projections.ts");
  const batchAction = read("app/actions/batch-triage.ts");
  const triagePage = read("app/dashboard/triage/page.tsx");
  const keyBuilder = read("lib/evaluation-resource-key.ts");
  const buyBoxAccess = read("lib/buy-box-access-server.ts");
  const buyBoxAction = read("app/actions/user-buy-boxes.ts");
  const myDealsPage = read("app/dashboard/saved-analyses/page.tsx");
  const myDealsClient = read("components/investcalc/saved-analyses-page-v2.tsx");
  const dealDetail = read("app/dashboard/saved-analyses/[id]/page.tsx");
  const dashboard = read("app/dashboard/page.tsx");
  const sharedBuyBox = read("components/investcalc/shared-deal-viewer-buy-box.tsx");
  const buyBoxCard = read("components/investcalc/buy-box-verdict-card.tsx");
  const migration = read(
    "supabase/migrations/20260827090000_no_card_product_evaluations.sql",
  );

  it("derives collision-resistant ledger keys on the server", () => {
    expect(keyBuilder).toContain('import "server-only"');
    expect(keyBuilder).toContain('createHash("sha256")');
    expect(action).toContain("buildEvaluationDealResourceKey(parsed.data.values)");
    expect(action).toContain(
      "buildEvaluationComparisonResourceKey(parsed.data.dealIds)",
    );
    expect(analyzer).toContain('kind: "deal",\n          values,');
    expect(analyzer).not.toContain("buildEvaluationDealResourceKey");
    expect(comparisonClient).not.toContain("consumeProductEvaluationUsageAction");
  });

  it("atomically consumes before publishing the selection cookie, never during a page GET", () => {
    const consume = comparisonAction.indexOf(
      "const usageError = await consumeComparisonSelection(selectedIds)",
    );
    const reject = comparisonAction.indexOf(
      "if (usageError) return usageError",
      consume,
    );
    const publish = comparisonAction.indexOf(
      "await setCompareCookie(selectedIds)",
      consume,
    );
    expect(consume).toBeGreaterThan(-1);
    expect(reject).toBeGreaterThan(consume);
    expect(publish).toBeGreaterThan(reject);
    expect(comparisonPage).toContain(
      "activeMeteredEvaluationComparisonGrantsAccess",
    );
    expect(comparisonPage).not.toContain("consumeProductEvaluationUsageAction");
  });

  it("serializes concurrent consumption and keeps retries idempotent", () => {
    expect(migration).toContain("for update;");
    expect(migration).toContain(
      "constraint product_evaluation_usage_once unique (user_id, kind, resource_key)",
    );
    const replayCheck = migration.indexOf("if exists (");
    const dealLimit = migration.indexOf(
      "current_deals >= evaluation.deal_limit",
    );
    expect(replayCheck).toBeGreaterThan(-1);
    expect(replayCheck).toBeLessThan(dealLimit);
  });

  it("binds evaluation PDFs to the same SHA-256 deal key and active ledger row", () => {
    expect(pdfAction).toContain("activeMeteredEvaluationDealGrantsAccess");
    expect(evaluationAccess).toContain("buildEvaluationDealResourceKey(values)");
    expect(evaluationAccess).toContain('.gt("expires_at", now.toISOString())');
    expect(evaluationAccess).toContain('.eq("kind", "deal")');
    expect(evaluationAccess).toContain('.eq("resource_key", resourceKey)');
    expect(keyBuilder).toContain("releasedInvestmentFormSchema.safeParse");
    expect(pdfAction).toContain("!input.savedExport");
    expect(savedAnalysisAction).toContain(
      "activeMeteredEvaluationDealGrantsAccess",
    );
    expect(analyzer).toMatch(
      /savedDealId\s*&&\s*!hasPendingDealChanges\s*\)/,
    );
  });

  it("requires an exact metered deal for evaluation Offer Ceiling and projections", () => {
    expect(offerCeilingAction).toContain(
      "activeMeteredEvaluationDealGrantsAccess",
    );
    expect(offerCeilingAction).not.toContain("canAnalyzeProDeal");
    expect(projectionsAction).toContain(
      "activeMeteredEvaluationDealGrantsAccess",
    );
    expect(projectionsAction).toContain(
      "const input = canonicalProjectionInput(values, calculateAnalysis(values))",
    );
    expect(projectionsAction).not.toContain(
      "buildTenYearProjection(request.input)",
    );
  });

  it("authorizes the exact projection resource before the service-role cache write", () => {
    const ownerRead = projectionsAction.indexOf('.from("saved_analyses")');
    const exactEvaluationCheck = projectionsAction.indexOf(
      "activeMeteredEvaluationDealGrantsAccess(supabase, user.id, values)",
    );
    const entitlementReject = projectionsAction.indexOf(
      "if (!paidProjectionAccess && !meteredEvaluationDeal)",
    );
    const adminClient = projectionsAction.indexOf(
      "const admin = createAdminSupabaseClient()",
    );
    const scopedPayload = projectionsAction.indexOf(
      "const upsertPayload = {",
      entitlementReject,
    );
    const cacheWrite = projectionsAction.indexOf(
      '.from("analysis_projection_snapshots")',
      adminClient,
    );

    expect(ownerRead).toBeGreaterThan(-1);
    expect(exactEvaluationCheck).toBeGreaterThan(ownerRead);
    expect(entitlementReject).toBeGreaterThan(exactEvaluationCheck);
    expect(scopedPayload).toBeGreaterThan(entitlementReject);
    expect(adminClient).toBeGreaterThan(entitlementReject);
    expect(cacheWrite).toBeGreaterThan(adminClient);

    const privilegedPayload = projectionsAction.slice(scopedPayload, adminClient);
    expect(privilegedPayload).toContain("analysis_id: analysisId");
    expect(privilegedPayload).toContain("user_id: user.id");
    const privilegedWrite = projectionsAction.slice(adminClient);
    expect(privilegedWrite).toContain(
      '.upsert(upsertPayload, { onConflict: "analysis_id" })',
    );
  });

  it("does not let the comparison allowance unlock paid-only batch screening", () => {
    expect(batchAction.match(/!hasPaidPlan \|\|/g)).toHaveLength(2);
    expect(triagePage).toContain("!isPremium ||");
  });

  it("binds every evaluation Buy Box verdict surface to an exact active resource", () => {
    expect(buyBoxAccess).toContain("getActiveMeteredEvaluationDealLedger");
    expect(myDealsPage).toContain("getBuyBoxAuthorizedDealIds");
    expect(myDealsPage).toContain("buyBoxAuthorizedDealIds={[...authorizedBuyBoxDealIds]}");
    expect(myDealsClient).toContain("buyBoxAuthorizedDealIdSet.has(item.id)");
    expect(dealDetail).toContain("activeMeteredEvaluationDealGrantsAccess");
    expect(dashboard).toContain("authorizedBuyBoxDealIds.has(deal.id)");
    expect(buyBoxAction).toContain("listBuyBoxesForDealAction");
    expect(buyBoxAction).toContain("activeMeteredEvaluationDealGrantsAccess");
    expect(sharedBuyBox).toContain("values={values}");
    expect(buyBoxCard).toContain("listBuyBoxesForDealAction(values)");
    expect(buyBoxAction).toContain("auth.hasPaidAccess");
  });

  it("loads the batch ledger only inside the active 21-day window", () => {
    expect(evaluationAccess).toContain(
      "export async function getActiveMeteredEvaluationDealLedger",
    );
    const batchReader = evaluationAccess.slice(
      evaluationAccess.indexOf(
        "export async function getActiveMeteredEvaluationDealLedger",
      ),
      evaluationAccess.indexOf(
        "export async function activeMeteredEvaluationDealGrantsAccess",
      ),
    );
    expect(batchReader).toContain('.gt("expires_at", now.toISOString())');
    expect(batchReader).toContain('.eq("kind", "deal")');
    expect(batchReader).toContain("active: false");
  });

  it("lets a live paid subscription bypass evaluation consumption", () => {
    const paidCheck = action.indexOf("hasPaidPlanSubscription(supabase, user.id)");
    const rpc = action.indexOf('.rpc("consume_product_evaluation_usage"');
    expect(paidCheck).toBeGreaterThan(-1);
    expect(rpc).toBeGreaterThan(paidCheck);
  });

  it("keeps the exact anonymous handoff additive to the three-deal evaluation", () => {
    const anonymousHandoff = action.indexOf(
      "activeAnonymousDecisionGrantMatches(parsed.data.values)",
    );
    const rpc = action.indexOf('.rpc("consume_product_evaluation_usage"');
    expect(anonymousHandoff).toBeGreaterThan(-1);
    expect(anonymousHandoff).toBeLessThan(rpc);
    expect(
      action.slice(anonymousHandoff, rpc),
    ).toContain('wasNewUsage: false');
    expect(action.slice(anonymousHandoff, rpc)).toContain("dealsUsed: 0");
  });
});
