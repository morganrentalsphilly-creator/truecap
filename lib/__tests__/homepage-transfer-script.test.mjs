import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertLocalUrl,
  evaluateBudgets,
  isLoopbackHostname,
  parseByteLimit,
} from "../../scripts/performance/homepage-transfer.mjs";

describe("local homepage transfer measurement", () => {
  it("accepts loopback targets and rejects external services", () => {
    expect(isLoopbackHostname("localhost")).toBe(true);
    expect(isLoopbackHostname("127.0.0.1")).toBe(true);
    expect(isLoopbackHostname("::1")).toBe(true);
    expect(assertLocalUrl("http://127.0.0.1:3100/").href).toBe(
      "http://127.0.0.1:3100/",
    );
    expect(() => assertLocalUrl("https://www.googleapis.com/")).toThrow(
      /Refusing non-loopback target/,
    );
  });

  it("supports explicit HTML and JavaScript byte budgets", () => {
    expect(parseByteLimit("900kb", "--max-js-bytes")).toBe(900 * 1024);
    expect(parseByteLimit("1.5mb", "--max-js-bytes")).toBe(1.5 * 1024 * 1024);

    const result = {
      rawHtmlBytes: 200_001,
      firstPartyJavaScript: { transferBytes: 800_001 },
      coreWebVitals: { lcpMs: 2_501, cls: 0.101 },
      hydration: { longTasks: { totalDurationMs: 501 } },
    };
    expect(
      evaluateBudgets(result, {
        maxHtmlBytes: 200_000,
        maxJsBytes: 800_000,
        maxLcpMs: 2_500,
        maxCls: 0.1,
        maxLongTaskMs: 500,
      }),
    ).toHaveLength(5);
  });

  it("blocks non-local browser requests and waits for analyzer hydration", () => {
    const source = readFileSync(
      join(process.cwd(), "scripts/performance/homepage-transfer.mjs"),
      "utf8",
    );
    expect(source).toContain('await context.route("**/*"');
    expect(source).toContain('route.abort("blockedbyclient")');
    expect(source).toContain("Network.setCacheDisabled");
    expect(source).toContain("Performance.getMetrics");
    expect(source).toContain('type: "layout-shift"');
    expect(source).toContain('type: "largest-contentful-paint"');
    expect(source).toContain('type: "longtask"');
    expect(source).toContain("new AxeBuilder({ page })");
    expect(source).toContain("horizontalOverflowPx");
    expect(source).toContain("heroAddressEntryAcceptsText");
    expect(source).toContain('[data-calculator-ready="true"]');
    expect(source).toContain(
      "result.coreWebVitals.firstContentfulPaintMs <= 0",
    );
    expect(source).toContain("result.coreWebVitals.lcpMs <= 0");
  });
});
