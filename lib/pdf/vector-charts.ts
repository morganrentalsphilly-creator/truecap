/**
 * Pure-vector chart primitives for the investment PDF.
 *
 * WHY THIS EXISTS
 * ---------------
 * The report used to render its charts with chart.js onto an offscreen
 * <canvas>, then stamp the result in as an 800x420 PNG. That had two costs:
 *
 *   1. It welded PDF generation to a DOM. The whole report could therefore
 *      only be built in the browser, which meant the paid/Pro gate could only
 *      ever be enforced in the browser too — i.e. not really enforced.
 *   2. Raster charts are soft. A 800px-wide bitmap scaled into a ~515pt box
 *      and then printed at 300dpi is visibly fuzzy, and it bloats the file.
 *
 * Drawing the charts as real PDF vectors fixes both at once: it runs anywhere
 * jsPDF runs (Node included), the output is sharp at any zoom or print
 * resolution, and the bytes are a fraction of a PNG's.
 *
 * These helpers are deliberately NOT a general charting library. They cover
 * exactly the two chart types the report uses — grouped/floating bars and
 * multi-series lines — and nothing else. Keeping the surface small is what
 * makes them auditable.
 *
 * PURE PRESENTATION. Nothing here computes a financial figure; callers pass in
 * values that already came out of lib/calc-analysis.ts. A change in this file
 * must never change a number.
 */

import type { jsPDF } from "jspdf";

// ── Shared types ────────────────────────────────────────────────────────────

export type ChartPalette = {
  /** Axis labels and tick text. */
  sub: string;
  /** Gridlines. */
  grid: string;
  /** Axis rule + zero line. */
  axis: string;
  /** Value labels sitting on the data. */
  label: string;
};

export const DEFAULT_CHART_PALETTE: ChartPalette = {
  sub: "#64748B",
  grid: "#EEF2F7",
  axis: "#CBD5E1",
  label: "#334155",
};

export type ChartBox = { x: number; y: number; w: number; h: number };

/** A single bar. `from` makes it a floating (waterfall) bar. */
export type BarDatum = {
  label: string;
  value: number;
  /** Baseline the bar rises/falls from. Defaults to 0. */
  from?: number;
  color: string;
  /** Overrides the auto-formatted value label. Pass null to suppress it. */
  valueLabel?: string | null;
};

export type LineSeries = {
  label: string;
  values: number[];
  color: string;
  /** Soft tint under the line. */
  fill?: boolean;
  dashed?: boolean;
};

type AxisFormatter = (value: number) => string;

// ── Scale ───────────────────────────────────────────────────────────────────

/**
 * A "nice" axis: round tick steps (1/2/2.5/5 x 10^n) that bracket the data.
 *
 * Charting libraries do this so the y-axis reads 0 / 25K / 50K rather than
 * 0 / 23.7K / 47.4K. Reproduced here because losing it is the single most
 * obvious way a hand-rolled chart looks hand-rolled.
 */
export function niceScale(
  min: number,
  max: number,
  targetTicks = 5
): { min: number; max: number; step: number; ticks: number[] } {
  // Degenerate input (all-equal values, or a single zero) still needs an axis.
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    const centre = Number.isFinite(min) ? min : 0;
    const pad = Math.abs(centre) > 0 ? Math.abs(centre) * 0.5 : 1;
    min = centre - pad;
    max = centre + pad;
  }
  // Always show the zero baseline when the data straddles or approaches it —
  // a bar chart that crops zero misrepresents magnitude.
  if (min > 0) min = 0;
  if (max < 0) max = 0;

  const rawStep = (max - min) / Math.max(1, targetTicks);
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep) || 1)));
  const normalized = rawStep / magnitude;
  const niceNormalized =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  const step = niceNormalized * magnitude;

  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  // Accumulate with an index rather than `t += step` so float drift can't
  // produce a 4.999999999 tick label.
  const count = Math.round((niceMax - niceMin) / step);
  for (let i = 0; i <= count; i += 1) ticks.push(niceMin + i * step);

  return { min: niceMin, max: niceMax, step, ticks };
}

/** Compact money for a standalone value: 1_250_000 → "$1.3M", -4200 → "-$4.2K". */
export function formatAxisMoney(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  return `${sign}$${Math.round(abs)}`;
}

