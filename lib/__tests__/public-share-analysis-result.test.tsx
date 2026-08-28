import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReadOnlyAnalysisView } from "@/components/investcalc/read-only-analysis-view";
import { calculateAnalysis, type AnalysisResult } from "@/lib/calc-analysis";
import { FEATURE_CATALOG } from "@/lib/entitlements-catalog";
import {
  buildPublicShareAnalysisPayload,
  PUBLIC_SHARE_CORE_RESULT_FIELDS,
} from "@/lib/public-share-analysis-result";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const result = calculateAnalysis(SAMPLE_DEAL_VALUES);
const KNOWN_PAID_RESULT_FIELDS = [
  "taxSavingsMonthly",
  "afterTaxCF",
  "annualDepreciation",
  "yearlyInterestSchedule",
  "effectiveTaxRate",
  "tenYearProjectionVersion",
  "tenYearProjection",
  "taxStrategyYears",
] as const satisfies readonly (keyof AnalysisResult)[];

function renderPublicResult(includePaidAnalysis: boolean) {
  return renderToStaticMarkup(
    <ReadOnlyAnalysisView
      values={SAMPLE_DEAL_VALUES}
      analysis={buildPublicShareAnalysisPayload(result, includePaidAnalysis)}
      comps={null}
      addressIncluded={false}
      recordedResult
    />,
  );
}

describe("public share analysis result boundary", () => {
  beforeEach(() => router.push.mockClear());

  it("serializes only explicitly approved core fields for a free result", () => {
    const core = buildPublicShareAnalysisPayload(result, false);
    const serialized = JSON.stringify(core);

    expect(core.access).toBe("core");
    for (const field of KNOWN_PAID_RESULT_FIELDS) {
      expect(Object.prototype.hasOwnProperty.call(core.result, field)).toBe(
        false,
      );
      expect(serialized).not.toContain(`"${field}"`);
      expect(Object.prototype.hasOwnProperty.call(result, field)).toBe(true);
    }
    expect(Object.keys(core.result).sort()).toEqual(
      Object.keys(result)
        .filter(
          (field) =>
            !(KNOWN_PAID_RESULT_FIELDS as readonly string[]).includes(field),
        )
        .sort(),
    );
    expect(Object.keys(core.result).sort()).toEqual(
      PUBLIC_SHARE_CORE_RESULT_FIELDS.filter((field) =>
        Object.prototype.hasOwnProperty.call(result, field),
      ).sort(),
    );
    for (const field of PUBLIC_SHARE_CORE_RESULT_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(result, field)) {
        expect(core.result[field]).toEqual(result[field]);
      }
    }
    expect(core.result.netCashFlow).toBe(result.netCashFlow);
    expect(core.result.capRate).toBe(result.capRate);
  });

  it("fails closed when a future enumerable paid field appears", () => {
    const futureResult = {
      ...result,
      futurePaidProjection: {
        exitValue: 987_654,
        privateTaxDetail: "must stay server-side",
      },
    } as AnalysisResult & {
      futurePaidProjection: {
        exitValue: number;
        privateTaxDetail: string;
      };
    };

    const core = buildPublicShareAnalysisPayload(futureResult, false);
    const serialized = JSON.stringify(core);

    expect(core.access).toBe("core");
    expect(serialized).not.toContain("futurePaidProjection");
    expect(serialized).not.toContain("privateTaxDetail");
    expect(serialized).not.toContain("987654");
    expect(Object.keys(core.result).every((field) =>
      (PUBLIC_SHARE_CORE_RESULT_FIELDS as readonly string[]).includes(field),
    )).toBe(true);
  });

  it("does not even read an unknown future field while projecting a free result", () => {
    const futureResult = { ...result } as AnalysisResult & {
      futurePaidProjection?: unknown;
    };
    const futureFieldRead = vi.fn(() => ({ privateTaxDetail: true }));
    Object.defineProperty(futureResult, "futurePaidProjection", {
      enumerable: true,
      get: futureFieldRead,
    });

    expect(() => buildPublicShareAnalysisPayload(futureResult, false)).not.toThrow();
    expect(futureFieldRead).not.toHaveBeenCalled();
  });

  it("retains paid fields only in a server-authorized Pro payload", () => {
    const pro = buildPublicShareAnalysisPayload(result, true);
    const serialized = JSON.stringify(pro);

    expect(pro.access).toBe("pro");
    for (const field of KNOWN_PAID_RESULT_FIELDS) {
      expect(Object.prototype.hasOwnProperty.call(pro.result, field)).toBe(
        true,
      );
      expect(serialized).toContain(`"${field}"`);
    }
  });

  it("renders only the four core metrics for a free share", () => {
    const html = renderPublicResult(false);

    expect(html).toContain("Monthly Cash Flow");
    expect(html).toContain("CoC Return");
    expect(html).toContain("Cap Rate");
    expect(html).toContain("DSCR");
    expect(html).not.toContain("Illustrative Tax Effect");
    expect(html).not.toContain("Illustrative After-Tax CF");
    expect(html).not.toContain("Sensitivity analysis");
  });

  it("keeps tax, projection, and exit analysis out of the Free catalog", () => {
    for (const key of ["tax_strategy", "projections", "exit_scenarios"] as const) {
      expect(FEATURE_CATALOG[key].tiers).not.toContain("free");
      expect(FEATURE_CATALOG[key].tiers).toContain("pro");
      expect(FEATURE_CATALOG[key].tiers).toContain("agent_pro");
    }
  });

  it("keeps signed illustrative-tax tiles dark while tax strategy is unreleased", () => {
    const liabilityResult = {
      ...result,
      taxSavingsMonthly: -25,
      afterTaxCF: result.netCashFlow - 25,
    };
    const html = renderToStaticMarkup(
      <ReadOnlyAnalysisView
        values={SAMPLE_DEAL_VALUES}
        analysis={buildPublicShareAnalysisPayload(liabilityResult, true)}
        comps={null}
        addressIncluded={false}
        recordedResult
      />,
    );

    expect(html).not.toContain("Illustrative Tax Effect");
    expect(html).not.toContain("Estimated liability / month");
    expect(html).not.toContain("Illustrative After-Tax CF");
  });

  it("binds both public routes to the same server redaction builder", () => {
    for (const route of [
      "app/s/[token]/page.tsx",
      "app/d/[encoded]/page.tsx",
    ]) {
      const source = readFileSync(join(process.cwd(), route), "utf8");
      expect(source).toContain(
        "analysis={buildPublicShareAnalysisPayload(result, showProAnalysis)}",
      );
      expect(source).not.toContain("result={result}");
      expect(source).not.toContain("showProAnalysis={showProAnalysis}");
    }
  });
});
