import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A Free user changing a saved deal's status was told to "try again" forever.
 *
 * The Status control renders for everyone (saved-analyses-page-v2 branches on
 * canUsePipeline only to relabel it "Stage" vs "Status"), and
 * updateSavedDealLifecycleStateAction performs no entitlement check. It calls
 * update_saved_deal_stage_with_history, which raises 42501 "Pipeline
 * entitlement required." for any plan without the `pipeline` feature — Free
 * has exactly cash_flow / save_deal / dashboard_access, and the live database
 * confirms free.has_pipeline = false.
 *
 * persistSavedDealStageWithHistory handled MIGRATION_PENDING, P0002 and 22023
 * and then fell through to the generic "We couldn't complete that action.
 * Please try again." So the user confirmed a dialog, typed a Pass reason, and
 * was invited to retry an operation that can never succeed. The sibling
 * bulkUpdateSavedDealsAction already mapped 42501 correctly, which is what
 * makes this an oversight rather than a decision.
 */

const source = readFileSync(
  join(process.cwd(), "app/actions/saved-analyses.ts"),
  "utf8",
);

/** The error ladder inside persistSavedDealStageWithHistory. */
function stageErrorLadder(): string {
  const fn = source.indexOf("async function persistSavedDealStageWithHistory");
  expect(fn, "persistSavedDealStageWithHistory was renamed or removed").toBeGreaterThan(-1);
  const start = source.indexOf("if (error) {", fn);
  const end = source.indexOf("toServerErrorResult(error, \"saved-deal-history\")", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("a status change that cannot succeed says so", () => {
  it("maps 42501 before falling through to the generic retry message", () => {
    const ladder = stageErrorLadder();
    expect(
      ladder,
      "42501 must be handled ABOVE toServerErrorResult, or the user is told to retry forever",
    ).toContain('error.code === "42501"');
  });

  it("returns an entitlement code, not a generic server error", () => {
    const ladder = stageErrorLadder();
    const at = ladder.indexOf('error.code === "42501"');
    expect(ladder.slice(at, at + 260)).toContain("ENTITLEMENT_REQUIRED");
  });

  it("does not invite a retry that can never work", () => {
    const ladder = stageErrorLadder();
    const at = ladder.indexOf('error.code === "42501"');
    expect(ladder.slice(at, at + 260)).not.toMatch(/try again/i);
  });

  it("maps only the Passed Undo compare-and-set conflict to typed staleness", () => {
    const ladder = stageErrorLadder();
    const at = ladder.indexOf('error.code === "40001"');
    expect(at).toBeGreaterThan(-1);
    const branch = ladder.slice(Math.max(0, at - 80), at + 360);
    expect(branch).toContain(
      'input.expectedCurrentStage?.stage === "passed"',
    );
    expect(branch).toContain('code: "STALE_DATA"');
    expect(branch).toContain("latest stage was left unchanged");
  });

  it("stays consistent with the bulk path, which always mapped this", () => {
    // If bulk ever loses its mapping the two surfaces disagree about the same
    // database error, which is how this drifted apart in the first place.
    // Target the RPC CALL, not the first textual mention — that one is inside
    // the isDealHistoryMigrationPending regex, ~800 lines earlier, and slicing
    // from it made this assertion look broken when it was not.
    const bulk = source.indexOf('"bulk_archive_saved_deals_with_history",');
    expect(bulk, "the bulk RPC call site moved").toBeGreaterThan(-1);
    expect(source.slice(bulk, bulk + 1400)).toContain('error.code === "42501"');
  });
});