/**
 * A money formatter with ONE precision for a whole axis.
 *
 * formatAxisMoney decides per VALUE, so an axis spanning 10K printed
 * "$0 / $2.0K / $4.0K / $6.0K / $8.0K / $10K" — two different formats on one
 * ruler, which reads as a rendering bug. Deciding from the axis MAXIMUM makes
 * every tick agree.
 */
function axisMoneyFormatter(scale: { min: number; max: number }): AxisFormatter {
  const peak = Math.max(Math.abs(scale.min), Math.abs(scale.max));
  const unit = peak >= 1_000_000 ? 1_000_000 : peak >= 1_000 ? 1_000 : 1;
  const suffix = unit === 1_000_000 ? "M" : unit === 1_000 ? "K" : "";
  // One decimal only when the axis top needs it to stay distinguishable.
  const decimals = unit === 1 ? 0 : peak / unit >= 10 ? 0 : 1;
  return (value: number) => {
    // Zero has no magnitude to scale, and "$0.0K" reads like a rounding error.
    if (value === 0) return "$0";
    const sign = value < 0 ? "-" : "";
    const scaled = Math.abs(value) / unit;
    return `${sign}$${scaled.toFixed(decimals)}${suffix}`;
  };
}

// ── Internals ───────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const int = parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function setFill(doc: jsPDF, hex: string) {
  doc.setFillColor(...hexToRgb(hex));
}
function setStroke(doc: jsPDF, hex: string) {
  doc.setDrawColor(...hexToRgb(hex));
}
function setText(doc: jsPDF, hex: string) {
  doc.setTextColor(...hexToRgb(hex));
}

/**
 * Mix a colour toward white. Used for the tint under a filled line.
 *
 * jsPDF has no alpha channel without a graphics state, and GState support is
 * uneven across viewers — pre-mixing against the (always white) card gives the
 * same result everywhere.
 */
