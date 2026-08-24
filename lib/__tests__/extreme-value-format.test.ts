import { describe, expect, it } from "vitest";
import {
  EXTREME_ROI_ANNUALIZED_PCT,
  EXTREME_ROI_CUMULATIVE_PCT,
  formatRoiHeadline,
  isExtremeAnnualizedRoi,
  isExtremeCumulativeRoi,
} from "@/lib/extreme-value-format";

describe("extreme-value-format thresholds", () => {
  it("derives the cumulative band from the deal-score top band (>15%/yr ≈ 300% over 10 yrs)", () => {
    // 1.15^10 − 1 ≈ 304.6% — the constant must sit at/just under that,
    // so nothing the Deal Score can still distinguish gets framed.
    const topBandCumulative = (Math.pow(1 + EXTREME_ROI_ANNUALIZED_PCT / 100, 10) - 1) * 100;
    expect(EXTREME_ROI_CUMULATIVE_PCT).toBeLessThanOrEqual(topBandCumulative);
    expect(EXTREME_ROI_CUMULATIVE_PCT).toBeGreaterThan(topBandCumulative - 10);
  });

  it("flags cumulative values strictly above the band", () => {
    expect(isExtremeCumulativeRoi(EXTREME_ROI_CUMULATIVE_PCT)).toBe(false); // at the band = sane
    expect(isExtremeCumulativeRoi(EXTREME_ROI_CUMULATIVE_PCT + 0.1)).toBe(true);
    expect(isExtremeCumulativeRoi(673)).toBe(true); // the live Decision Center finding
    expect(isExtremeCumulativeRoi(128.5)).toBe(false);
    expect(isExtremeCumulativeRoi(-95)).toBe(false); // losses are never "extreme upside"
  });

  it("never flags null / undefined / NaN / Infinity", () => {
    expect(isExtremeCumulativeRoi(null)).toBe(false);
    expect(isExtremeCumulativeRoi(undefined)).toBe(false);
    expect(isExtremeCumulativeRoi(Number.NaN)).toBe(false);
    expect(isExtremeCumulativeRoi(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("flags annualized values strictly above the matching per-year band", () => {
    expect(isExtremeAnnualizedRoi(EXTREME_ROI_ANNUALIZED_PCT)).toBe(false);
    expect(isExtremeAnnualizedRoi(EXTREME_ROI_ANNUALIZED_PCT + 0.1)).toBe(true);
    expect(isExtremeAnnualizedRoi(22.7)).toBe(true); // ≈673% cumulative, annualized
    expect(isExtremeAnnualizedRoi(10)).toBe(false);
    expect(isExtremeAnnualizedRoi(null)).toBe(false);
  });
});

describe("formatRoiHeadline — sane values keep plain formatting", () => {
  it("formats with one decimal by default", () => {
    const h = formatRoiHeadline(128.54);
    expect(h).toEqual({ extreme: false, text: "128.5%", raw: "128.5%" });
  });

  it("respects decimals and signed options", () => {
    expect(formatRoiHeadline(42.4, { decimals: 0 }).text).toBe("42%");
    expect(formatRoiHeadline(42.4, { signed: true }).text).toBe("+42.4%");
    expect(formatRoiHeadline(-12.3, { signed: true }).text).toBe("-12.3%");
  });

  it("never renders a signed or negative zero", () => {
    expect(formatRoiHeadline(0, { signed: true }).text).toBe("0.0%");
    expect(formatRoiHeadline(-0.04, { decimals: 1 }).text).toBe("0.0%");
  });

  it("returns nullText for missing values", () => {
    expect(formatRoiHeadline(null).text).toBe("-");
    expect(formatRoiHeadline(undefined, { nullText: "—" }).text).toBe("—");
    expect(formatRoiHeadline(Number.NaN).text).toBe("-");
    expect(formatRoiHeadline(null).extreme).toBe(false);
    expect(formatRoiHeadline(null).title).toBeUndefined();
  });

  it("has no title for sane values (nothing to caution about)", () => {
    expect(formatRoiHeadline(250).title).toBeUndefined();
  });
});

describe("formatRoiHeadline — extreme values lead with the caution", () => {
  it("frames 673% (the live finding) instead of celebrating it", () => {
    const h = formatRoiHeadline(673.0);
    expect(h.extreme).toBe(true);
    expect(h.text).toBe(`>${EXTREME_ROI_CUMULATIVE_PCT}% — verify assumptions`);
    expect(h.text).not.toContain("673"); // the headline never leads with the number
  });

  it("keeps the raw number reachable on raw and title", () => {
    const h = formatRoiHeadline(673.0);
    expect(h.raw).toBe("673.0%");
    expect(h.title).toContain("673.0%");
    expect(h.title).toContain("highly sensitive");
    expect(h.title).toContain("not an investment recommendation");
    expect(h.title).not.toMatch(/usually mean|input is off/i);
  });

  it("compact form for tight cells is just the framed band", () => {
    const h = formatRoiHeadline(992.3, { compact: true });
    expect(h.text).toBe(`>${EXTREME_ROI_CUMULATIVE_PCT}%`);
    expect(h.title).toContain("992.3%");
  });

  it("keeps signed/decimals options on the raw figure", () => {
    const h = formatRoiHeadline(673.04, { decimals: 0, signed: true });
    expect(h.raw).toBe("+673%");
  });

  it("stays sane exactly at the band boundary", () => {
    const h = formatRoiHeadline(EXTREME_ROI_CUMULATIVE_PCT);
    expect(h.extreme).toBe(false);
    expect(h.text).toBe(`${EXTREME_ROI_CUMULATIVE_PCT}.0%`);
  });
});
