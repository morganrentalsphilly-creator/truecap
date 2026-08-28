import { describe, expect, it } from "vitest";

import {
  dealHistoryDecisionLabel,
  dealHistoryStageLabel,
  normalizeDealHistoryText,
  parseSavedDealHistoryEvents,
} from "@/lib/deal-history";

describe("saved deal history model", () => {
  it("normalizes human context without inventing or truncating it", () => {
    expect(normalizeDealHistoryText("  Roof\n  replacement   cost  ")).toBe(
      "Roof replacement cost",
    );
    expect(normalizeDealHistoryText("   ")).toBeNull();
    expect(normalizeDealHistoryText(42)).toBeNull();
  });

  it("uses acquisition-language labels for the timeline", () => {
    expect(dealHistoryStageLabel("screening")).toBe("Screening");
    expect(dealHistoryStageLabel("analyzing")).toBe("Analyzing");
    expect(dealHistoryStageLabel("offer")).toBe("Offer made");
    expect(dealHistoryStageLabel("under_contract")).toBe(
      "Due diligence (under contract)",
    );
    expect(dealHistoryStageLabel("closed")).toBe("Closed");
    expect(dealHistoryStageLabel("passed")).toBe("Passed");
  });

  it("labels only explicit recorded decisions", () => {
    expect(dealHistoryDecisionLabel("undecided")).toBe(
      "No decision recorded",
    );
    expect(dealHistoryDecisionLabel("pursue")).toBe("Pursue");
    expect(dealHistoryDecisionLabel("negotiate")).toBe("Negotiate");
    expect(dealHistoryDecisionLabel("pass")).toBe("Pass");
  });

  it("parses only complete valid owner-scoped event rows", () => {
    expect(
      parseSavedDealHistoryEvents([
        {
          id: "event-1",
          old_stage: "analyzing",
          new_stage: "passed",
          decision_status: "pass",
          reason: "  Foundation risk  ",
          note: null,
          actor_user_id: "user-1",
          occurred_at: "2026-08-27T12:00:00.000Z",
        },
        {
          id: "event-invalid-stage",
          old_stage: "analyzing",
          new_stage: "maybe",
          decision_status: "undecided",
          actor_user_id: "user-1",
          occurred_at: "2026-08-27T12:00:00.000Z",
        },
      ]),
    ).toEqual([
      {
        id: "event-1",
        oldStage: "analyzing",
        newStage: "passed",
        decisionStatus: "pass",
        reason: "Foundation risk",
        note: null,
        actorUserId: "user-1",
        occurredAt: "2026-08-27T12:00:00.000Z",
      },
    ]);
  });
});