function tint(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Draw the y gridlines, y tick labels, and the axis rule. Returns the plot box. */
function drawGrid(
  doc: jsPDF,
  box: ChartBox,
  scale: ReturnType<typeof niceScale>,
  palette: ChartPalette,
  formatTick: AxisFormatter,
  gutterLeft: number
): ChartBox {
  const plot: ChartBox = {
    x: box.x + gutterLeft,
    y: box.y,
    w: box.w - gutterLeft,
    h: box.h,
  };
  const toY = (v: number) => plot.y + plot.h - ((v - scale.min) / (scale.max - scale.min)) * plot.h;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  // A compact money formatter rounds to whole dollars, so a sub-dollar tick
  // step renders "$1 / $1 / $0 / -$1 / -$1" — five gridlines wearing three
  // labels. Draw every gridline, but print a label only when it differs from
  // the one below it.
  let previousLabel: string | null = null;
  for (const tickValue of scale.ticks) {
    const y = toY(tickValue);
    const isZero = Math.abs(tickValue) < scale.step / 1000;
    setStroke(doc, isZero ? palette.axis : palette.grid);
    doc.setLineWidth(isZero ? 0.7 : 0.4);
    doc.line(plot.x, y, plot.x + plot.w, y);
    const label = formatTick(tickValue);
    if (label !== previousLabel) {
      setText(doc, palette.sub);
      doc.text(label, plot.x - 4, y + 2.2, { align: "right" });
      previousLabel = label;
    }
  }
  return plot;
}

/**
 * Place x labels left-to-right, skipping any that would touch the previous one.
 *
 * The earlier version dropped every nth label by a precomputed stride and then
 * force-kept the last one — which is exactly how "Debt Service" and "Net Cash
 * Flow" ended up printed on top of each other: the forced final label had no
 * idea what the stride had already placed beside it.
 *
 * Measuring as we go is both simpler and strictly better: dense axes thin
 * themselves out, sparse ones keep every label, and nothing ever overlaps.
 * The last label wins ties, because the end of a range is what a reader looks
 * for — so we lay out from the right when a collision would otherwise drop it.
 */
function drawXLabels(
  doc: jsPDF,
  plot: ChartBox,
  labels: string[],
  centers: number[],
  palette: ChartPalette
) {
  doc.setFont("helvetica", "normal");
  setText(doc, palette.sub);

  const GAP = 4;
  const fits = (size: number): boolean[] => {
    doc.setFontSize(size);
    const widths = labels.map((l) => doc.getTextWidth(l));
    const keep = new Array<boolean>(labels.length).fill(false);
    // Anchor on the last label, then walk backwards keeping whatever still
    // fits. The end of a range is what a reader looks for, so it wins ties.
    let nextLeftEdge = Infinity;
    for (let i = labels.length - 1; i >= 0; i -= 1) {
      const left = centers[i]! - widths[i]! / 2;
      const right = centers[i]! + widths[i]! / 2;
      if (right + GAP <= nextLeftEdge) {
        keep[i] = true;
        nextLeftEdge = left;
      }
    }
    return keep;
  };

  // On a CATEGORICAL axis every label names a distinct thing ("Debt Service"),
  // so dropping one leaves a bar anonymous. Shrink the type first and only
  // thin the labels if even the smallest size cannot fit them all. A dense
  // Y1..Y30 axis is the opposite case — there, thinning is correct and the
  // loop simply falls through to it at full size.
  const sizes = labels.length <= 6 ? [7.5, 7, 6.5, 6] : [7.5];
  let chosen = sizes[0]!;
  let keep = fits(chosen);
  for (const size of sizes) {
    const candidate = fits(size);
    chosen = size;
    keep = candidate;
    if (candidate.every(Boolean)) break;
  }

  doc.setFontSize(chosen);
  labels.forEach((label, i) => {
    if (!keep[i]) return;
    doc.text(label, centers[i]!, plot.y + plot.h + 11, { align: "center" });
  });
}

// ── Bar chart ───────────────────────────────────────────────────────────────

export type BarChartOptions = {
  box: ChartBox;
  data: BarDatum[];
  palette?: ChartPalette;
  /** Tick + value-label formatter. Defaults to compact money. */
  format?: AxisFormatter;
  /** Print a value above/below each bar. */
  showValues?: boolean;
  /** Width reserved for y tick labels. */
  gutterLeft?: number;
  /** Corner radius on bar tops. */
  radius?: number;
};

/**
 * Vertical bars, with optional floating baselines for a waterfall.
 *
 * Negative bars hang below the zero line and label below themselves, which is
 * how an investor expects to read a cash-flow chart.
 */
export function drawBarChart(doc: jsPDF, opts: BarChartOptions): void {
  const {
    box,
    data,
    palette = DEFAULT_CHART_PALETTE,
    format = formatAxisMoney,
    showValues = true,
    gutterLeft = 42,
    radius = 2,
  } = opts;
  if (data.length === 0) return;

  const lows = data.map((d) => Math.min(d.from ?? 0, d.value));
  const highs = data.map((d) => Math.max(d.from ?? 0, d.value));
  // Headroom so value labels never collide with the top gridline.
  const span = Math.max(...highs) - Math.min(...lows) || 1;
  const scale = niceScale(Math.min(...lows), Math.max(...highs) + (showValues ? span * 0.12 : 0));

  const tickFormat = format === formatAxisMoney ? axisMoneyFormatter(scale) : format;
  const plot = drawGrid(doc, box, scale, palette, tickFormat, gutterLeft);
  const toY = (v: number) => plot.y + plot.h - ((v - scale.min) / (scale.max - scale.min)) * plot.h;

  const slot = plot.w / data.length;
  // Cap bar width so a 3-bar chart doesn't render three giant slabs.
  const barW = Math.min(slot * 0.62, 46);
  const centers = data.map((_, i) => plot.x + slot * i + slot / 2);

  data.forEach((d, i) => {
    const base = d.from ?? 0;
    const yTop = toY(Math.max(base, d.value));
    const yBottom = toY(Math.min(base, d.value));
    // An EXACTLY-zero bar draws nothing. The 0.8pt floor exists so a tiny but
    // real value stays visible; applied to a true zero it painted a mark on
    // the baseline while the table directly below printed "$0", which reads as
    // the chart disagreeing with its own data.
    const isZeroBar = d.value === base;
    const height = isZeroBar ? 0 : Math.max(0.8, yBottom - yTop);
    const x = centers[i]! - barW / 2;

    setFill(doc, d.color);
    if (!isZeroBar) {
      if (radius > 0 && height > radius * 2) {
        doc.roundedRect(x, yTop, barW, height, radius, radius, "F");
      } else {
        doc.rect(x, yTop, barW, height, "F");
      }
    }

    if (showValues && d.valueLabel !== null) {
      const text = d.valueLabel ?? format(d.value);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      setText(doc, palette.label);
      // A descending bar labels below itself — but on a waterfall the last
      // step often bottoms out at the axis, where "below" lands on top of the
      // x-axis category labels. Flip such a label above the bar instead of
      // letting the two collide.
      const belowY = yBottom + 8;
      const floor = plot.y + plot.h;
      const placeBelow = d.value < base && belowY <= floor - 2;
      doc.text(text, centers[i]!, placeBelow ? belowY : yTop - 3.5, { align: "center" });
    }
  });

  drawXLabels(
    doc,
    plot,
    data.map((d) => d.label),
    centers,
    palette
  );
}

// ── Stacked bar chart ───────────────────────────────────────────────────────

export type StackSeries = { label: string; values: number[]; color: string };

export type StackedBarChartOptions = {
  box: ChartBox;
  labels: string[];
  series: StackSeries[];
  palette?: ChartPalette;
  format?: AxisFormatter;
  gutterLeft?: number;
  showLegend?: boolean;
};

/**
 * Bars segmented by series, stacked upward from zero.
 *
 * POSITIVE MAGNITUDES ONLY. Every caller in the report stacks components of a
 * total (operating expenses + interest + depreciation; sale proceeds +
 * profit), which are non-negative by construction — the profit series is
 * already clamped with Math.max(profit, 0) at the call site. A negative value
 * in a stack has no single agreed rendering, so rather than invent one we
 * clamp and keep the geometry honest: the drawn height always equals the
 * plotted magnitude.
 */
export function drawStackedBarChart(doc: jsPDF, opts: StackedBarChartOptions): void {
  const {
    box,
    labels,
    series,
    palette = DEFAULT_CHART_PALETTE,
    format = formatAxisMoney,
    gutterLeft = 42,
    showLegend = true,
  } = opts;
  if (series.length === 0 || labels.length === 0) return;

  let plotBox = box;
  if (showLegend) {
    drawLegend(doc, box, series, palette);
    plotBox = { ...box, y: box.y + 14, h: box.h - 14 };
  }

  const clamp = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);
  const totals = labels.map((_, i) => series.reduce((sum, s) => sum + clamp(s.values[i] ?? 0), 0));
  const scale = niceScale(0, Math.max(...totals, 0));
  const plot = drawGrid(doc, plotBox, scale, palette, format === formatAxisMoney ? axisMoneyFormatter(scale) : format, gutterLeft);
  const toY = (v: number) => plot.y + plot.h - ((v - scale.min) / (scale.max - scale.min)) * plot.h;

  const slot = plot.w / labels.length;
  const barW = Math.min(slot * 0.62, 46);
  const centers = labels.map((_, i) => plot.x + slot * i + slot / 2);

  labels.forEach((_, i) => {
    let running = 0;
    series.forEach((s) => {
      const value = clamp(s.values[i] ?? 0);
      if (value <= 0) return;
      const yTop = toY(running + value);
      const height = Math.max(0.6, toY(running) - yTop);
      setFill(doc, s.color);
      doc.rect(centers[i]! - barW / 2, yTop, barW, height, "F");
      running += value;
    });
  });

  drawXLabels(doc, plot, labels, centers, palette);
}

