/**
 * The result's what-if price (polish pass, 2026-10-20): the track the
 * decision card draws between the Offer Ceiling and asking is a slider. At
 * rest it sits at asking with the gap caption; moved, it names the what-if
 * price and offers the way back; the thumb carries its own aria-valuenow
 * (Radix cannot derive it on the server) and the caller's aria-valuetext.
 * The summary keys the what-if to the result it was made for, so a new run
 * retires it without an effect. Static markup, like the other result tests.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ResultPriceScrubber } from "@/components/investcalc/result-price-scrubber";

const valueText = (p: number) => `$${p.toLocaleString("en-US")}: cash flow $600 a month`;

function render(price: number) {
  return renderToStaticMarkup(
    <ResultPriceScrubber
      asking={265_000}
      ceiling={236_000}
      price={price}
      onPriceChange={() => {}}
      valueText={valueText}
      compact
    />,
  );
}

describe("ResultPriceScrubber", () => {
  it("rests at asking with the gap and exposes the slider's value", () => {
    const html = render(265_000);
    expect(html).toContain('role="slider"');
    expect(html).toContain('aria-valuenow="265000"');
    expect(html).toContain('aria-valuetext="$265,000: cash flow $600 a month"');
    expect(html).toContain('aria-valuemin="228000"');
    expect(html).toContain('aria-valuemax="273000"');
    expect(html).toContain("Gap $29,000");
    expect(html).not.toContain("Back to asking");
    expect(html).toContain('data-what-if="false"');
  });

  it("names the what-if price when moved and offers the way back to asking", () => {
    const html = render(236_000);
    expect(html).toContain("What if you offered $236,000");
    expect(html).toContain("Back to asking");
    expect(html).not.toContain("Gap $29,000");
    expect(html).toContain('data-what-if="true"');
    expect(html).toContain('aria-valuenow="236000"');
  });

  it("draws the hero's grammar: the highlight range to the ceiling, the ticks, the diamond handle", () => {
    const html = render(265_000);
    expect(html).toContain("bg-highlight/85");
    expect(html).toContain("border-dashed border-highlight-text");
    // The thumb is the diamond itself (the hero's handle); it fills on press.
    expect(html).toContain("size-5 rotate-45 cursor-grab rounded-none border-2 border-primary");
    expect(html).toContain("active:bg-primary");
    // The 44px pointer target is the slider root.
    expect(html).toContain("h-11 w-full touch-none");
  });

  it("the summary previews the engine at the what-if price and keys it to the result", () => {
    const source = readFileSync(
      join(process.cwd(), "components/investcalc/focused-decision-summary.tsx"),
      "utf8",
    );
    expect(source).toContain("calculateAnalysis({ ...values, purchasePrice: whatIfPrice })");
    expect(source).toContain("whatIf.forResult === result");
    expect(source).toContain("<ResultPriceScrubber");
    expect(source).not.toContain("<PriceTrack");
  });
});
