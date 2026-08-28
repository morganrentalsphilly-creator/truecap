import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  reportModeAllowedForAuthority,
  type PdfReportAuthority,
} from "@/lib/pdf-report-mode-access";
import type { ReportMode } from "@/lib/pdf-export-constants";

const ROOT = process.cwd();
const action = readFileSync(
  join(ROOT, "app/actions/generate-report-pdf.ts"),
  "utf8",
);

describe("PDF report-mode authority", () => {
  const dealBoundAuthorities: PdfReportAuthority[] = [
    "anonymous_grant",
    "one_time_claim",
    "metered_evaluation",
  ];

  it.each(dealBoundAuthorities)(
    "restricts %s to the personal decision memo",
    (authority) => {
      expect(
        reportModeAllowedForAuthority({ mode: "personal", authority }),
      ).toBe(true);
      for (const mode of ["lender", "partner", "agent"] as ReportMode[]) {
        expect(reportModeAllowedForAuthority({ mode, authority })).toBe(false);
      }
    },
  );

  it("allows a PDF-entitled paid plan to publish personal, lender, and partner modes", () => {
    for (const mode of ["personal", "lender", "partner"] as ReportMode[]) {
      expect(
        reportModeAllowedForAuthority({ mode, authority: "paid_plan" }),
      ).toBe(true);
    }
  });

  it("requires both Agent Pro release and its agent-only entitlement for agent mode", () => {
    expect(
      reportModeAllowedForAuthority({
        mode: "agent",
        authority: "paid_plan",
        agentProReleased: true,
        hasAgentEntitlement: true,
      }),
    ).toBe(true);
    for (const [agentProReleased, hasAgentEntitlement] of [
      [false, false],
      [false, true],
      [true, false],
    ] as const) {
      expect(
        reportModeAllowedForAuthority({
          mode: "agent",
          authority: "paid_plan",
          agentProReleased,
          hasAgentEntitlement,
        }),
      ).toBe(false);
    }
  });
});

describe("generateReportPdfAction mode-security wiring", () => {
  it("checks one-time and anonymous authorities against the mode policy", () => {
    expect(action).toContain('authority: "one_time_claim"');
    expect(action).toContain('authority: "anonymous_grant"');
    expect(action.indexOf('authority: "one_time_claim"')).toBeLessThan(
      action.indexOf("await claimGrantsExport("),
    );
  });

  it("honors the exact anonymous grant before branching on authentication", () => {
    const grantCheck = action.indexOf(
      "await activeAnonymousDecisionGrantMatches(input.values)",
    );
    expect(grantCheck).toBeGreaterThan(-1);
    expect(grantCheck).toBeLessThan(action.indexOf("if (!user)"));
    expect(
      action.match(/activeAnonymousDecisionGrantMatches\(input\.values\)/g),
    ).toHaveLength(1);
  });

  it("keeps alternate modes behind paid-plan and Agent Pro server checks", () => {
    expect(action).toContain('hasPlanFeature(entitlements, "pdf_export")');
    expect(action).toContain("agentProReleased: isAgentProConfigured()");
    expect(action).toContain(
      'hasAgentEntitlement: hasPlanFeature(entitlements, "client_buy_box")',
    );
    expect(action.indexOf('authority: "paid_plan"')).toBeLessThan(
      action.indexOf('if (input.mode !== "personal")'),
    );
    expect(action.indexOf('if (input.mode !== "personal")')).toBeLessThan(
      action.indexOf("activeMeteredEvaluationDealGrantsAccess("),
    );
  });
});