// ── Line chart ──────────────────────────────────────────────────────────────

export type LineChartOptions = {
  box: ChartBox;
  labels: string[];
  series: LineSeries[];
  palette?: ChartPalette;
  format?: AxisFormatter;
  gutterLeft?: number;
  /** Dot at each vertex. Off for dense series. */
  showPoints?: boolean;
  /** Legend row above the plot when there is more than one series. */
  showLegend?: boolean;
  /**
   * Print the final value at the end of each line.
   *
   * On a cumulative or equity curve the last point IS the answer the reader
   * came for, and making them trace it back to the axis is a needless step.
   */
  endpointLabel?: boolean;
};

export function drawLineChart(doc: jsPDF, opts: LineChartOptions): void {
  const {
    box,
    labels,
    series,
    palette = DEFAULT_CHART_PALETTE,
    format = formatAxisMoney,
    gutterLeft = 42,
    showPoints,
    showLegend = true,
    endpointLabel = false,
  } = opts;
  const live = series.filter((s) => s.values.length > 0);
  if (live.length === 0) return;

  let plotBox = box;
  if (showLegend && live.length > 1) {
    drawLegend(doc, box, live, palette);
    plotBox = { ...box, y: box.y + 14, h: box.h - 14 };
  }

  const all = live.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
  const scale = niceScale(Math.min(...all), Math.max(...all));
  const plot = drawGrid(doc, plotBox, scale, palette, format === formatAxisMoney ? axisMoneyFormatter(scale) : format, gutterLeft);
  const toY = (v: number) => plot.y + plot.h - ((v - scale.min) / (scale.max - scale.min)) * plot.h;

  const n = Math.max(...live.map((s) => s.values.length));
  // Inset so the first and last vertices aren't clipped by the plot edge.
  const inset = n > 1 ? Math.min(10, plot.w * 0.03) : 0;
  const usable = plot.w - inset * 2;
  const toX = (i: number) => plot.x + inset + (n > 1 ? (usable * i) / (n - 1) : usable / 2);

  const dots = showPoints ?? n <= 12;

  for (const s of live) {
    const points = s.values.map((v, i) => [toX(i), toY(v)] as const);
    if (points.length === 0) continue;

    if (s.fill && points.length > 1) {
      // Close the path along the zero line (or the axis floor) and fill.
      const floor = toY(Math.max(scale.min, 0));
      setFill(doc, tint(s.color, 0.86));
      const poly: [number, number][] = [
        [points[0]![0], floor],
        ...points.map((p) => [p[0], p[1]] as [number, number]),
        [points[points.length - 1]![0], floor],
      ];
      fillPolygon(doc, poly);
    }

    setStroke(doc, s.color);
    doc.setLineWidth(1.5);
    if (s.dashed) doc.setLineDashPattern([3, 2], 0);
    for (let i = 1; i < points.length; i += 1) {
      doc.line(points[i - 1]![0], points[i - 1]![1], points[i]![0], points[i]![1]);
    }
    if (s.dashed) doc.setLineDashPattern([], 0);

    if (dots) {
      setFill(doc, s.color);
      for (const [px, py] of points) doc.circle(px, py, 1.9, "F");
    }

    if (endpointLabel && points.length > 0) {
      const [lastX, lastY] = points[points.length - 1]!;
      const text = format(s.values[s.values.length - 1]!);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      const textW = doc.getTextWidth(text);
      // Prefer sitting above the endpoint; flip below if that would clip the
      // top of the plot, and pull left if it would run past the right edge.
      const above = lastY - 8 > plot.y + 8;
      const anchorX = Math.min(lastX, plot.x + plot.w - textW / 2 - 1);
      const baselineY = above ? lastY - 7 : lastY + 11;
      // A rising line passes straight through where its own end label wants to
      // sit, so knock out a white pill first. Without it the number is printed
      // on top of the stroke and is genuinely hard to read.
      setFill(doc, "#FFFFFF");
      doc.roundedRect(anchorX - textW / 2 - 2.5, baselineY - 6.2, textW + 5, 8.6, 2, 2, "F");
      setText(doc, s.color);
      doc.text(text, anchorX, baselineY, { align: "center" });
    }
  }

  drawXLabels(
    doc,
    plot,
    labels,
    labels.map((_, i) => toX(i)),
    palette
  );
}

/** jsPDF has no polygon primitive; `lines()` with relative deltas is the idiom. */
function fillPolygon(doc: jsPDF, points: [number, number][]): void {
  if (points.length < 3) return;
  const [start, ...rest] = points;
  const deltas: [number, number][] = [];
  let [cx, cy] = start!;
  for (const [px, py] of rest) {
    deltas.push([px - cx, py - cy]);
    cx = px;
    cy = py;
  }
  doc.lines(deltas, start![0], start![1], [1, 1], "F", true);
}

function drawLegend(
  doc: jsPDF,
  box: ChartBox,
  series: { label: string; color: string }[],
  palette: ChartPalette
): void {
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  let x = box.x;
  const y = box.y + 4;
  for (const s of series) {
    setFill(doc, s.color);
    doc.circle(x + 3, y - 2, 2.4, "F");
    setText(doc, palette.sub);
    doc.text(s.label, x + 8.5, y);
    x += 8.5 + doc.getTextWidth(s.label) + 12;
  }
}
