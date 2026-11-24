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
import { describe, expect, it, vi } from "vitest";

// The decision card mounts the share button, which reads the router.
vi.mock("next/navigation", () => ({
  usePathname: () => "/analyze",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { FocusedDecisionSummary } from "@/components/investcalc/focused-decision-summary";
import { ResultPriceScrubber } from "@/components/investcalc/result-price-scrubber";
import { SampleDecisionPrerender } from "@/components/investcalc/sample-decision-prerender";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { describeMaoTarget } from "@/lib/mao-targets";
import { buildOfferCeilingPresentation } from "@/lib/offer-ceiling";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import { calculateSampleDealOutcome } from "@/lib/sample-deal-analysis";
import {
  priceTrackDomain,
  trackLabelLeft,
  trackLabelsAnchored,
  trackLabelsFitNarrow,
} from "@/lib/price-track-domain";

const valueText = (p: number) => `$${p.toLocaleString("en-US")}: cash flow $600 a month`;

function render(
  price: number,
  deal: { asking?: number; ceiling?: number; gapStatedFromLg?: boolean } = {},
) {
  return renderToStaticMarkup(
    <ResultPriceScrubber
      asking={deal.asking ?? 265_000}
      ceiling={deal.ceiling ?? 236_000}
      price={price}
      onPriceChange={() => {}}
      valueText={valueText}
      compact
      gapStatedFromLg={deal.gapStatedFromLg}
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
    // The sr-only sentence states the gap at every width; the label row's
    // gap shows from 640px only (it would wrap the row on a phone).
    expect(html).toContain("Asking $265,000 is $29,000 above the Offer Ceiling $236,000.");
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

  it("sets each dimension label on its own tick when the prices are far enough apart", () => {
    const html = render(265_000);
    // The domain is $228,000 to $273,000: the ceiling at 8/45 of the line,
    // asking at 37/45, 64 points apart.
    const { pct } = priceTrackDomain(265_000, 236_000);
    expect(trackLabelsAnchored(pct(265_000), pct(236_000))).toBe(true);
    expect(html).toContain('<div class="relative h-4 tc-meta" aria-hidden="true">');
    // Each label is centred on its tick and held inside the track by half
    // its own width in ch ("Ceiling $236,000" is 16 characters, "Asking
    // $265,000" 15).
    expect(html).toContain(
      `<span class="absolute top-0 -translate-x-1/2 whitespace-nowrap text-highlight-text" style="left:${trackLabelLeft(pct(236_000), 16)}">Ceiling $236,000</span>`,
    );
    expect(html).toContain(
      `<span class="absolute top-0 -translate-x-1/2 whitespace-nowrap text-muted-foreground" style="left:${trackLabelLeft(pct(265_000), 15)}">Asking $265,000</span>`,
    );
    expect(trackLabelLeft(pct(236_000), 16)).toBe(`clamp(8ch, ${pct(236_000)}%, calc(100% - 8ch))`);
    // The gap measures the dashed segment: under the line, centred between
    // the two ticks, from 640px, with a line of its own on the root.
    expect(html).toContain(
      `<span aria-hidden="true" class="pointer-events-none absolute top-10 hidden -translate-x-1/2 whitespace-nowrap tc-meta text-highlight-text sm:block" style="left:${(pct(236_000) + pct(265_000)) / 2}%">Gap $29,000</span>`,
    );
    expect(html).toContain('class="relative mx-1 pb-0 sm:pb-7"');
    // Moved, the help line takes that space: no gap label, no reserved line.
    const moved = render(236_000);
    expect(moved).toContain('class="relative mx-1 pb-0"');
    expect(moved).toContain('<div class="relative h-4 tc-meta" aria-hidden="true">');
    // Six-figure labels clear each other on a 320px phone: no narrow fallback.
    expect(html).not.toContain("max-[360px]:");
  });

  it("places each label on its own tick when the ceiling is above asking", () => {
    const html = render(240_000, { asking: 240_000, ceiling: 270_000 });
    const { pct } = priceTrackDomain(240_000, 270_000);
    expect(html).toContain(`style="left:${trackLabelLeft(pct(270_000), 16)}">Ceiling $270,000</span>`);
    expect(html).toContain(`style="left:${trackLabelLeft(pct(240_000), 15)}">Asking $240,000</span>`);
    // Asking sits left of the ceiling on the line and comes first in the row.
    expect(html.indexOf("Asking $240,000")).toBeLessThan(html.indexOf("Ceiling $270,000"));
    expect(html).not.toContain("Gap ");
    expect(html).toContain("Asking $240,000 is within the Offer Ceiling $270,000.");
    expect(html).toContain('class="relative mx-1 pb-0"');
  });

  it("keeps the edge row when the ceiling is close to asking", () => {
    const html = render(265_000, { asking: 265_000, ceiling: 262_000 });
    const { pct } = priceTrackDomain(265_000, 262_000);
    expect(trackLabelsAnchored(pct(265_000), pct(262_000))).toBe(false);
    expect(html).toContain(
      '<div class="flex items-baseline justify-between gap-3 font-mono text-xs" aria-hidden="true">' +
        '<span class="text-highlight-text">Ceiling $262,000</span>' +
        '<span class="hidden text-muted-foreground sm:inline">Gap $3,000</span>' +
        '<span class="text-muted-foreground">Asking $265,000</span></div>',
    );
    expect(html).not.toContain("tc-meta");
    expect(html).toContain('class="relative mx-1 pb-0"');
    expect(html).toContain("Asking $265,000 is $3,000 above the Offer Ceiling $262,000.");
  });

  it("states the gap once per width when the card carries it from 1024px", () => {
    const anchored = render(265_000, { gapStatedFromLg: true });
    expect(anchored).toContain("sm:max-lg:block");
    expect(anchored).toContain('class="relative mx-1 pb-0 sm:max-lg:pb-7"');
    expect(anchored).not.toContain("sm:block");
    const close = render(265_000, { asking: 265_000, ceiling: 262_000, gapStatedFromLg: true });
    expect(close).toContain('<span class="hidden text-muted-foreground sm:max-lg:inline">Gap $3,000</span>');
  });

  it("sends a seven-figure pair back to the row's ends below 360px", () => {
    const html = render(1_400_000, { asking: 1_400_000, ceiling: 1_250_000 });
    expect(trackLabelsFitNarrow("Ceiling $1,250,000".length, "Asking $1,400,000".length)).toBe(false);
    expect(trackLabelsFitNarrow("Ceiling $236,000".length, "Asking $265,000".length)).toBe(true);
    expect(html).toContain("relative h-4 tc-meta max-[360px]:flex max-[360px]:h-auto");
    expect(html).toContain("whitespace-nowrap max-[360px]:static max-[360px]:translate-x-0 max-[360px]:whitespace-normal text-highlight-text");
    // The ceiling is the left label, so it is first in the fallback row.
    expect(html.indexOf("Ceiling $1,250,000")).toBeLessThan(html.indexOf("Asking $1,400,000"));
  });

  it("marks the meets-range for the reveal's draw, from its left end", () => {
    const html = render(265_000);
    expect(html).toContain('data-meets-fill=""');
    expect(html).toContain("left-0 h-2 origin-left -translate-y-1/2 bg-highlight/85");
  });

  it("the server-rendered sample draws the same labels through the same helpers", () => {
    const prerender = readFileSync(
      join(process.cwd(), "components/investcalc/sample-decision-prerender.tsx"),
      "utf8",
    );
    for (const shared of [
      "PRICE_TRACK_LABEL_CLASS as LABEL",
      "trackLabelsAnchored(pct(asking), pct(ceiling))",
      "trackLabelLeft(pct(at), text.length)",
      "LABEL.gapUntilLg",
      "LABEL.gapRoomUntilLg",
      'data-meets-fill=""',
      "left-0 h-2 origin-left -translate-y-1/2 bg-highlight/85",
    ]) {
      expect(prerender, shared).toContain(shared);
    }
  });

  it("the sample's static track and the live track at rest are the same markup (one-paint swap)", () => {
    const asking = Number(SAMPLE_DEAL_FIXTURE.values.purchasePrice);
    const ceiling = calculateSampleDealOutcome().maxOffer!.maxPrice;
    const live = renderToStaticMarkup(
      <ResultPriceScrubber
        asking={asking}
        ceiling={ceiling}
        price={asking}
        onPriceChange={() => {}}
        valueText={valueText}
        compact
        gapStatedFromLg
      />,
    );
    const staticCard = renderToStaticMarkup(<SampleDecisionPrerender />);
    // The root and its reserved line, the label row with both labels, the
    // meets-range and the gap under the line: byte for byte.
    const root = /<div class="(relative mx-1 pb-0[^"]*)"/.exec(live)?.[1];
    expect(root).toBe("relative mx-1 pb-0 sm:max-lg:pb-7");
    expect(staticCard).toContain(`<div class="${root}">`);
    const row = /<div class="relative h-4 tc-meta" aria-hidden="true">.*?<\/div>/.exec(live)?.[0];
    expect(row).toBeDefined();
    expect(staticCard).toContain(row);
    const fill = /<span aria-hidden="true" data-meets-fill="" class="([^"]*)" style="([^"]*)">/.exec(live);
    expect(fill).not.toBeNull();
    expect(staticCard).toContain(`<span data-meets-fill="" class="${fill![1]}" style="${fill![2]}">`);
    const gapLabel = /<span aria-hidden="true" class="pointer-events-none[^>]*>Gap [^<]*<\/span>/.exec(live)?.[0];
    expect(gapLabel).toBeDefined();
    expect(staticCard).toContain(gapLabel);
  });

  it("the sample's static ceiling row and the live card's are the same markup (one-paint swap)", () => {
    const { analysis, maxOffer } = calculateSampleDealOutcome();
    const values = SAMPLE_DEAL_FIXTURE.values;
    const target = SAMPLE_DEAL_FIXTURE.maoTarget;
    const live = renderToStaticMarkup(
      <FocusedDecisionSummary
        values={values}
        result={analysis}
        offerCeiling={buildOfferCeilingPresentation({ values, result: maxOffer!, source: "selected-targets" })}
        target={target}
        targetLabel={describeMaoTarget(target)}
        targetSource="selected-targets"
        targetAdopted
        canShowPriceCeiling
        canTunePriceCeiling
        onExportPdf={vi.fn()}
        onTargetChange={vi.fn()}
        onAdoptTarget={vi.fn()}
        onTuneTargetsOpened={vi.fn()}
        onEditAssumptions={vi.fn()}
        onSave={vi.fn()}
        onCompareDeals={vi.fn()}
        onAnalyzeAnotherLikeThis={vi.fn()}
        onNewAnalysis={vi.fn()}
        onUpgrade={vi.fn()}
        isSaving={false}
        isAuthenticated={false}
      />,
    );
    const staticCard = renderToStaticMarkup(<SampleDecisionPrerender />);
    // The row under the 2px rule: the label, the figure and, from 1024px,
    // the gap and asking beside it. Up to the track's wrapper.
    const rowOf = (html: string) => {
      const start = html.indexOf('<div class="lg:grid');
      return html.slice(start, html.indexOf('<div class="sm:mt-2"', start));
    };
    expect(rowOf(staticCard)).toContain('data-ceiling-readout=""');
    const ceiling = "$" + maxOffer!.maxPrice.toLocaleString("en-US");
    // The live figure mounts its roll-in at $0 on the server; the box is the
    // same component with the same classes.
    expect(rowOf(live).replaceAll(">$0<", ">" + ceiling + "<")).toBe(rowOf(staticCard));
    // 38px on a phone, 54px from 1024px; one figure at the second step.
    expect(rowOf(live)).toContain(
      "font-display text-key-sm text-foreground [overflow-wrap:anywhere] max-[250px]:text-3xl sm:mt-1 lg:text-key",
    );
    expect(rowOf(live).match(/text-key-sm/g)).toHaveLength(2);
    // Re-anchored: focused-decision-summary.tsx — the readout is the grid's
    // second column (QA DC-01, DC-02): the gap in graphite and asking to its
    // right on the ceiling's baseline, where it was a highlight-text
    // paragraph on `mt-auto` with asking stacked under it.
    expect(rowOf(live)).toContain(
      '<div class="lg:grid lg:grid-cols-[minmax(max-content,5fr)_minmax(0,7fr)] lg:items-baseline lg:gap-x-10">' +
        '<div class="min-w-0 lg:contents">',
    );
    expect(rowOf(live)).toContain(
      '<div class="hidden lg:contents" data-ceiling-readout="">' +
        '<p class="text-sm font-semibold text-foreground lg:col-start-2 lg:row-start-1">Gap</p>' +
        '<p class="flex min-w-0 flex-wrap items-baseline gap-x-4 lg:col-start-2 lg:row-start-2">' +
        '<span class="font-display font-figure text-key-sm text-foreground">$29,000</span>' +
        '<span class="text-sm text-muted-foreground">Asking <span class="font-figure font-semibold text-foreground">$265,000</span></span>' +
        "</p></div>",
    );
    // The stroke is the row's one warm mark; the phone's gap label is set in
    // the track labels' metadata face.
    expect(rowOf(live)).not.toContain("text-highlight-text");
    expect(rowOf(live)).toContain('<span class="tc-meta text-muted-foreground sm:hidden">Gap $29,000</span>');
    // The sentences under the track are 14px from 640px in both cards.
    for (const cls of [
      '<p class="mt-1 text-xs leading-relaxed text-foreground sm:text-sm">Targets: ',
      '<p class="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">The highest price that still meets the criteria shown.</p>',
    ]) {
      expect(live, cls).toContain(cls);
      expect(staticCard, cls).toContain(cls);
    }
  });

  it("a deal at or under its ceiling states no gap and keeps the single column", () => {
    const { maxOffer } = calculateSampleDealOutcome();
    const target = SAMPLE_DEAL_FIXTURE.maoTarget;
    const ceiling = maxOffer!.maxPrice;
    const at = (purchasePrice: number) => {
      const values = { ...SAMPLE_DEAL_FIXTURE.values, purchasePrice };
      return renderToStaticMarkup(
        <FocusedDecisionSummary
          values={values}
          result={calculateAnalysis(values)}
          offerCeiling={buildOfferCeilingPresentation({ values, result: maxOffer!, source: "selected-targets" })}
          target={target}
          targetLabel={describeMaoTarget(target)}
          targetSource="selected-targets"
          targetAdopted
          canShowPriceCeiling
          canTunePriceCeiling
          onExportPdf={vi.fn()}
          onTargetChange={vi.fn()}
          onAdoptTarget={vi.fn()}
          onTuneTargetsOpened={vi.fn()}
          onEditAssumptions={vi.fn()}
          onSave={vi.fn()}
          onCompareDeals={vi.fn()}
          onAnalyzeAnotherLikeThis={vi.fn()}
          onNewAnalysis={vi.fn()}
          onUpgrade={vi.fn()}
          isSaving={false}
          isAuthenticated={false}
        />,
      );
    };
    for (const price of [ceiling, ceiling - 20_000]) {
      const html = at(price);
      // The track is drawn (the exact ceiling is shown), with no gap on it.
      expect(html, String(price)).toContain('data-result-price-scrubber=""');
      expect(html, String(price)).not.toContain("data-ceiling-readout");
      expect(html, String(price)).not.toContain("lg:grid lg:grid-cols-[minmax(max-content");
      expect(html, String(price)).not.toContain("lg:contents");
      expect(html, String(price)).not.toContain(">Gap");
    }
    // A dollar above it, the readout is back.
    expect(at(ceiling + 1_000)).toContain('data-ceiling-readout=""');
  });

  it("anchors the labels only when they clear each other on a 320px phone", () => {
    // QA DC-04: a $7,500 gap put the ticks 99px apart on the 238px track,
    // where two six-figure labels need 112px between centres.
    const near = priceTrackDomain(320_000, 312_500);
    expect(trackLabelsAnchored(near.pct(320_000), near.pct(312_500))).toBe(false);
    const clear = priceTrackDomain(323_000, 312_500);
    expect(trackLabelsAnchored(clear.pct(323_000), clear.pct(312_500))).toBe(true);
  });

  it("returns focus to the handle when 'Back to asking' removes itself", () => {
    const source = readFileSync(
      join(process.cwd(), "components/investcalc/result-price-scrubber.tsx"),
      "utf8",
    );
    expect(source).toContain("ref={thumbRef}");
    expect(source).toContain("thumbRef.current?.focus();");
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
