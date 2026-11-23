import { describe, expect, it } from "vitest";
import {
  hasResultView,
  resultViewPath,
  resultViewTitle,
} from "@/lib/result-view-url";

describe("result view URL (audit A8)", () => {
  it("adds the flag and keeps every other parameter and the hash", () => {
    expect(resultViewPath("https://usetruecap.com/dashboard/new", true)).toBe(
      "/dashboard/new?view=result",
    );
    expect(
      resultViewPath("https://usetruecap.com/dashboard/new?savedDeal=abc#top", true),
    ).toBe("/dashboard/new?savedDeal=abc&view=result#top");
  });

  it("is idempotent", () => {
    const once = resultViewPath("/dashboard/new", true);
    expect(resultViewPath(once, true)).toBe(once);
  });

  it("removes only its own flag", () => {
    expect(resultViewPath("/dashboard/new?view=result", false)).toBe("/dashboard/new");
    expect(resultViewPath("/dashboard/new?savedDeal=abc&view=result", false)).toBe(
      "/dashboard/new?savedDeal=abc",
    );
    // Some other page's `view` value is not ours to remove.
    expect(resultViewPath("/dashboard/new?view=grid", false)).toBe(
      "/dashboard/new?view=grid",
    );
  });

  it("recognises the flag", () => {
    expect(hasResultView("/dashboard/new?view=result")).toBe(true);
    expect(hasResultView("/dashboard/new")).toBe(false);
    expect(hasResultView("/dashboard/new?view=grid")).toBe(false);
  });
});

describe("result view title (audit A8)", () => {
  it("names the property when the document has no third-party telemetry", () => {
    expect(resultViewTitle(" 12 Elm St, Philadelphia, PA ", true)).toBe(
      "12 Elm St, Philadelphia, PA analysis | TrueCap",
    );
  });

  it("never puts the address in the title of a telemetry document", () => {
    expect(resultViewTitle("12 Elm St, Philadelphia, PA", false)).toBe(
      "Analysis result | TrueCap",
    );
  });

  it("falls back to the generic title without an address", () => {
    expect(resultViewTitle("", true)).toBe("Analysis result | TrueCap");
    expect(resultViewTitle(null, true)).toBe("Analysis result | TrueCap");
  });
});
