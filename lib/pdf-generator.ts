// Use the package's default entry point. The deep "/dist/jspdf.es.min.js"
// path was specific to jspdf v2 and broke in v3/v4 where the bundle layout
// changed — silently failing PDF export.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatRoiHeadline } from "@/lib/extreme-value-format";
import type { ReportMode } from "@/lib/pdf-export-constants";
import type { BuyBoxPdfVerdict } from "@/lib/pdf-buy-box";
import {
  TRUECAP_UNDERWRITING_STANDARD_NAME,
  TRUECAP_UNDERWRITING_STANDARD_VERSION,
} from "@/lib/underwriting-methodology";
import {
  drawBarChart,
  drawLineChart,
  drawStackedBarChart,
  type ChartBox,
} from "@/lib/pdf/vector-charts";
import { loadPdfImage } from "@/lib/pdf/load-image";
import type { ReportOperatingStatement } from "@/lib/report-operating-statement";

export interface ReportData {
  generatedAt: Date;
  /** Standard that produced the financial result. Optional only for legacy
   * report payloads; never relabel a frozen historical result as current. */
  methodologyVersion?: string;
  /** Explicit legacy/frozen provenance. Prefer this over deriving a label from
   * the embedded result version. */
  methodologyLabel?: string;
  property: {
    address: string;
    type: string;
    yearBuilt: number | null;
    purchasePrice: number;
    template: string;
  };
  financing: {
    downPaymentPct: number;
    downPayment: number;
    interestRate: number;
    loanTerm: number;
    closingCostsPct: number;
    closingCosts: number;
  };
  expenses: {
    /** Effective annual % of price (derived from the bill in annual-$ mode). */
    propertyTaxPct: number;
    /** Annual-$ property-tax mode: the typed yearly bill. When set, the
     *  assumptions block prints the bill instead of a percent — the percent
     *  was never the customer's input. Null in percent mode. */
    propertyTaxAnnualBill?: number | null;
    insurancePct: number;
    maintenancePct: number;
    vacancyPct: number;
    managementPct: number;
    capexPct: number;
    hoaMonthly: number;
    utilitiesMonthly: number;
    rentGrowth: number;
    expenseGrowth: number;
    appreciation: number;
    sellingCost: number;
    taxRate: number;
  };
  units: Array<{
    label: string;
    beds: number;
    baths: number;
    sqft: number;
    rent: number;
    /** The owner's own unit on a house hack. calc-analysis EXCLUDES it from
     *  rental income, so the report must exclude it from gross rent too or
     *  the cover contradicts the operating statement. Optional for legacy
     *  payloads, where it is simply absent. */
    isOwnerOccupied?: boolean;
  }>;
  performance: {
    recommendation: string;
    dealScore: number;
    risk: string;
    rationale: string;
    monthlyCashFlow: number;
    cocReturn: number;
    capRate: number;
    dscr: number;
    taxSavings: number;
    afterTaxCF: number;
  };
  /** Primary acquisition decision. Canonical server-built reports always
   * include it; optional only so frozen legacy payloads remain renderable. */
  decision?: {
    label: "Pursue" | "Conditional — verify first" | "Pass at this price";
    readiness: "Ready" | "Verify first" | "Screening only";
    clearsSelectedTargets: boolean;
    targetSource: "buy-box" | "screening-defaults" | "selected-targets";
    targetBasis: string;
    rationale: string;
  };
  /** Deterministic input-readiness evidence captured when the report is
   * generated. Optional for legacy/cached report payloads. */
  inputConfidence?: {
    score: number;
    stageLabel: string;
    sensitivityRisk: "low" | "moderate" | "high";
    methodVersion: string;
    verifiedAssumptions: string[];
    unverifiedAssumptions: Array<{
      label: string;
      sourceClass: string;
      sourceLabel: string;
      reason: string;
    }>;
  } | null;
  /** Deterministic acquisition threshold for reports whose methodology can be
   *  solved by the running engine. A null value means the target was
   *  unreachable inside the supported price range. Undefined means the block
   *  was intentionally omitted (for example, a frozen incompatible snapshot
   *  that did not persist its own solved acquisition result). */
  maxOffer?: {
    maxPrice: number;
    basis: string;
    source?: "buy-box" | "screening-defaults" | "selected-targets";
    sourceLabel?: string;
    currentPriceGap: number;
    bindingConstraints?: string[];
    nextConstraint?: string | null;
    range?: {
      lower: number | null;
      base: number;
      upper: number | null;
      label: string;
    };
    achieved: {
      monthlyCashFlow: number;
      cocReturn: number;
      capRate: number;
      dscr: number;
    };
    requiredMonthlyRent: { value: number; alreadyMet: boolean; unreachable: boolean } | null;
    requiredInterestRate: { value: number; alreadyMet: boolean; unreachable: boolean } | null;
  } | null;
  downsideScenario?: {
    /** Reproducible input change, e.g. rent -10% · vacancy +5pp · rate +1pp. */
    label: string;
    verdict: string;
    monthlyCashFlow: number;
    cocReturn: number;
    capRate: number;
    dscr: number;
  };
  projection10y: {
    cumulativeCF: number;
    bestAnnualAfterTax: number;
    totalAfterTax: number;
    rows: Array<{
      y: number;
      rental: number;
      opex: number;
      debt: number;
      net: number;
      tax: number;
      after: number;
      cum: number;
    }>;
  };
  taxStrategy: {
    year1Taxable: number;
    year1Savings: number;
    totalBenefit10y: number;
    annualDepreciation: number;
    rows: Array<{
      y: number;
      rental: number;
      opex: number;
      interest: number;
      dep: number;
      total: number;
      taxable: number;
      savings: number;
      benefit: number;
    }>;
  };
  exitScenarios: {
    bestYear: number;
    year5Profit: number;
    year10Profit: number;
    totalROI: number;
    rows: Array<{
      y: number;
      value: number;
      loan: number;
      equity: number;
      netSale: number;
      profit: number;
    }>;
  };
  /** Year-1 operating statement — the lender view: EGI → operating expenses →
   *  NOI → debt service → net cash flow, plus the financing facts. Optional
   *  for legacy/cached report payloads, in which case the section is skipped.
   *  Built by lib/report-operating-statement.ts from the engine's own fields;
   *  nothing here is computed in the PDF layer. */
  operatingStatement?: ReportOperatingStatement | null;
  /** RentCast sale + rent comps (reference data; never feeds the analysis math).
   *  Optional — the comps page renders only when present + non-empty. */
  comps?: {
    valueEstimate: number | null;
    valueRange: { low: number | null; high: number | null } | null;
    rentEstimate: number | null;
    rentRange: { low: number | null; high: number | null } | null;
    saleComps: Array<{ address: string; price: number | null; bedrooms: number | null; bathrooms: number | null; squareFootage: number | null; distanceMiles: number | null; pricePerSqft?: number | null }>;
    rentComps: Array<{ address: string; price: number | null; bedrooms: number | null; bathrooms: number | null; squareFootage: number | null; distanceMiles: number | null; pricePerSqft?: number | null }>;
    /** When RentCast returned this. A lender needs to know how stale it is. */
    fetchedAt?: string | null;
  } | null;
}

// ===================== Design tokens =====================
const COLOR = {
  ink: "#0B1220",
  text: "#1E293B",
  sub: "#64748B",
  muted: "#94A3B8",
  line: "#E2E8F0",
  cardBg: "#FFFFFF",
  cardSoft: "#F8FAFC",
  border: "#E5E9F2",
  primary: "#0070c4",
  primarySoft: "#EFF4FF",
  success: "#16A34A",
  successSoft: "#ECFDF5",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  warn: "#D97706",
  warnSoft: "#FFFBEB",
  violet: "#7C3AED",
  // TEXT variants of the semantic colours. #16A34A and #D97706 clear contrast
  // at an 18pt stat value but are also used for the SMALLEST type in the pack
  // (8.2pt table columns, a 7.5pt gauge label, 6.5pt micro-labels) where they
  // measure ~3.2:1 on white — under the 4.5:1 floor and genuinely hard to read
  // in print. These darker pairs clear it. Bars, stripes and chart series keep
  // the brighter values above.
  successText: "#15803D",
  warnText: "#B45309",
  violetSoft: "#F5F3FF",
  gold: "#B8860B",
  navy: "#0F172A",
};

const PAGE = { w: 595.28, h: 841.89 }; // A4 in pt
const M = { top: 80, bottom: 60, left: 40, right: 40 };
const SAFE = { w: PAGE.w - M.left - M.right, h: PAGE.h - M.top - M.bottom };

// ===================== Helpers =====================
const fmtCurrency = (n: number, withSign = false) => {
  const s = `$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
  if (withSign && n > 0) return `+${s}`;
  if (n < 0) return `-${s}`;
  return s;
};
const fmtPct = (n: number, sign = false) => `${sign && n > 0 ? "+" : ""}${n.toFixed(1)}%`;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Maps internal property-type slugs to professionally-formatted labels.
 * The DB stores "single-family" but PDF readers expect "Single Family."
 */
const PROPERTY_TYPE_LABELS: Record<string, string> = {
  "single-family": "Single Family",
  "multi-family": "Multi-Family",
  "owner-occupant": "Owner Occupant",
};
function formatPropertyType(type: string): string {
  return PROPERTY_TYPE_LABELS[type] ?? type;
}

function formatYearBuilt(yearBuilt: number | null): string {
  return yearBuilt == null ? "Unknown" : String(yearBuilt);
}

/**
 * Splits an address into "primary" (street) and "secondary" (city, state,
 * zip, country) on the first comma. Used to render the hero panel with
 * a large street headline and a smaller city/state subtitle line.
 *   "538 Turner St, Philadelphia, PA 19122, USA" →
 *     { primary: "538 Turner St",
 *       secondary: "Philadelphia, PA 19122, USA" }
 */
function splitAddress(address: string): {
  primary: string;
  secondary: string;
} {
  const trimmed = address.trim();
  const firstComma = trimmed.indexOf(",");
  if (firstComma < 0) return { primary: trimmed, secondary: "" };
  return {
    primary: trimmed.slice(0, firstComma).trim(),
    secondary: trimmed.slice(firstComma + 1).trim(),
  };
}
const setFill = (doc: jsPDF, hex: string) => doc.setFillColor(...hexToRgb(hex));
const setStroke = (doc: jsPDF, hex: string) => doc.setDrawColor(...hexToRgb(hex));
const setText = (doc: jsPDF, hex: string) => doc.setTextColor(...hexToRgb(hex));

// getRecommendationPillColor + getRiskPillColor were removed when the
// 3 verdict pills inside the hero panel were cut. getScorePillColor
// is kept because the AI Recommendation card's Deal Score readout
// still uses it for tier-coloring the score number.
function getScorePillColor(score: number): { bg: string; fg: string } {
  if (score >= 70) return { bg: COLOR.success, fg: "#FFFFFF" };
  if (score >= 40) return { bg: COLOR.warn, fg: "#FFFFFF" };
  return { bg: COLOR.danger, fg: "#FFFFFF" };
}

/**
 * Pro-tier branding config applied to PDF exports.
 *
 * All fields optional — missing fields fall back to TrueCap defaults.
 * The PDF generator threads this through to:
 *   - drawHeader (logo + accent bar color + tagline)
 *   - pageInputs (contact block under the recommendation card on page 1)
 *
 * Verdict color semantics (Strong Buy = green, Avoid = red, etc.) are
 * NOT replaced — those carry meaning and shouldn't shift with the user's
 * brand color. Only structural/chrome colors swap.
 */
export type BrandingConfig = {
  logoUrl?: string | null;
  primaryColorHex?: string | null;
  companyName?: string | null;
  tagline?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactWebsite?: string | null;
};

function isValidHex(hex: string | null | undefined): hex is string {
  return typeof hex === "string" && /^#[0-9A-Fa-f]{6}$/.test(hex);
}

/**
 * Resolve the user's effective theme color from branding config.
 * Returns the user's primary brand color if set + valid, else COLOR.primary
 * (TrueCap blue). Used throughout the PDF generator to color the kicker
 * labels, "primary"-tone stat card stripes, and other accent chrome.
 */
function resolveThemeColor(branding?: BrandingConfig | null): string {
  if (branding?.primaryColorHex && isValidHex(branding.primaryColorHex)) {
    return branding.primaryColorHex;
  }
  return COLOR.primary;
}

/**
 * Relative luminance of a hex color, 0 (black) → 1 (white).
 * Uses the sRGB luminance formula. Used to decide whether a brand
 * color is dark enough to safely use as the hero panel background
 * with white text overlaid. Threshold: luminance < 0.45 → dark enough.
 */
function colorLuminance(hex: string): number {
  if (!isValidHex(hex)) return 1;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return (
    0.2126 * toLinear(r) +
    0.7152 * toLinear(g) +
    0.0722 * toLinear(b)
  );
}

/** WCAG contrast ratio of a colour against white. */
function contrastOnWhite(hex: string): number {
  return 1.05 / (colorLuminance(hex) + 0.05);
}

/**
 * A brand colour that is safe to set as TEXT on white.
 *
 * resolveThemeColor returns whatever hex the user saved, and that value is used
 * as the text colour of every section kicker and — on six tables — the column
 * headers, over a near-white fill. A Pro agent whose brand is yellow, cyan or
 * a light green therefore shipped client-facing packs with unreadable headers.
 *
 * Darkens toward black until the ratio clears 4.5:1, preserving hue. The hero
 * PANEL already has an equivalent guard (colorLuminance < 0.45); this is the
 * same idea for the text uses, which had none.
 *
 * Fills, accent bars, stripes and chart series keep the raw brand colour —
 * they are not text and do not carry the contrast requirement.
 */
function resolveThemeTextColor(branding?: BrandingConfig | null): string {
  const base = resolveThemeColor(branding);
  if (contrastOnWhite(base) >= 4.5) return base;

  const [r, g, b] = hexToRgb(base);
  // 20 steps is finer than the eye can resolve and always terminates: at
  // factor 0 the colour is black, which is 21:1.
  for (let step = 1; step <= 20; step += 1) {
    const factor = 1 - step / 20;
    const candidate =
      "#" +
      [r, g, b]
        .map((c) => Math.round(c * factor).toString(16).padStart(2, "0"))
        .join("");
    if (contrastOnWhite(candidate) >= 4.5) return candidate;
  }
  return COLOR.ink;
}

/**
 * Load a logo for the header/cover.
 *
 * Delegates to lib/pdf/load-image.ts, which works under Node as well as in the
 * browser and — critically — ALLOWLISTS the host. `branding.logoUrl` is
 * user-supplied and unconstrained by lib/branding-values.ts, so once this
 * report is composed server-side an unrestricted fetch would be SSRF. See that
 * module's header for the full reasoning.
 *
 * The old implementation round-tripped through fetch → FileReader → Image →
 * <canvas> → toDataURL purely to learn the intrinsic dimensions. jsPDF takes a
 * base64 data URL directly, and PNG/JPEG carry their size in a header, so the
 * canvas (and with it the DOM dependency) was never load-bearing.
 *
 * Returns null on any failure; callers already fall back to a text wordmark.
 */
async function loadLogoDataUrl(
  src: string = "/Logo-png-w.png"
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  const image = await loadPdfImage(src);
  if (!image) return null;
  return { dataUrl: image.dataUrl, width: image.width, height: image.height };
}

/** Compact money label for in-chart annotations: 1240000 → "$1.2M", 8400 → "$8.4K". */
function fmtChartMoney(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${n < 0 ? "-" : ""}$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${n < 0 ? "-" : ""}$${Math.round(a / 1000)}K`;
  return `${n < 0 ? "-" : ""}$${Math.round(a)}`;
}

// ===================== Page chrome =====================
function drawHeader(
  doc: jsPDF,
  pageNum: number,
  totalPages: number,
  _generatedAt: Date,
  logoData: { dataUrl: string; width: number; height: number } | null,
  branding?: BrandingConfig | null
) {
  // Theme color — brand color if branded, else TrueCap blue.
  const themeColor = isValidHex(branding?.primaryColorHex ?? null)
    ? (branding?.primaryColorHex as string)
    : COLOR.primary;

  // Top accent bar — 6pt for more visual presence. Thicker bar feels
  // like a designed cover header rather than a thin tab strip.
  setFill(doc, themeColor);
  doc.rect(0, 0, PAGE.w, 6, "F");

  // Logo mark. Custom logos can be PNG or JPEG; jsPDF auto-detects from
  // the dataURL prefix so we pass "PNG" as a hint but it tolerates JPEG.
  // Auto-fit within max bounds while preserving aspect ratio.
  if (logoData) {
    try {
      const maxW = 110;
      const maxH = 40;
      const aspect =
        logoData.width > 0 && logoData.height > 0
          ? logoData.width / logoData.height
          : maxW / maxH;
      let targetWidth = maxW;
      let targetHeight = maxW / aspect;
      if (targetHeight > maxH) {
        targetHeight = maxH;
        targetWidth = maxH * aspect;
      }
      doc.addImage(
        logoData.dataUrl,
        "PNG",
        M.left,
        18,
        targetWidth,
        targetHeight,
        undefined,
        "FAST"
      );
    } catch {
      // keep header clean even if logo cannot be drawn
    }
  } else if (branding?.companyName?.trim()) {
    // Branded report with no uploaded logo — render the company name as a
    // text wordmark so the header is the user's, never TrueCap's.
    setText(doc, COLOR.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    // Bounded to the LEFT HALF of the header. branding-values allows a
    // 120-character company name, and the document title block ("ANALYSIS
    // REPORT" / "Investment Analysis") is right-aligned in the same band —
    // an unbounded wordmark printed straight through it and off the page.
    doc.text(truncateToWidth(doc, branding.companyName.trim(), SAFE.w * 0.52), M.left, 40);
  }

  // Header subtitle ("Prepared by [Name]") was removed per design
  // direction — header now shows the logo alone on the left, with the
  // document title block on the right. No attribution text in the
  // header.

  // Right side title block. All three lines share the SAME left x so
  // their left edges align cleanly:
  //   ANALYSIS REPORT     (small brand-color kicker)
  //   Investment Analysis (15pt bold — the dominant element)
  //   Generated [date]    (small muted date)
  // We measure "Investment Analysis" first, then position all three
  // lines so their right edges land at PAGE.w - M.right while their
  // left edges share a common anchor.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  const titleText = "Investment Analysis";
  const titleWidth = doc.getTextWidth(titleText);
  const titleLeftX = PAGE.w - M.right - titleWidth;

  setText(doc, themeColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setCharSpace(1.2);
  doc.text("ANALYSIS REPORT", titleLeftX, 26);
  doc.setCharSpace(0);
  setText(doc, COLOR.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(titleText, titleLeftX, 46);
  // "Generated [date]" line intentionally removed — the report no longer
  // stamps an export date in the header (keeps it evergreen for sharing).

  // Header divider — a single calm hairline across the full width.
  // Previously this had a brand-color accent segment on the left,
  // which visually read as an "underline" beneath "Prepared by
  // [Name]" (because the accent sat directly below that text) and
  // made the left side feel like a designed block while the right
  // side felt like loose text. A continuous neutral hairline closes
  // the header as one unit without privileging either side.
  setStroke(doc, COLOR.line);
  doc.setLineWidth(0.5);
  doc.line(M.left, 72, PAGE.w - M.right, 72);

  // Footer area — brand-color accent line sits 4pt above the
  // standard divider line. Subtle but present brand mark on every
  // page; falls back to the neutral COLOR.line on unbranded reports
  // so the accent doesn't appear at all.
  const footerLineY = PAGE.h - M.bottom + (pageNum === 1 ? 30 : 20);
  const footerTextY = PAGE.h - M.bottom + (pageNum === 1 ? 44 : 34);
  if (isValidHex(branding?.primaryColorHex ?? null)) {
    setStroke(doc, branding!.primaryColorHex as string);
    doc.setLineWidth(1.5);
    doc.line(M.left, footerLineY - 4, M.left + 36, footerLineY - 4);
    setStroke(doc, COLOR.line);
    doc.setLineWidth(0.5);
  }
  doc.line(M.left, footerLineY, PAGE.w - M.right, footerLineY);
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  // Footer-left text. Priority:
  //   1) Company name when branded
  //   2) "Made with TrueCap — usetruecap.com" default when unbranded
  //      (viral attribution — only on non-white-labeled reports, so a
  //      Pro user's branded lender packet stays fully their own).
  // The "Prepared by [Name]" attribution was removed per design.
  let footerLeft = "Made with TrueCap — usetruecap.com";
  if (branding?.companyName?.trim()) {
    footerLeft = branding.companyName.trim();
  }
  // Measured, not counted: 80 CHARACTERS of wide glyphs still overruns the
  // centred "Confidential …" label. Bound it to the third of the footer this
  // cell actually owns.
  footerLeft = truncateToWidth(doc, footerLeft, SAFE.w / 3);

  doc.text(footerLeft, M.left, footerTextY);
  doc.text("Confidential — for the named recipient only", PAGE.w / 2, footerTextY, { align: "center" });
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE.w - M.right, footerTextY, { align: "right" });
}

function sectionTitle(
  doc: jsPDF,
  text: string,
  y: number,
  kicker?: string,
  themeColor?: string
) {
  // The kicker label color picks up the brand color when set so the
  // section divider chrome reads as part of the user's identity, not
  // TrueCap's. Falls back to COLOR.primary (TrueCap blue) when no
  // theme color is provided.
  //
  // Passed through the contrast floor because this is TEXT on white: a light
  // brand colour (yellow, cyan, pale green) would otherwise render a section
  // heading that is effectively invisible. The underline rule below keeps the
  // raw brand colour — a rule carries no contrast requirement.
  const rawKicker =
    themeColor && isValidHex(themeColor) ? themeColor : COLOR.primary;
  const kickerColor =
    contrastOnWhite(rawKicker) >= 4.5 ? rawKicker : resolveThemeTextColor({ primaryColorHex: rawKicker });
  if (kicker) {
    setText(doc, kickerColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setCharSpace(0.8);
    doc.text(kicker.toUpperCase(), M.left, y);
    doc.setCharSpace(0);
    y += 18;
  }
  setText(doc, COLOR.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(text, M.left, y);
  // Elegant divider beneath the title — short brand-color accent stroke
  // mirrors the header divider treatment for visual consistency across
  // the document. Gives each section a clear designed beginning.
  // Tighter positioning (y+6 vs y+8) reads as more integrated.
  setStroke(doc, kickerColor);
  doc.setLineWidth(1.5);
  doc.line(M.left, y + 6, M.left + 28, y + 6);
  setStroke(doc, COLOR.line);
  doc.setLineWidth(0.5);
  return y + 22;
}

// ===================== Card primitives =====================
function card(doc: jsPDF, x: number, y: number, w: number, h: number, opts: { soft?: boolean } = {}) {
  setFill(doc, opts.soft ? COLOR.cardSoft : COLOR.cardBg);
  setStroke(doc, COLOR.border);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 8, 8, "FD");
}

function statCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  opts: {
    tone?: "primary" | "success" | "danger" | "neutral" | "violet" | "warn";
    sub?: string;
    // When the caller passes a themeColor, it overrides the "primary"
    // tone mapping so branded reports get the user's brand color on the
    // CoC Return / After-Tax CF stat cards instead of TrueCap blue.
    // Other tones (success/danger/warn/violet/neutral) stay constant —
    // they carry semantic meaning (green = good, red = bad) that
    // shouldn't shift with branding.
    themeColor?: string;
  } = {},
) {
  card(doc, x, y, w, h);
  // accent bar left — thinner 2pt for a more refined feel (was 3pt).
  // The bar is subtle enough not to compete with the typography but
  // present enough to carry the semantic tone meaning.
  const tone = opts.tone ?? "neutral";
  const primaryColor =
    opts.themeColor && isValidHex(opts.themeColor)
      ? opts.themeColor
      : COLOR.primary;
  const toneMap = {
    primary: primaryColor,
    success: COLOR.success,
    danger: COLOR.danger,
    neutral: COLOR.muted,
    violet: COLOR.violet,
    warn: COLOR.warn,
  } as const;
  setFill(doc, toneMap[tone]);
  doc.roundedRect(x, y, 2, h, 1, 1, "F");

  // Label — uppercase microcopy with character spacing for a typeset
  // editorial feel. Slightly smaller (7pt) but with more breathing room.
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setCharSpace(0.8);
  doc.text(label.toUpperCase(), x + 14, y + 18);
  doc.setCharSpace(0);

  // Value — sized 18pt for confident presence (was 17pt). The color
  // stays semantic when there's a tone, ink otherwise.
  setText(doc, tone === "neutral" ? COLOR.ink : toneMap[tone]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(value, x + 14, y + 41);

  if (opts.sub) {
    setText(doc, COLOR.sub);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(opts.sub, x + 14, y + 56);
  }
}

// pill() helper was removed when the verdict pills were cut from the
// hero panel and the Deal Score was refactored to refined typography
// rather than a colored pill.

/**
 * Visual deal-score readout: a "DEAL SCORE" kicker, the big tier-colored
 * number with a "/100" denominator, a 0–100 progress track filled to the
 * score in the tier color, and a one-word band (Strong / Moderate / Weak).
 * Replaces the old plain-text "72 / 100" — the number that answers "is this
 * a good deal?" now reads at a glance. Right-aligned to `rightX`; returns
 * the y of its bottom edge so callers can flow content beneath it.
 */
function drawScoreGauge(
  doc: jsPDF,
  opts: { rightX: number; topY: number; width: number; score: number; size?: "sm" | "lg" }
): number {
  const { rightX, topY, width, score } = opts;
  const leftX = rightX - width;
  const big = opts.size === "lg";
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tier =
    clamped >= 70
      ? { c: COLOR.success, label: "Strong" }
      : clamped >= 40
        ? { c: COLOR.warn, label: "Moderate" }
        : { c: COLOR.danger, label: "Weak" };

  // Kicker
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(big ? 8 : 7);
  doc.setCharSpace(0.8);
  doc.text("DEAL SCORE", rightX, topY, { align: "right" });
  doc.setCharSpace(0);

  // Score number (numerator big, "/100" small) — visual reading order "72 /100"
  const numY = topY + (big ? 30 : 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(big ? 12 : 9);
  setText(doc, COLOR.sub);
  const denom = " /100";
  const denomW = doc.getTextWidth(denom);
  doc.text(denom, rightX, numY, { align: "right" });
  setText(doc, tier.c);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(big ? 34 : 22);
  doc.text(String(clamped), rightX - denomW, numY, { align: "right" });

  // Tier track — light rail with a tier-colored fill to the score.
  const trackY = numY + (big ? 12 : 9);
  const trackH = big ? 8 : 5;
  setFill(doc, "#E9EEF5");
  doc.roundedRect(leftX, trackY, width, trackH, trackH / 2, trackH / 2, "F");
  const fillW = Math.max(trackH, (width * clamped) / 100);
  setFill(doc, tier.c);
  doc.roundedRect(leftX, trackY, fillW, trackH, trackH / 2, trackH / 2, "F");

  // Band label
  const labelY = trackY + trackH + (big ? 14 : 11);
  setText(doc, tier.c);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(big ? 9 : 7.5);
  doc.text(tier.label, rightX, labelY, { align: "right" });

  // Restore neutral stroke defaults for downstream draws.
  setStroke(doc, COLOR.line);
  doc.setLineWidth(0.5);
  return labelY + 2;
}

// ===================== Pages =====================

/**
 * One-sentence investment thesis for the cover's "Bottom Line" — the first
 * sentence (occasionally two, if the first is very short) of the AI
 * rationale, capped so it never overruns the panel. Reuses the rationale we
 * already have rather than inventing a second verdict that could disagree
 * with the body of the report.
 */
function buildThesis(d: ReportData): string {
  const r = (d.decision?.rationale || d.performance.rationale || "").trim();
  if (!r) return "";
  // Split on sentence terminators that are followed by whitespace or end of
  // string, so a decimal like "1.28 DSCR" is NOT treated as a sentence break
  // (the period there is followed by a digit, not a space).
  const parts = r.match(/[\s\S]+?[.!?](?=\s|$)/g) || [r];
  let out = (parts[0] || r).trim();
  if (out.length < 90 && parts[1]) out = `${out} ${parts[1].trim()}`.trim();
  if (out.length > 230) out = `${out.slice(0, 227).trimEnd()}…`;
  return out;
}

function reportDecision(d: ReportData): NonNullable<ReportData["decision"]> {
  if (d.decision) return d.decision;
  // Legacy direct-render payloads predate the decision contract. Keep them
  // readable without claiming that their Screening Index is the new primary
  // acquisition decision.
  return {
    label: "Conditional — verify first",
    readiness: "Screening only",
    clearsSelectedTargets: false,
    targetSource: "screening-defaults",
    targetBasis: d.maxOffer?.basis ?? "legacy screening criteria",
    rationale:
      "Legacy screening output. Verify the material assumptions and rerun under the current decision standard before pursuing.",
  };
}

function decisionColor(decision: NonNullable<ReportData["decision"]>): string {
  if (decision.label === "Pursue") return COLOR.successText;
  if (decision.label === "Pass at this price") return COLOR.danger;
  return COLOR.warnText;
}

/**
 * Cover page — the "arrival" beat a premium report earns before the data.
 * Big address headline, an "Investment Analysis" kicker, then a full-width
 * "UNDERWRITING VERDICT" panel that states the verdict, a one-sentence thesis,
 * the deal-score gauge, and the three numbers that matter — so a reader
 * knows the answer in five seconds. Brand-aware; self-contained (the running
 * header/footer is skipped on this page). Anchored attribution + confidential
 * line sit at the page foot.
 */
function pageCover(
  doc: jsPDF,
  d: ReportData,
  branding: BrandingConfig | null,
  logoData: { dataUrl: string; width: number; height: number } | null
) {
  const themeColor = resolveThemeColor(branding);

  // Top accent bar.
  setFill(doc, themeColor);
  doc.rect(0, 0, PAGE.w, 6, "F");

  // Logo, top-left (slightly larger than the running header for presence).
  if (logoData) {
    try {
      const maxW = 132;
      const maxH = 46;
      const aspect =
        logoData.width > 0 && logoData.height > 0 ? logoData.width / logoData.height : maxW / maxH;
      let tw = maxW;
      let th = maxW / aspect;
      if (th > maxH) {
        th = maxH;
        tw = maxH * aspect;
      }
      doc.addImage(logoData.dataUrl, "PNG", M.left, 30, tw, th, undefined, "FAST");
    } catch {
      // cover stays clean even if the logo can't be drawn
    }
  } else if (branding?.companyName?.trim()) {
    // Branded report, no uploaded logo — the company name is the wordmark.
    setText(doc, COLOR.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    // Same bound as the running header: the date sits right-aligned in this
    // band, and a 120-character company name would print straight through it.
    doc.text(truncateToWidth(doc, branding.companyName.trim(), SAFE.w * 0.6), M.left, 54);
  }

  // Tagline, under the wordmark or logo.
  //
  // This field was collected in the branding form, declared on BrandingConfig,
  // threaded through to here — and then never drawn anywhere. A Pro user typed
  // their tagline, saved it, and it appeared in nothing. Exactly the
  // state-written-never-read pattern this codebase keeps hitting.
  const tagline = branding?.tagline?.trim();
  if (tagline) {
    setText(doc, COLOR.sub);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    // One line only: the cover's vertical rhythm is fixed, and a wrapped
    // tagline would push into the title zone below.
    doc.text(truncateToWidth(doc, tagline, SAFE.w * 0.55), M.left, logoData ? 76 : 68);
  }

  // Date, top-right.
  setText(doc, COLOR.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    d.generatedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    PAGE.w - M.right,
    52,
    { align: "right" }
  );

  // ---- Title zone ----
  let y = 196;
  setText(doc, themeColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setCharSpace(1.6);
  doc.text("INVESTMENT ANALYSIS", M.left, y);
  doc.setCharSpace(0);
  y += 34;

  const ap = splitAddress(d.property.address);
  setText(doc, COLOR.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  const addrLines = (doc.splitTextToSize(ap.primary, SAFE.w) as string[]).slice(0, 2);
  doc.text(addrLines, M.left, y, { lineHeightFactor: 1.1 });
  y += (addrLines.length - 1) * 30 * 1.1 + 18;

  if (ap.secondary) {
    setText(doc, COLOR.sub);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.text(ap.secondary, M.left, y);
    y += 20;
  }

  setStroke(doc, themeColor);
  doc.setLineWidth(2);
  doc.line(M.left, y, M.left + 36, y);
  setStroke(doc, COLOR.line);
  doc.setLineWidth(0.5);
  y += 16;

  setText(doc, COLOR.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const unitsLabel = d.units.length === 1 ? "1 unit" : `${d.units.length} units`;
  doc.text(
    `${formatPropertyType(d.property.type)}   ·   Built ${formatYearBuilt(d.property.yearBuilt)}   ·   ${unitsLabel}   ·   ${fmtCurrency(d.property.purchasePrice)}`,
    M.left,
    y
  );
  y += 36;

  // ---- "UNDERWRITING VERDICT" panel ----
  // One name for the verdict across the whole pack: the cover panel, the
  // page-2 card and the disclosures all used to call it something different
  // ("THE BOTTOM LINE" / "AI RECOMMENDATION" / the underwriting standard).
  // "AI" was also simply untrue — lib/deal-score.ts's buildExplanation is a
  // deterministic rule tree, and calling a rule tree "AI" invites a reader to
  // discount a number that is actually reproducible.
  const decision = reportDecision(d);
  const tierColor = decisionColor(decision);
  const thesis = buildThesis(d);
  const panelX = M.left;
  const panelW = SAFE.w;
  const gaugeW = 150;
  const textW = panelW - 40 - gaugeW - 12; // left pad + gauge column

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const thesisLines = (doc.splitTextToSize(thesis, textW) as string[]).slice(0, 4);
  const thesisH = thesisLines.length * 11 * 1.4;
  const panelH = Math.round(152 + thesisH + (d.maxOffer ? 12 : 0));

  setFill(doc, COLOR.cardSoft);
  setStroke(doc, COLOR.border);
  doc.setLineWidth(0.6);
  doc.roundedRect(panelX, y, panelW, panelH, 10, 10, "FD");
  setFill(doc, tierColor);
  doc.roundedRect(panelX, y, 3, panelH, 1.5, 1.5, "F");

  let py = y + 30;
  // Kicker (left) + deal-score gauge (right).
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setCharSpace(0.8);
  doc.text("ACQUISITION DECISION", panelX + 20, py);
  doc.setCharSpace(0);
  drawScoreGauge(doc, {
    rightX: panelX + panelW - 20,
    topY: py - 8,
    width: gaugeW,
    score: d.performance.dealScore,
    size: "sm",
  });

  py += 22;
  setText(doc, tierColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(
    decision.label,
    panelX + 20,
    py
  );

  py += 22;
  setText(doc, COLOR.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(thesisLines, panelX + 20, py, { lineHeightFactor: 1.4 });
  py += thesisH + 22;

  // Acquisition answers across the foot of the panel. When the methodology is
  // compatible, the price ceiling belongs on the cover—not buried as a small
  // metric. Frozen incompatible snapshots omit it instead of mixing engines.
  const metrics: Array<[string, string]> = [
    ["MONTHLY CASH FLOW", fmtCurrency(d.performance.monthlyCashFlow, true)],
    ["CAP RATE", fmtPct(d.performance.capRate)],
    ["CASH-ON-CASH", fmtPct(d.performance.cocReturn)],
  ];
  if (d.maxOffer !== undefined) {
    metrics.push([
      "PRICE CEILING",
      d.maxOffer ? fmtCurrency(d.maxOffer.maxPrice) : "Not solvable",
    ]);
  }
  const mColW = (panelW - 40) / metrics.length;
  metrics.forEach((m, i) => {
    const mx = panelX + 20 + i * mColW;
    setText(doc, COLOR.sub);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setCharSpace(0.6);
    doc.text(m[0], mx, py);
    doc.setCharSpace(0);
    // MAX OFFER picks up the BRAND colour, not a hardcoded TrueCap blue — on
    // a white-label pack this cell was another company's blue sitting between
    // three neutral ones, for no reason a reader could infer.
    setText(doc, i === 0 ? (d.performance.monthlyCashFlow >= 0 ? COLOR.successText : COLOR.danger) : m[0] === "PRICE CEILING" ? themeColor : COLOR.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(m[1], mx, py + 18);
  });
  if (d.maxOffer) {
    setText(doc, COLOR.sub);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(
      `${d.maxOffer.sourceLabel ?? "Captured targets"}: ${d.maxOffer.basis}`,
      panelX + 20,
      py + 32,
    );
    doc.text(
      `Binding: ${d.maxOffer.bindingConstraints?.join(" + ") || "not resolved"}${d.maxOffer.nextConstraint ? ` · Next: ${d.maxOffer.nextConstraint}` : ""}`,
      panelX + 20,
      py + 42,
    );
    doc.text(
      "Calculated from the targets shown. This is not a recommended offer.",
      panelX + 20,
      py + 52,
    );
  }

  // ---- Deal terms strip — financing snapshot below the panel. Balances the
  // cover (no longer a void above the footer) and adds the at-a-glance terms a
  // lender / partner looks for first. ----
  const isCashPurchase = d.financing.downPaymentPct >= 100;
  const termsY = y + panelH + 42;
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setCharSpace(0.8);
  doc.text("DEAL TERMS", M.left, termsY);
  doc.setCharSpace(0);
  const terms: Array<[string, string]> = [
    ["PURCHASE PRICE", fmtCurrency(d.property.purchasePrice)],
    ["DOWN PAYMENT", `${d.financing.downPaymentPct}%  ·  ${fmtCurrency(d.financing.downPayment)}`],
    ["INTEREST RATE", isCashPurchase ? "Cash purchase" : `${d.financing.interestRate}%`],
    ["LOAN TERM", isCashPurchase ? "—" : `${d.financing.loanTerm} yrs`],
  ];
  const tColW = SAFE.w / 4;
  terms.forEach((t, i) => {
    const tx = M.left + i * tColW;
    setText(doc, COLOR.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setCharSpace(0.5);
    doc.text(t[0], tx, termsY + 26);
    doc.setCharSpace(0);
    setText(doc, COLOR.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(t[1], tx, termsY + 45);
  });

  // ---- Attribution + confidential, anchored at the page foot ----
  const footY = 772;
  setStroke(doc, COLOR.line);
  doc.setLineWidth(0.5);
  doc.line(M.left, footY - 22, PAGE.w - M.right, footY - 22);

  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setCharSpace(0.8);
  doc.text("PREPARED BY", M.left, footY - 6);
  doc.setCharSpace(0);
  setText(doc, COLOR.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const preparedBy =
    branding?.companyName?.trim() || branding?.contactName?.trim() || "TrueCap";
  doc.text(preparedBy, M.left, footY + 8);
  const contactBits = [
    branding?.contactName,
    branding?.contactEmail,
    branding?.contactPhone,
    branding?.contactWebsite,
  ]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s));
  if (!branding?.companyName?.trim()) {
    // Unbranded: the "Prepared by TrueCap" line carries the attribution;
    // add the site so the cover still points somewhere.
    if (contactBits.length === 0) contactBits.push("usetruecap.com");
  }
  if (contactBits.length) {
    setText(doc, COLOR.sub);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(contactBits.join("   ·   "), M.left, footY + 22);
  }

  setText(doc, COLOR.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Confidential — for the named recipient only", PAGE.w - M.right, footY + 8, {
    align: "right",
  });
}

// ===================== "Your buy box" block =====================

/** Ellipsis-truncate a single line to a max width at the CURRENT font. */
function truncateToWidth(doc: jsPDF, text: string, maxW: number): string {
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(`${t}…`) > maxW) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/**
 * Vector pass/fail/skip mark (check, cross, dash) — jsPDF's WinAnsi
 * Helvetica has no ✓/✗ glyphs, so these are drawn as line art, matching
 * the in-app card's green check / red cross / muted dash.
 */
function drawBuyBoxCheckGlyph(doc: jsPDF, x: number, textBaselineY: number, pass: boolean | null) {
  const cy = textBaselineY - 3; // optical center of the 8pt text line
  doc.setLineWidth(1.2);
  if (pass === true) {
    setStroke(doc, COLOR.success);
    doc.line(x, cy, x + 2.4, cy + 2.4);
    doc.line(x + 2.4, cy + 2.4, x + 6.8, cy - 2.6);
  } else if (pass === false) {
    setStroke(doc, COLOR.danger);
    doc.line(x + 0.6, cy - 2.6, x + 6.2, cy + 2.6);
    doc.line(x + 6.2, cy - 2.6, x + 0.6, cy + 2.6);
  } else {
    setStroke(doc, COLOR.muted);
    doc.line(x + 0.8, cy, x + 6, cy);
  }
  setStroke(doc, COLOR.line);
  doc.setLineWidth(0.5);
}

/**
 * Shared layout math for the buy-box card so pagination can measure the
 * block BEFORE drawing it (the card auto-sizes to the personal line +
 * criterion count, like the AI Recommendation card above it).
 */
function buyBoxCardLayout(doc: jsPDF, v: BuyBoxPdfVerdict, w: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const personalLines = v.personalLine
    ? (doc.splitTextToSize(v.personalLine, w - 32) as string[]).slice(0, 2)
    : [];
  const personalLineH = 8.5 * 1.35;
  const rows = Math.ceil(v.checks.length / 2);
  const gridTop =
    44 + (personalLines.length > 0 ? personalLines.length * personalLineH + 8 : 4);
  const height = Math.round(gridTop + rows * 15 + 12);
  return { personalLines, rows, gridTop, height };
}

/**
 * The owner's personal verdict — the exact data the in-app BuyBoxVerdictCard
 * shows (Meets/Misses headline, N/M criteria met, the biggest-gap /
 * tightest-margin sentence, per-criterion actual vs target with pass/fail
 * marks). Follows the AI Recommendation card's visual language: white card,
 * tier-colored left stripe + kicker + headline. Tier colors are semantic
 * (green = fits, amber = misses) and never swap with branding.
 */
function drawBuyBoxVerdictCard(doc: jsPDF, v: BuyBoxPdfVerdict, x: number, y: number, w: number) {
  const { personalLines, gridTop, height } = buyBoxCardLayout(doc, v, w);
  const tierColor = v.passes ? COLOR.success : v.applicableCount > 0 ? COLOR.warn : COLOR.muted;

  card(doc, x, y, w, height);
  setFill(doc, tierColor);
  doc.roundedRect(x, y, 3, height, 1.5, 1.5, "F");

  // Kicker — names the detailed box when several were screened.
  setText(doc, tierColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setCharSpace(0.8);
  const kicker = v.multi ? `YOUR BUY BOX — ${v.boxName.toUpperCase()}` : "YOUR BUY BOX";
  doc.text(truncateToWidth(doc, kicker, w - 200), x + 16, y + 16);
  // Multi-box rollup, right-aligned on the kicker line ("meets N of M").
  if (v.multi) {
    setText(doc, COLOR.sub);
    doc.text(`MEETS ${v.passingCount} OF ${v.activeCount} BUY BOXES`, x + w - 16, y + 16, {
      align: "right",
    });
  }
  doc.setCharSpace(0);

  // Headline + criteria-met count on a shared baseline.
  setText(doc, tierColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(truncateToWidth(doc, v.headline, w - 150), x + 16, y + 34);
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`${v.passedCount}/${v.applicableCount} criteria met`, x + w - 16, y + 34, {
    align: "right",
  });

  // Personal gap sentence ("Biggest gap — …" / "Tightest margin — …").
  if (personalLines.length > 0) {
    setText(doc, COLOR.text);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(personalLines, x + 16, y + 48, { lineHeightFactor: 1.35 });
  }

  // Per-criterion grid, two columns: mark + "Label: actual vs target (gap)".
  const colW = (w - 32 - 12) / 2;
  v.checks.forEach((c, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = x + 16 + col * (colW + 12);
    const cy = y + gridTop + row * 15 + 10;
    drawBuyBoxCheckGlyph(doc, cx, cy, c.pass);
    setText(doc, COLOR.text);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const body = `${c.label}: ${c.actual} vs ${c.target}${c.gapText ? ` (${c.gapText})` : ""}`;
    doc.text(truncateToWidth(doc, body, colW - 14), cx + 12, cy);
  });

  setStroke(doc, COLOR.line);
  doc.setLineWidth(0.5);
}

/**
 * Year-1 operating statement: EGI → operating expenses → NOI → debt service →
 * net cash flow, with the financing facts beside it.
 *
 * Pure layout. Every number arrives precomputed on the statement object (see
 * lib/report-operating-statement.ts); this function does no arithmetic beyond
 * positioning.
 */
function drawOperatingStatement(
  doc: jsPDF,
  st: ReportOperatingStatement,
  startY: number,
  themeColor: string
): number {
  let y = sectionTitle(doc, "Year 1 Operating Statement", startY, undefined, themeColor);
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    st.isCashPurchase
      ? "Annualized. No financing, so NOI is the bottom line."
      : "Annualized. NOI excludes CapEx, debt service and income tax — the lender-standard definition.",
    M.left,
    y
  );
  y += 16;

  const colW = (SAFE.w - 12) / 2;
  const left = M.left;
  const right = M.left + colW + 12;

  type Line = { label: string; value: number; strong?: boolean; rule?: boolean; muted?: boolean };
  const lines: Line[] = [
    { label: "Gross scheduled rent", value: st.grossScheduledIncome },
    { label: "Less vacancy allowance", value: -st.vacancyAllowance },
    { label: "Effective gross income", value: st.effectiveGrossIncome, strong: true, rule: true },
    ...st.operatingExpenses.map((e) => ({ label: e.label, value: -e.amount })),
    { label: "Total operating expenses", value: -st.operatingExpensesTotal, rule: true },
    { label: "Net operating income (NOI)", value: st.noi, strong: true, rule: true },
  ];
  if (!st.isCashPurchase) {
    lines.push({ label: "Less debt service (P&I)", value: -st.annualDebtService });
    if (st.pmiAnnual > 0) lines.push({ label: "Less PMI", value: -st.pmiAnnual });
  }
  if (st.capexReserve > 0) {
    lines.push({ label: "Less CapEx reserve", value: -st.capexReserve, muted: true });
  }
  lines.push({ label: "Net cash flow", value: st.netCashFlowAnnual, strong: true, rule: true });

  const lineH = 14;
  const boxH = lines.length * lineH + 20;
  card(doc, left, y, colW, boxH);
  let ly = y + 18;
  for (const line of lines) {
    if (line.rule) {
      setStroke(doc, COLOR.line);
      doc.setLineWidth(0.4);
      doc.line(left + 12, ly - 10, left + colW - 12, ly - 10);
    }
    doc.setFont("helvetica", line.strong ? "bold" : "normal");
    doc.setFontSize(8.5);
    setText(doc, line.muted ? COLOR.sub : line.strong ? COLOR.ink : COLOR.text);
    doc.text(line.label, left + 12, ly);
    setText(
      doc,
      line.strong
        ? line.value >= 0
          ? COLOR.successText
          : COLOR.danger
        : line.muted
          ? COLOR.sub
          : COLOR.text
    );
    doc.text(fmtCurrency(line.value), left + colW - 12, ly, { align: "right" });
    ly += lineH;
  }

  // Financing facts — the other half of what a lender asks for up front.
  const facts: Array<[string, string]> = st.isCashPurchase
    ? [
        ["Purchase type", "Cash — no financing"],
        ["Total cash required", fmtCurrency(st.totalCashRequired)],
      ]
    : [
        ["Loan amount", fmtCurrency(st.loanAmount)],
        ["Monthly payment (P&I)", fmtCurrency(st.monthlyPayment)],
        ["PMI (monthly)", st.pmiAnnual > 0 ? fmtCurrency(Math.round(st.pmiAnnual / 12)) : "None"],
        ["Annual debt service", fmtCurrency(st.annualDebtService)],
        ["Total cash to close", fmtCurrency(st.totalCashRequired)],
      ];
  drawInputBlock(doc, right, y, colW, Math.min(boxH, 92 + facts.length * 4), "Financing", facts, themeColor);

  return y + boxH + 22;
}

/**
 * Cash purchase, from the report payload alone.
 *
 * The operating statement carries the engine's own flag; everything else falls
 * back to the down-payment share, which is what the cover strip already uses.
 */
function isCashPurchaseReport(d: ReportData): boolean {
  if (d.operatingStatement) return d.operatingStatement.isCashPurchase;
  return d.financing.downPaymentPct >= 100;
}

function pageInputs(
  doc: jsPDF,
  d: ReportData,
  branding?: BrandingConfig | null,
  buyBox?: BuyBoxPdfVerdict | null
) {
  let y = M.top;

  // Hero panel background. Three-way decision:
  //   1) Dark brand color set → use it (custom feel)
  //   2) Branded but light/no brand color → neutral charcoal (avoids
  //      having TrueCap's navy show through a Skale-branded report)
  //   3) No branding at all → COLOR.navy (TrueCap default)
  // Luminance threshold (0.45) protects against light brand colors
  // making the white address text unreadable.
  const hasAnyBrandingForPanel = Boolean(
    branding?.logoUrl ||
      branding?.companyName ||
      branding?.tagline ||
      branding?.primaryColorHex
  );
  let heroPanelColor: string;
  if (
    isValidHex(branding?.primaryColorHex ?? null) &&
    colorLuminance(branding?.primaryColorHex as string) < 0.45
  ) {
    heroPanelColor = branding?.primaryColorHex as string;
  } else if (hasAnyBrandingForPanel) {
    // Neutral dark slate — reads as "professional report" without
    // borrowing TrueCap's signature navy.
    heroPanelColor = "#1F2937";
  } else {
    heroPanelColor = COLOR.navy;
  }
  // Resolve theme color ONCE for this page — reused by the Subject
  // Property kicker, section kickers, stat cards, and any other chrome
  // that swaps to the user's brand color.
  const themeColor = resolveThemeColor(branding);

  // Hero panel — 72pt fits the two-line address treatment (street
  // headline + city/state subtitle + property details row) without
  // wasted vertical space. Internal positions tightened proportionally.
  const heroHeight = 72;
  setFill(doc, heroPanelColor);
  doc.roundedRect(M.left, y, SAFE.w, heroHeight, 10, 10, "F");

  // Split "538 Turner St, Philadelphia, PA 19122, USA" into a big
  // street headline + a smaller city/state subtitle so the address
  // reads as a proper two-tier typographic hierarchy.
  const addressParts = splitAddress(d.property.address);

  setText(doc, "#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  // TRUNCATED to the panel. The cover's copy of this address wraps via
  // splitTextToSize, but the hero panel is a fixed-height band, so a long
  // street line ("2100 Northeast Martin Luther King Junior Boulevard" measures
  // 544pt at 22pt bold) simply ran off the right edge of the page. The panel
  // spans M.left..PAGE.w-M.right and the text starts 22pt in, with a matching
  // 22pt gutter on the right.
  doc.text(
    truncateToWidth(doc, addressParts.primary, SAFE.w - 44),
    M.left + 22,
    y + 28
  );

  if (addressParts.secondary) {
    setText(doc, "#CBD5E1");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(addressParts.secondary, M.left + 22, y + 43);
  }

  // Thin white inner accent line between address subtitle and property
  // details row. Editorial divider treatment.
  setStroke(doc, "#FFFFFF");
  doc.setLineWidth(0.6);
  doc.line(M.left + 22, y + 50, M.left + 22 + 28, y + 50);

  setText(doc, "#CBD5E1");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  // Singular/plural fix on "unit/units" so a single-family deal doesn't
  // read as "1 units." Property type formatted to a proper label
  // ("single-family" → "Single Family").
  const unitsLabel = d.units.length === 1 ? "1 unit" : `${d.units.length} units`;
  doc.text(
    `${formatPropertyType(d.property.type)}  ·  Built ${formatYearBuilt(d.property.yearBuilt)}  ·  ${unitsLabel}  ·  Purchase ${fmtCurrency(d.property.purchasePrice)}`,
    M.left + 22,
    y + 63,
  );

  // Restore stroke defaults for downstream draws
  setStroke(doc, COLOR.line);
  doc.setLineWidth(0.5);

  y += heroHeight + 22;

  // Performance Summary — section reordering: the headline metrics now
  // appear FIRST after the hero panel, before the inputs that produced
  // them. Numbers before assumptions reads as a proper investment
  // report — the reader sees "what does this deal do?" before "how was
  // it calculated?"
  y = sectionTitle(doc, "Performance Summary", y, undefined, themeColor);
  const cw = (SAFE.w - 24) / 3;
  const ch = 60;
  const gap = 10;
  // Cash purchase => no debt service => DSCR isn't applicable. Detect via
  // downPaymentPct >= 100 (the canonical signal in the report payload).
  const isCashPurchase = d.financing.downPaymentPct >= 100;
  const dscrValue = isCashPurchase ? "N/A" : d.performance.dscr.toFixed(2);
  const dscrTone: "primary" | "success" | "danger" | "neutral" | "violet" | "warn" =
    isCashPurchase ? "neutral" : d.performance.dscr >= 1.2 ? "success" : "warn";
  const dscrSub = isCashPurchase ? "cash purchase" : "debt cover";
  const cards: Array<[string, string, "primary" | "success" | "danger" | "neutral" | "violet" | "warn", string?]> = [
    ["Monthly Cash Flow", fmtCurrency(d.performance.monthlyCashFlow), d.performance.monthlyCashFlow >= 0 ? "success" : "danger", "/month"],
    ["CoC Return", fmtPct(d.performance.cocReturn, true), "primary", "year 1"],
    ["Cap Rate", fmtPct(d.performance.capRate, true), "violet", "NOI basis"],
    ["DSCR", dscrValue, dscrTone, dscrSub],
    ["Modeled After-Tax CF", fmtCurrency(d.performance.afterTaxCF), "primary", "/month"],
  ];
  if (d.maxOffer !== undefined) {
    cards.unshift([
      "Price Ceiling",
      d.maxOffer ? fmtCurrency(d.maxOffer.maxPrice) : "Not solvable",
      "primary",
      d.maxOffer ? d.maxOffer.sourceLabel ?? "captured targets" : "review inputs",
    ]);
  }
  cards.forEach((c, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    statCard(doc, M.left + col * (cw + gap), y + row * (ch + gap), cw, ch, c[0], c[1], { tone: c[2], sub: c[3], themeColor });
  });
  if (d.maxOffer) {
    const criteriaY = y + (ch + gap) * 2 + 2;
    setText(doc, COLOR.sub);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(
      `Price ceiling — ${d.maxOffer.sourceLabel ?? "captured targets"}: ${d.maxOffer.basis}`,
      M.left,
      criteriaY,
    );
    doc.text(
      `Binding: ${d.maxOffer.bindingConstraints?.join(" + ") || "not resolved"}${d.maxOffer.nextConstraint ? ` · Next: ${d.maxOffer.nextConstraint}` : ""}`,
      M.left,
      criteriaY + 11,
    );
    doc.text(
      "Calculated from the targets shown. This is not a recommended offer.",
      M.left,
      criteriaY + 22,
    );
  }
  // Section spacing rationalized to a consistent +22pt across all
  // page-1 transitions (was +6 here previously, which visibly cramped
  // Property & Inputs immediately below).
  y += (ch + gap) * 2 + (d.maxOffer ? 53 : 22);

  y = sectionTitle(doc, "Units", y, undefined, themeColor);
  if (d.units.length <= 2) {
    // 1-2 units fit cleanly as side-by-side cards.
    const uW = (SAFE.w - 12) / 2;
    d.units.forEach((u, i) => {
      const x = M.left + i * (uW + 12);
      card(doc, x, y, uW, 60);
      // The first unit's header band followed TrueCap blue on a page that had
      // already resolved the user's theme colour. Neutral for both.
      setFill(doc, COLOR.cardSoft);
      doc.roundedRect(x, y, uW, 22, 8, 8, "F");
      setText(doc, COLOR.ink);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(u.isOwnerOccupied ? `${u.label} — owner occupied` : u.label, x + 12, y + 15);
      setText(doc, COLOR.sub);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      ["BEDS", "BATHS", "SQ FT", "RENT"].forEach((lbl, j) => {
        doc.text(lbl, x + 12 + j * ((uW - 24) / 4), y + 36);
      });
      setText(doc, COLOR.ink);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      // The owner's unit shows no rent: the engine does not count it, so
      // printing its form value here would restate the contradiction.
      [
        String(u.beds),
        String(u.baths),
        String(u.sqft),
        u.isOwnerOccupied ? "—" : u.rent ? `${fmtCurrency(u.rent)}/mo` : "$0",
      ].forEach((v, j) => {
        doc.text(v, x + 12 + j * ((uW - 24) / 4), y + 52);
      });
    });
    y += 60 + 22;
  } else {
    // 3+ units: the previous code positioned every unit card in a single
    // row (x = left + i·(cardWidth+gap)) with no wrapping, so on a
    // multifamily deal the 3rd card clipped the right margin and units
    // 3..N rendered off-page entirely. A unit-mix + rent-roll summary in
    // the same vertical band conveys EVERY unit, always fits the cover,
    // and is how a lender scans a multifamily.
    const stripH = 60;
    // GROSS RENT counts only the units that actually produce income.
    // calc-analysis drops the owner-occupied unit (`propertyType ===
    // "owner-occupant" && u.isOwnerOccupied`), but the form keeps its rent
    // value, so summing every unit here printed a gross rent that no other
    // figure in the document could reconcile with — the operating statement
    // on the next page showed the engine's smaller number. On a pack a
    // lender reads, two contradicting gross rents is worse than either.
    const incomeUnits = d.units.filter((u) => !u.isOwnerOccupied);
    const ownerUnits = d.units.length - incomeUnits.length;
    const grossRent = incomeUnits.reduce((sum, u) => sum + (u.rent || 0), 0);
    const avgRent = incomeUnits.length > 0 ? grossRent / incomeUnits.length : 0;
    const mix = new Map<string, number>();
    d.units.forEach((u) => {
      const k = `${u.beds}/${u.baths}`;
      mix.set(k, (mix.get(k) || 0) + 1);
    });
    const mixStr = Array.from(mix.entries()).map(([k, n]) => `${n}×${k}`).join("  ·  ");
    card(doc, M.left, y, SAFE.w, stripH);
    const cols = [
      { label: "UNITS", value: String(d.units.length), big: true },
      { label: "UNIT MIX (BD/BA)", value: mixStr, big: false },
      {
        label: ownerUnits > 0 ? "GROSS RENT (RENTED)" : "GROSS RENT",
        value: `${fmtCurrency(grossRent)}/mo`,
        big: true,
      },
      {
        label: ownerUnits > 0 ? "AVG / RENTED UNIT" : "AVG / UNIT",
        value: `${fmtCurrency(avgRent)}/mo`,
        big: true,
      },
    ];
    const colW = SAFE.w / cols.length;
    cols.forEach((c, k) => {
      const cx = M.left + k * colW + 14;
      setText(doc, COLOR.sub);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setCharSpace(0.6);
      doc.text(c.label, cx, y + 22);
      doc.setCharSpace(0);
      setText(doc, COLOR.ink);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(c.big ? 14 : 10);
      let v = c.value;
      const maxW = colW - 22;
      if (doc.getTextWidth(v) > maxW) {
        v = `${mix.size} unit types`;
        if (doc.getTextWidth(v) > maxW) doc.setFontSize(9);
      }
      doc.text(v, cx, y + 44);
    });
    y += stripH + 22;
  }

  // Recommendation / verdict card (full width). Auto-sizes to its
  // content so short Neutral/Risky rationales don't leave a giant
  // empty white box, and long Strong Buy explanations don't get
  // truncated. Previously hardcoded at 130pt — which was right for
  // 5-6 sentences but left ~70pt of empty space inside the card on
  // 1-sentence rationales.
  //
  // The left stripe + the "UNDERWRITING VERDICT" kicker text both pick up
  // the verdict tier color (green for Strong Buy / Buy, orange for
  // Neutral / Risky, red for Avoid) so they match the headline text.
  const decision = reportDecision(d);
  const tierColor = decisionColor(decision);
  // Compute the rationale lines first so we can size the card to fit.
  // splitTextToSize needs the font already set, so set the body font
  // before measuring.
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const rationaleLines = doc.splitTextToSize(
    decision.rationale,
    SAFE.w - 32
  ).slice(0, 7); // hard cap at 7 lines to prevent absurdly long rationales
  // Vertical accounting inside the card:
  //   y + 16  → "UNDERWRITING VERDICT" kicker (8pt)
  //   y + 34  → headline (13pt)
  //   y + 50  → first rationale line
  //   each line ≈ 9pt × 1.35 leading ≈ 12.15pt
  //   + 16pt bottom padding
  // Floor at 78pt (1 line) so very short rationales still look like a
  // proper card, not a stripe.
  const lineHeight = 9 * 1.35;
  const cardHeight = Math.max(
    78,
    Math.round(50 + rationaleLines.length * lineHeight + 16)
  );

  // PAGE-FIT BACKSTOP. The card is the only element here whose height depends
  // on content, so it must never assume it fits where it lands. Headers and
  // footers are painted AFTER the body, so an overflowing card gets the footer
  // rule and "Page N of M" printed straight across it.
  const cardFooterLineY = PAGE.h - M.bottom + 20; // non-cover footer rule
  if (y + cardHeight > cardFooterLineY - 12) {
    doc.addPage();
    y = M.top + 12;
  }
  card(doc, M.left, y, SAFE.w, cardHeight);
  // Thinner left stripe (3pt vs 4pt) for a more refined feel.
  setFill(doc, tierColor);
  doc.roundedRect(M.left, y, 3, cardHeight, 1.5, 1.5, "F");
  // Kicker — typeset character spacing for editorial polish.
  setText(doc, tierColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setCharSpace(0.8);
  doc.text("ACQUISITION DECISION", M.left + 16, y + 16);
  doc.setCharSpace(0);
  // Headline — slightly tighter (14pt vs 13pt) for confident statement.
  setText(doc, tierColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(decision.label, M.left + 16, y + 34);

  // Deal Score badge — refined right-aligned typography.
  // Reads as "52 / 100" with the score number prominent on the LEFT
  // and the "/100" denominator smaller on the RIGHT (standard
  // numerator-then-denominator reading order). Cleaner than a colored
  // pill — editorial rather than promotional.
  const scoreColor = getScorePillColor(d.performance.dealScore);
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setCharSpace(0.8);
  doc.text("SCREENING INDEX", PAGE.w - M.right - 16, y + 16, { align: "right" });
  doc.setCharSpace(0);

  // Render "/ 100" first (rightmost), measure its width, then render
  // the big score number left of it. This way the visual order is
  // "52 / 100", not "/ 100 52" (which was the previous bug).
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const denominatorText = " / 100";
  const denominatorWidth = doc.getTextWidth(denominatorText);
  doc.text(denominatorText, PAGE.w - M.right - 16, y + 36, { align: "right" });

  setText(doc, scoreColor.bg);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  const scoreStr = String(d.performance.dealScore);
  doc.text(
    scoreStr,
    PAGE.w - M.right - 16 - denominatorWidth,
    y + 36,
    { align: "right" }
  );

  // Rationale body — explicitly reset character spacing AND re-set
  // the font right before rendering. jsPDF's text state is sticky;
  // if anything upstream set charSpace and forgot to reset, the
  // body paragraph would render with letter-spacing leaks. Defensive
  // reset here guarantees the body always reads cleanly.
  doc.setCharSpace(0);
  setText(doc, COLOR.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(rationaleLines, M.left + 16, y + 50, { lineHeightFactor: 1.35 });

  // "Your buy box" — the owner's personal verdict, directly under the AI
  // recommendation (the same pairing as the app dashboard: Deal Score
  // verdict first, buy-box fit right after). Renders ONLY when the
  // exporting user has ≥1 usable buy box; without one this page stays
  // byte-identical to the pre-buy-box template. If a long rationale +
  // many criteria won't fit above the page footer, the card moves to its
  // own page rather than colliding with the footer rule.
  if (buyBox) {
    let by = y + cardHeight + 12;
    const { height: blockH } = buyBoxCardLayout(doc, buyBox, SAFE.w);
    const footerLineY = PAGE.h - M.bottom + 20; // non-cover footer rule
    if (by + blockH > footerLineY - 12) {
      doc.addPage();
      by = M.top + 12;
    }
    drawBuyBoxVerdictCard(doc, buyBox, M.left, by, SAFE.w);
  }

  // ── PAGE BREAK ──────────────────────────────────────────────────────────
  // The verdict ends this page; the assumptions behind it start the next one.
  //
  // This page used to carry everything — hero, six metrics, four input blocks,
  // units AND the verdict card — and the arithmetic did not work. Every block
  // above the card is fixed-height, so the card always began at y≈700 with
  // ~89pt of room, which fits barely two wrapped lines of rationale. Any real
  // rationale (deal-score's appreciation branch, verdict.ts's fallback) drew
  // the card through the footer and off the bottom of the sheet.
  //
  // Splitting here fixes that at the cause rather than leaning on the backstop
  // above, and it reads better: the answer and the numbers behind it stand on
  // their own, then the inputs that produced them.
  doc.addPage();
  y = M.top + 12;


  // Property & Inputs. The reader has seen the verdict and the numbers behind
  // it; this page is the assumptions that produced them.
  y = sectionTitle(doc, "Property & Inputs", y, undefined, themeColor);
  const colW = (SAFE.w - 12) / 2;
  const rowH = 92;

  drawInputBlock(doc, M.left, y, colW, rowH, "Property", [
    ["Type", formatPropertyType(d.property.type)],
    ["Year built", formatYearBuilt(d.property.yearBuilt)],
    ["Purchase price", fmtCurrency(d.property.purchasePrice)],
    ["Template", d.property.template],
  ], themeColor);
  drawInputBlock(doc, M.left + colW + 12, y, colW, rowH, "Financing", [
    ["Down payment", `${d.financing.downPaymentPct}% (${fmtCurrency(d.financing.downPayment)})`],
    // A cash purchase has no loan, but loanTermYears is schema-required and
    // interestRate keeps whatever default was on the form — so this block
    // printed "7% / 30 yrs" on a page whose own cover strip already said
    // "Cash purchase".
    ["Interest rate", isCashPurchaseReport(d) ? "—" : `${d.financing.interestRate}%`],
    ["Loan term", isCashPurchaseReport(d) ? "—" : `${d.financing.loanTerm} yrs`],
    ["Closing costs", `${d.financing.closingCostsPct}% (${fmtCurrency(d.financing.closingCosts)})`],
  ], themeColor);
  y += rowH + 10;
  drawInputBlock(doc, M.left, y, colW, rowH, "Operating Expenses", [
    // Annual-$ tax mode prints the customer's actual bill — printing the
    // unused percent field here used to render "0%" on a paid PDF.
    [
      "Property tax / Insurance",
      `${
        d.expenses.propertyTaxAnnualBill != null
          ? `${fmtCurrency(d.expenses.propertyTaxAnnualBill)}/yr (annual bill)`
          : `${d.expenses.propertyTaxPct}%`
      } / ${d.expenses.insurancePct}%`,
    ],
    ["Maintenance / Vacancy", `${d.expenses.maintenancePct}% / ${d.expenses.vacancyPct}%`],
    ["Management / CapEx", `${d.expenses.managementPct}% / ${d.expenses.capexPct}%`],
    ["HOA / Utilities", `${fmtCurrency(d.expenses.hoaMonthly)}/mo  ·  ${fmtCurrency(d.expenses.utilitiesMonthly)}/mo`],
  ], themeColor);
  drawInputBlock(doc, M.left + colW + 12, y, colW, rowH, "Assumptions", [
    ["Rent growth / Expense growth", `${d.expenses.rentGrowth}% / ${d.expenses.expenseGrowth}%`],
    ["Appreciation", `${d.expenses.appreciation}%/yr`],
    ["Selling cost", `${d.expenses.sellingCost}%`],
    ["Tax rate", `${d.expenses.taxRate}%`],
  ], themeColor);
  y += rowH + 22;

  // ── Year-1 operating statement ──────────────────────────────────────────
  // The lender view. Everything above states assumptions; this states what
  // they produce, in the order an underwriter reads it. Skipped entirely for
  // legacy report payloads that predate the field.
  if (d.operatingStatement) {
    y = drawOperatingStatement(doc, d.operatingStatement, y, themeColor);
  }

  // PREPARED BY card was removed — the header subtitle now renders
  // "Prepared by [Name]" bold under the logo, and the footer of every
  // page shows the full "Prepared by [Name] · [Company]" attribution.
  // A third card on page 1 was redundant chrome. Page 1 now ends with
  // the AI Recommendation card; the attribution lives in the header
  // and footer where it belongs.

}

function pageDecisionReadiness(
  doc: jsPDF,
  d: ReportData,
  branding?: BrandingConfig | null
) {
  const confidence = d.inputConfidence;
  if (!confidence) return;

  let y = M.top + 12;
  const themeColor = resolveThemeColor(branding);
  y = sectionTitle(doc, "Decision Readiness", y, undefined, themeColor);
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  y = drawParagraph(
    doc,
    "Deal Score describes the modeled economics. Input Confidence separately describes how decision-ready the assumptions are; it is a deterministic readiness score, not a probability of success.",
    M.left,
    y,
    SAFE.w
  );
  y += 18;

  const cw = (SAFE.w - 24) / 3;
  statCard(doc, M.left, y, cw, 60, "Input Confidence", `${confidence.score}%`, {
    tone: confidence.score >= 80 ? "success" : confidence.score >= 55 ? "warn" : "danger",
    sub: "readiness, not probability",
    themeColor,
  });
  statCard(doc, M.left + cw + 12, y, cw, 60, "Underwriting Stage", confidence.stageLabel, {
    tone: confidence.stageLabel === "Offer Ready" ? "success" : "primary",
    sub: "data-readiness status",
    themeColor,
  });
  statCard(doc, M.left + 2 * (cw + 12), y, cw, 60, "Sensitivity Risk", confidence.sensitivityRisk, {
    tone: confidence.sensitivityRisk === "low" ? "success" : confidence.sensitivityRisk === "moderate" ? "warn" : "danger",
    sub: "unverified-input risk",
    themeColor,
  });
  y += 82;

  y = sectionTitle(doc, "Explicitly Confirmed", y, undefined, themeColor);
  setText(doc, COLOR.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const verifiedText = confidence.verifiedAssumptions.length
    ? confidence.verifiedAssumptions.join("  ·  ")
    : "No assumptions were explicitly confirmed when this report was generated.";
  y = drawParagraph(doc, verifiedText, M.left, y, SAFE.w);
  y += 18;

  y = sectionTitle(doc, "Still To Verify", y, undefined, themeColor);
  if (confidence.unverifiedAssumptions.length === 0) {
    setText(doc, COLOR.text);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("All applicable inputs were explicitly confirmed for this underwrite.", M.left, y);
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: M.left, right: M.right },
      head: [["Input", "Source class", "Current source", "Why it still needs review"]],
      body: confidence.unverifiedAssumptions.map((item) => [
        item.label,
        item.sourceClass,
        item.sourceLabel,
        item.reason,
      ]),
      theme: "grid",
      styles: { font: "helvetica", fontSize: 7.5, cellPadding: 4, textColor: hexToRgb(COLOR.text) },
      headStyles: { fillColor: hexToRgb(themeColor), textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 92 },
        1: { cellWidth: 82 },
        2: { cellWidth: 128 },
      },
    });
  }

  setText(doc, COLOR.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(
    `Input Confidence methodology v${confidence.methodVersion}. Confirmations are tied to the input value and must be re-checked after that value changes.`,
    M.left,
    PAGE.h - M.bottom - 4
  );
}

function drawInputBlock(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  rows: Array<[string, string]>,
  themeColor?: string,
) {
  card(doc, x, y, w, h);
  // Kicker color uses the brand color when set so PROPERTY / FINANCING /
  // OPERATING EXPENSES / ASSUMPTIONS read in the user's brand on
  // branded reports instead of TrueCap blue.
  // Character spacing (charSpace 0.8) matches the typeset treatment
  // applied to all other uppercase kickers throughout the document
  // (ANALYSIS REPORT, stat card labels, section title kickers, etc.).
  const kickerColor =
    themeColor && isValidHex(themeColor) ? themeColor : COLOR.primary;
  // Same 4.5:1 floor sectionTitle applies. Without it a light brand colour
  // (a yellow at ~1.2:1 on white) rendered PROPERTY / FINANCING / OPERATING
  // EXPENSES / ASSUMPTIONS effectively invisible — the section titles stayed
  // readable, so only these six labels vanished.
  const safeKickerColor =
    contrastOnWhite(kickerColor) >= 4.5
      ? kickerColor
      : resolveThemeTextColor({ primaryColorHex: kickerColor });
  setText(doc, safeKickerColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setCharSpace(0.8);
  doc.text(title.toUpperCase(), x + 12, y + 16);
  doc.setCharSpace(0);
  setStroke(doc, COLOR.line);
  doc.setLineWidth(0.4);
  doc.line(x + 12, y + 22, x + w - 12, y + 22);
  rows.forEach((r, i) => {
    const ry = y + 36 + i * 14;
    setText(doc, COLOR.sub);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(r[0], x + 12, ry);
    setText(doc, COLOR.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(r[1], x + w - 12, ry, { align: "right" });
  });
}

function pageProjection(
  doc: jsPDF,
  d: ReportData,
  branding?: BrandingConfig | null
) {
  let y = M.top + 12;
  const themeColor = resolveThemeColor(branding);
  const themeTextColor = resolveThemeTextColor(branding);
  y = sectionTitle(doc, "10-Year Projection", y, undefined, themeColor);
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(
    "Projected cash flow, after-tax returns, and compounding equity over a 10-year hold period.",
    M.left,
    y,
  );
  y += 22;

  // 3 summary cards
  const cw = (SAFE.w - 24) / 3;
  statCard(doc, M.left, y, cw, 64, "Year 10 Cumulative CF", fmtCurrency(d.projection10y.cumulativeCF), { tone: "success", themeColor });
  statCard(doc, M.left + cw + 12, y, cw, 64, "Best Annual After-Tax CF", fmtCurrency(d.projection10y.bestAnnualAfterTax), { tone: "primary", themeColor });
  statCard(doc, M.left + 2 * (cw + 12), y, cw, 64, "10-Year After-Tax Total", fmtCurrency(d.projection10y.totalAfterTax), { tone: "violet", themeColor });
  y += 64 + 20;

  // 2x2 charts
  const chW = (SAFE.w - 12) / 2;
  const chH = 150;
  const labels = d.projection10y.rows.map((r) => `Y${r.y}`);

  // Year-1 cash-flow waterfall — how gross rent becomes net cash flow, the
  // single most intuitive "where does the money go?" visual for an investor.
  // Floating bars: rent rises from 0, operating expenses and debt service step
  // it down, net cash flow lands from the baseline. Uses the Year-1 projection
  // row so it ties out to the table below.
  const wfRow = d.projection10y.rows[0];
  const wfGross = wfRow.rental;
  const wfOpex = wfRow.opex;
  const wfDebt = wfRow.debt;
  const wfNet = wfRow.net;
  // Labels show the SIGNED STEP each bar represents, not the running total —
  // a waterfall reads as "+30K, -11K, -16K, = 3K".
  const wfSteps = [wfGross, -wfOpex, -wfDebt, wfNet];

  drawChartCard(doc, M.left, y, chW, chH, "Annual Cash Flow", (box) =>
    drawBarChart(doc, {
      box,
      data: d.projection10y.rows.map((r) => ({
        label: `Y${r.y}`,
        value: r.net,
        color: r.net >= 0 ? themeColor : COLOR.danger,
      })),
      // 10 bars in half a page: per-bar values would collide, and the table
      // directly below carries the exact figures.
      showValues: false,
    })
  );
  drawChartCard(doc, M.left + chW + 12, y, chW, chH, "Year-1 Cash Flow", (box) =>
    drawBarChart(doc, {
      box,
      data: [
        { label: "Gross Rent", value: wfGross, from: 0, color: COLOR.success },
        { label: "Op. Expenses", value: wfGross - wfOpex, from: wfGross, color: COLOR.danger },
        {
          label: "Debt Service",
          value: wfGross - wfOpex - wfDebt,
          from: wfGross - wfOpex,
          color: COLOR.warn,
        },
        { label: "Net Cash Flow", value: wfNet, from: 0, color: wfNet >= 0 ? themeColor : COLOR.danger },
      ].map((bar, i) => ({ ...bar, valueLabel: fmtChartMoney(wfSteps[i]!) })),
    })
  );
  y += chH + 12;
  drawChartCard(doc, M.left, y, chW, chH, "Cumulative Cash Flow", (box) =>
    drawLineChart(doc, {
      box,
      labels,
      series: [
        {
          label: "Cumulative CF",
          values: d.projection10y.rows.map((r) => r.cum),
          color: COLOR.violet,
          fill: true,
        },
      ],
      endpointLabel: true,
      showPoints: false,
    })
  );
  drawChartCard(doc, M.left + chW + 12, y, chW, chH, "After-Tax Growth", (box) =>
    drawBarChart(doc, {
      box,
      data: d.projection10y.rows.map((r) => ({
        label: `Y${r.y}`,
        value: r.after,
        color: r.after >= 0 ? COLOR.success : COLOR.danger,
      })),
      showValues: false,
    })
  );
  y += chH + 20;

  // Table
  autoTable(doc, {
    startY: y,
    margin: { left: M.left, right: M.right },
    head: [["Year", "Rental Income", "Op. Expenses", "Debt Service", "Net CF", "Tax Effect", "After-Tax CF", "Cumulative CF"]],
    body: d.projection10y.rows.map((r) => [
      `Y${r.y}`,
      fmtCurrency(r.rental),
      fmtCurrency(r.opex),
      fmtCurrency(r.debt),
      { content: fmtCurrency(r.net), styles: { textColor: r.net >= 0 ? hexToRgb(COLOR.successText) : hexToRgb(COLOR.danger) } },
      fmtCurrency(r.tax),
      {
        // Tone follows the SIGN. after-tax CF is netCashFlow + taxSavings with
        // savings floored at 0, so it is negative on any negative-cash-flow
        // deal — and printing a loss in bold green, directly beside a "Net CF"
        // column that correctly renders red, told the reader the opposite of
        // the truth.
        content: fmtCurrency(r.after),
        styles: {
          textColor: hexToRgb(r.after >= 0 ? COLOR.successText : COLOR.danger),
          fontStyle: "bold",
        },
      },
      fmtCurrency(r.cum),
    ]),
    theme: "plain",
    styles: { font: "helvetica", fontSize: 8.2, cellPadding: 4, lineColor: hexToRgb(COLOR.line), lineWidth: 0.3 },
    headStyles: { fillColor: hexToRgb(COLOR.cardSoft), textColor: hexToRgb(themeTextColor), fontStyle: "bold", fontSize: 7.5, lineWidth: { bottom: 0.6, top: 0, left: 0, right: 0 }, lineColor: hexToRgb(themeColor) },
    columnStyles: {
      0: { fontStyle: "bold", textColor: hexToRgb(COLOR.ink) },
      ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((i) => [i, { halign: "right" as const }])),
    },
    alternateRowStyles: { fillColor: [252, 253, 255] },
    didParseCell: alignNumericHeaders,
  });
}

function pageDownside(
  doc: jsPDF,
  d: ReportData,
  branding?: BrandingConfig | null
) {
  if (!d.downsideScenario) return;
  let y = M.top + 12;
  const themeColor = resolveThemeColor(branding);
  const themeTextColor = resolveThemeTextColor(branding);
  y = sectionTitle(doc, "Downside Scenario", y, undefined, themeColor);

  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const intro = doc.splitTextToSize(
    `A reproducible operating stress: ${d.downsideScenario.label}. This is not a forecast; it shows how the underwrite responds if several assumptions move against you at once.`,
    SAFE.w
  );
  doc.text(intro, M.left, y);
  y += intro.length * 12 + 18;

  const stressed = d.downsideScenario;
  // A financed deal with NEGATIVE NOI has a NEGATIVE dscr, not zero
  // (calc-analysis: `annualDebtService > 0 ? noiAnnual / annualDebtService : 0`),
  // so `dscr > 0` classified the worst deals in the product as cash purchases
  // and printed "Cash purchase" in the DSCR row of a mortgaged property.
  // Non-zero is the real test for "there is debt service".
  const financed = d.performance.dscr !== 0 || stressed.dscr !== 0;
  const survives = stressed.monthlyCashFlow >= 0 && (!financed || stressed.dscr >= 1);
  const verdictTone = survives ? "success" : "danger";

  const cw = (SAFE.w - 36) / 4;
  statCard(doc, M.left, y, cw, 64, "Stressed Cash Flow", `${fmtCurrency(stressed.monthlyCashFlow, true)}/mo`, {
    tone: stressed.monthlyCashFlow >= 0 ? "success" : "danger",
    themeColor,
  });
  statCard(doc, M.left + cw + 12, y, cw, 64, "Stressed Cap Rate", fmtPct(stressed.capRate), {
    tone: "primary",
    themeColor,
  });
  statCard(doc, M.left + 2 * (cw + 12), y, cw, 64, "Stressed CoC", fmtPct(stressed.cocReturn), {
    tone: stressed.cocReturn >= 0 ? "success" : "danger",
    themeColor,
  });
  statCard(doc, M.left + 3 * (cw + 12), y, cw, 64, "Stressed DSCR", financed ? stressed.dscr.toFixed(2) : "Cash", {
    tone: financed && stressed.dscr < 1 ? "danger" : "neutral",
    themeColor,
  });
  y += 88;

  if (d.maxOffer) {
    card(doc, M.left, y, SAFE.w, 108, { soft: true });
    // Brand colour, not a fixed TrueCap blue — this page already resolved it.
    setText(doc, themeColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setCharSpace(0.7);
    doc.text("DEAL DOCTOR", M.left + 16, y + 20);
    doc.setCharSpace(0);
    setText(doc, COLOR.ink);
    doc.setFontSize(14);
    doc.text(`Price ceiling ${fmtCurrency(d.maxOffer.maxPrice)}`, M.left + 16, y + 42);
    setText(doc, COLOR.sub);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const rentFix = d.maxOffer.requiredMonthlyRent;
    const rateFix = d.maxOffer.requiredInterestRate;
    const alternatives = [
      rentFix && !rentFix.alreadyMet && !rentFix.unreachable
        ? `rent at least ${fmtCurrency(rentFix.value)}/mo`
        : null,
      rateFix && !rateFix.alreadyMet && !rateFix.unreachable
        ? `interest rate at or below ${rateFix.value.toFixed(2)}%`
        : null,
    ].filter((value): value is string => Boolean(value));
    const doctorText = `Criteria: ${d.maxOffer.basis}. At the current asking price${
      alternatives.length ? `, the same target could also be reached with ${alternatives.join(" or ")}.` : ", review the verified inputs before negotiating."
    } Calculated from your selected targets. This is not a recommended offer.`;
    doc.text(doc.splitTextToSize(doctorText, SAFE.w - 32), M.left + 16, y + 61);
    y += 132;
  }

  card(doc, M.left, y, SAFE.w, 78, { soft: true });
  setText(doc, survives ? COLOR.success : COLOR.danger);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(
    survives ? "The deal remains cash-flow positive under this stress." : "The deal does not fully survive this stress.",
    M.left + 16,
    y + 27
  );
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const verdictText = doc.splitTextToSize(
    `Stressed verdict: ${stressed.verdict}. Verify achievable rent, vacancy history, current financing quotes, taxes, insurance, and major repairs before relying on either case.`,
    SAFE.w - 32
  );
  doc.text(verdictText, M.left + 16, y + 47);
  y += 102;

  const deltaMoney = stressed.monthlyCashFlow - d.performance.monthlyCashFlow;
  const deltaCap = stressed.capRate - d.performance.capRate;
  const deltaCoc = stressed.cocReturn - d.performance.cocReturn;
  const deltaDscr = stressed.dscr - d.performance.dscr;
  autoTable(doc, {
    startY: y,
    margin: { left: M.left, right: M.right },
    head: [["Metric", "Base case", "Downside case", "Change"]],
    body: [
      ["Monthly cash flow", `${fmtCurrency(d.performance.monthlyCashFlow, true)}/mo`, `${fmtCurrency(stressed.monthlyCashFlow, true)}/mo`, `${fmtCurrency(deltaMoney, true)}/mo`],
      ["Cap rate", fmtPct(d.performance.capRate), fmtPct(stressed.capRate), `${deltaCap >= 0 ? "+" : ""}${deltaCap.toFixed(1)}pp`],
      ["Cash-on-cash", fmtPct(d.performance.cocReturn), fmtPct(stressed.cocReturn), `${deltaCoc >= 0 ? "+" : ""}${deltaCoc.toFixed(1)}pp`],
      ["DSCR", financed ? d.performance.dscr.toFixed(2) : "Cash purchase", financed ? stressed.dscr.toFixed(2) : "Cash purchase", financed ? `${deltaDscr >= 0 ? "+" : ""}${deltaDscr.toFixed(2)}` : "—"],
    ],
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9, cellPadding: 6, lineColor: hexToRgb(COLOR.line), lineWidth: 0.3 },
    headStyles: { fillColor: hexToRgb(COLOR.cardSoft), textColor: hexToRgb(themeTextColor), fontStyle: "bold", fontSize: 8, lineWidth: { bottom: 0.6, top: 0, left: 0, right: 0 }, lineColor: hexToRgb(themeColor) },
    columnStyles: {
      0: { fontStyle: "bold", textColor: hexToRgb(COLOR.ink) },
      2: { textColor: hexToRgb(verdictTone === "success" ? COLOR.success : COLOR.danger), fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [252, 253, 255] },
    didParseCell: alignNumericHeaders,
  });
}

/**
 * A titled card with a chart drawn INSIDE it as vectors.
 *
 * Previously took a PNG data URL from chart.js. Now it takes a draw callback
 * and hands it the plot rectangle, so the chart is real PDF geometry — sharp
 * at any zoom, a fraction of the bytes, and renderable without a DOM.
 */
/**
 * Right-align every head cell except the first (the label column).
 *
 * autoTable applies `columnStyles` to BODY cells but not to head cells in this
 * version, so setting halign there alone produced right-aligned figures under
 * left-aligned headers — worse than the original, because the mismatch reads
 * as a mistake rather than a convention. This hook aligns the header to its
 * own column.
 */
const alignNumericHeaders = (data: { section: string; column: { index: number }; cell: { styles: { halign?: string } } }) => {
  if (data.section === "head" && data.column.index > 0) data.cell.styles.halign = "right";
};

function drawChartCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  draw: (box: ChartBox) => void
) {
  card(doc, x, y, w, h);
  setText(doc, COLOR.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title, x + 12, y + 16);
  const padX = 10;
  const padTop = 26;
  // Room for the x-axis labels that sit below the plot.
  const padBottom = 18;
  draw({ x: x + padX, y: y + padTop, w: w - padX * 2, h: h - padTop - padBottom });
}

function pageTax(
  doc: jsPDF,
  d: ReportData,
  branding?: BrandingConfig | null
) {
  let y = M.top + 12;
  const themeColor = resolveThemeColor(branding);
  const themeTextColor = resolveThemeTextColor(branding);
  y = sectionTitle(doc, "Illustrative Tax Impact", y, undefined, themeColor);
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Modeled rental-income and deduction effects at the entered marginal tax rate.", M.left, y);
  y += 22;

  // 2x2 summary cards
  const cw = (SAFE.w - 12) / 2;
  const ch = 60;
  statCard(doc, M.left, y, cw, ch, "Year 1 Taxable Rental Income", fmtCurrency(d.taxStrategy.year1Taxable), { tone: d.taxStrategy.year1Taxable < 0 ? "success" : "warn", themeColor });
  statCard(doc, M.left + cw + 12, y, cw, ch, "Year 1 Modeled Tax Savings", fmtCurrency(d.taxStrategy.year1Savings), { tone: "success", themeColor });
  y += ch + 12;
  statCard(doc, M.left, y, cw, ch, "10-Year Modeled Tax Impact", fmtCurrency(d.taxStrategy.totalBenefit10y), { tone: "primary", themeColor });
  statCard(doc, M.left + cw + 12, y, cw, ch, "Annual Depreciation", fmtCurrency(d.taxStrategy.annualDepreciation), { tone: "violet", themeColor });
  y += ch + 20;

  const labels = d.taxStrategy.rows.map((r) => `Y${r.y}`);
  const chW = (SAFE.w - 12) / 2;
  const chH = 130;

  drawChartCard(doc, M.left, y, chW, chH, "Modeled Annual Tax Savings", (box) =>
    drawBarChart(doc, {
      box,
      data: d.taxStrategy.rows.map((r) => ({
        label: `Y${r.y}`,
        value: r.savings,
        color: r.savings >= 0 ? COLOR.success : COLOR.danger,
      })),
      showValues: false,
    })
  );
  drawChartCard(doc, M.left + chW + 12, y, chW, chH, "Taxable Rental Income Trend", (box) =>
    drawLineChart(doc, {
      box,
      labels,
      series: [
        {
          label: "Taxable Income",
          values: d.taxStrategy.rows.map((r) => r.taxable),
          color: themeColor,
          fill: true,
        },
      ],
      endpointLabel: true,
      showPoints: false,
    })
  );
  y += chH + 12;
  drawChartCard(doc, M.left, y, chW, chH, "Interest vs Depreciation", (box) =>
    drawLineChart(doc, {
      box,
      labels,
      series: [
        {
          label: "Mortgage Interest",
          values: d.taxStrategy.rows.map((r) => r.interest),
          color: COLOR.violet,
        },
        {
          label: "Depreciation",
          values: d.taxStrategy.rows.map((r) => r.dep),
          color: COLOR.warn,
        },
      ],
      showPoints: false,
    })
  );
  drawChartCard(doc, M.left + chW + 12, y, chW, chH, "Deductions Breakdown", (box) =>
    drawStackedBarChart(doc, {
      box,
      labels,
      series: [
        { label: "Op. Expenses", values: d.taxStrategy.rows.map((r) => r.opex), color: COLOR.danger },
        { label: "Interest", values: d.taxStrategy.rows.map((r) => r.interest), color: COLOR.violet },
        { label: "Depreciation", values: d.taxStrategy.rows.map((r) => r.dep), color: COLOR.warn },
      ],
    })
  );
  y += chH + 20;

  autoTable(doc, {
    startY: y,
    margin: { left: M.left, right: M.right },
    head: [["Year", "Rental", "Op. Exp.", "Interest Ded.", "Depreciation", "Total Ded.", "Taxable Income", "Modeled Savings", "Net Tax Impact"]],
    body: d.taxStrategy.rows.map((r) => [
      `Y${r.y}`,
      fmtCurrency(r.rental),
      fmtCurrency(r.opex),
      fmtCurrency(r.interest),
      fmtCurrency(r.dep),
      fmtCurrency(r.total),
      { content: fmtCurrency(r.taxable), styles: { textColor: r.taxable < 0 ? hexToRgb(COLOR.successText) : hexToRgb(COLOR.danger) } },
      { content: fmtCurrency(r.savings), styles: { textColor: hexToRgb(COLOR.successText), fontStyle: "bold" } },
      { content: fmtCurrency(r.benefit), styles: { textColor: r.benefit >= 0 ? hexToRgb(COLOR.successText) : hexToRgb(COLOR.danger) } },
    ]),
    theme: "plain",
    styles: { font: "helvetica", fontSize: 7.8, cellPadding: 3.5, lineColor: hexToRgb(COLOR.line), lineWidth: 0.3 },
    headStyles: { fillColor: hexToRgb(COLOR.cardSoft), textColor: hexToRgb(themeTextColor), fontStyle: "bold", fontSize: 7.2, lineWidth: { bottom: 0.6, top: 0, left: 0, right: 0 }, lineColor: hexToRgb(themeColor) },
    columnStyles: {
      0: { fontStyle: "bold", textColor: hexToRgb(COLOR.ink) },
      ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((i) => [i, { halign: "right" as const }])),
    },
    alternateRowStyles: { fillColor: [252, 253, 255] },
    didParseCell: alignNumericHeaders,
  });
}

function pageExit(
  doc: jsPDF,
  d: ReportData,
  branding?: BrandingConfig | null
) {
  let y = M.top + 12;
  const themeColor = resolveThemeColor(branding);
  const themeTextColor = resolveThemeTextColor(branding);
  y = sectionTitle(doc, "Exit Scenarios", y, undefined, themeColor);
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Equity build-up and projected sale proceeds across a 10-year hold horizon.", M.left, y);
  y += 22;

  const cw = (SAFE.w - 12) / 2;
  const ch = 60;
  const highestProfitExit = d.exitScenarios.rows.reduce<(typeof d.exitScenarios.rows)[number] | null>(
    (best, row) => (!best || row.profit > best.profit ? row : best),
    null
  );
  statCard(
    doc,
    M.left,
    y,
    cw,
    ch,
    "Highest Modeled Profit",
    highestProfitExit ? fmtCurrency(highestProfitExit.profit) : "—",
    highestProfitExit
      ? {
          tone: highestProfitExit.profit >= 0 ? "success" : "danger",
          sub: `Year ${highestProfitExit.y} among modeled exits`,
          themeColor,
        }
      : { tone: "neutral", themeColor }
  );
  statCard(doc, M.left + cw + 12, y, cw, ch, "Year 5 Profit", fmtCurrency(d.exitScenarios.year5Profit), { tone: "primary", themeColor });
  y += ch + 12;
  statCard(doc, M.left, y, cw, ch, "Year 10 Profit", fmtCurrency(d.exitScenarios.year10Profit), { tone: "success", themeColor });
  // Extreme cumulative ROI (Choose-TrueCap finding 5): the PDF card shows
  // the framed band with the raw figure demoted to the sub line (no hover
  // in print) and a warn tone instead of the celebratory violet. Sane
  // values keep the exact fmtPct formatting as before.
  const totalRoiHeadline = formatRoiHeadline(d.exitScenarios.totalROI, { decimals: 1, signed: true, compact: true });
  statCard(
    doc,
    M.left + cw + 12,
    y,
    cw,
    ch,
    "Total ROI",
    totalRoiHeadline.extreme ? totalRoiHeadline.text : fmtPct(d.exitScenarios.totalROI, true),
    totalRoiHeadline.extreme
      ? { tone: "warn", sub: `${totalRoiHeadline.raw} cumulative — verify assumptions`, themeColor }
      : { tone: "violet", themeColor }
  );
  y += ch + 20;

  const labels = d.exitScenarios.rows.map((r) => `Y${r.y}`);
  const chW = (SAFE.w - 12) / 2;
  const chH = 130;

  drawChartCard(doc, M.left, y, chW, chH, "Property Value vs Loan", (box) =>
    drawLineChart(doc, {
      box,
      labels,
      series: [
        {
          label: "Property Value",
          values: d.exitScenarios.rows.map((r) => r.value),
          color: themeColor,
        },
        {
          label: "Loan Balance",
          values: d.exitScenarios.rows.map((r) => r.loan),
          color: COLOR.danger,
        },
      ],
      showPoints: false,
    })
  );
  drawChartCard(doc, M.left + chW + 12, y, chW, chH, "Equity Growth", (box) =>
    drawLineChart(doc, {
      box,
      labels,
      series: [
        {
          label: "Equity",
          values: d.exitScenarios.rows.map((r) => r.equity),
          color: COLOR.success,
          fill: true,
        },
      ],
      endpointLabel: true,
      showPoints: false,
    })
  );
  y += chH + 12;
  drawChartCard(doc, M.left, y, chW, chH, "Profit Over Time", (box) =>
    drawLineChart(doc, {
      box,
      labels,
      series: [
        {
          label: "Total Profit",
          values: d.exitScenarios.rows.map((r) => r.profit),
          color: COLOR.violet,
          fill: true,
        },
      ],
      endpointLabel: true,
      showPoints: false,
    })
  );
  // WAS a stacked "Profit Breakdown" of Net Sale Proceeds + Total Profit. That
  // chart was wrong twice over: profit is DERIVED from net sale proceeds
  // (lib/exit-scenarios.ts), so stacking them double-counted and the bar's
  // total height was a number with no financial meaning; and the profit series
  // was clamped with Math.max(profit, 0) while the legend still said "Total
  // Profit", so a loss-making exit year rendered as a zero-height segment
  // indistinguishable from break-even. Hiding the downside is the one thing a
  // lender-facing document must never do.
  //
  // Profit already has an honest home in "Profit Over Time" above, signed and
  // against a zero line. This slot now shows the other half of the exit — what
  // the sale actually nets after costs and loan payoff — as a plain series.
  drawChartCard(doc, M.left + chW + 12, y, chW, chH, "Net Sale Proceeds", (box) =>
    drawBarChart(doc, {
      box,
      data: d.exitScenarios.rows.map((r) => ({
        label: `Y${r.y}`,
        value: r.netSale,
        color: r.netSale >= 0 ? themeColor : COLOR.danger,
      })),
      showValues: false,
    })
  );
  y += chH + 20;

  autoTable(doc, {
    startY: y,
    margin: { left: M.left, right: M.right },
    head: [["Year", "Property Value", "Loan Balance", "Equity", "Net Sale Proceeds", "Total Profit"]],
    body: d.exitScenarios.rows.map((r) => [
      `Y${r.y}`,
      fmtCurrency(r.value),
      fmtCurrency(r.loan),
      { content: fmtCurrency(r.equity), styles: { textColor: hexToRgb(COLOR.successText), fontStyle: "bold" } },
      fmtCurrency(r.netSale),
      { content: fmtCurrency(r.profit), styles: { textColor: r.profit >= 0 ? hexToRgb(COLOR.successText) : hexToRgb(COLOR.danger), fontStyle: "bold" } },
    ]),
    theme: "plain",
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 4.5, lineColor: hexToRgb(COLOR.line), lineWidth: 0.3 },
    headStyles: { fillColor: hexToRgb(COLOR.cardSoft), textColor: hexToRgb(themeTextColor), fontStyle: "bold", fontSize: 7.5, lineWidth: { bottom: 0.6, top: 0, left: 0, right: 0 }, lineColor: hexToRgb(themeColor) },
    columnStyles: {
      0: { fontStyle: "bold", textColor: hexToRgb(COLOR.ink) },
      ...Object.fromEntries([1, 2, 3, 4, 5].map((i) => [i, { halign: "right" as const }])),
    },
    alternateRowStyles: { fillColor: [252, 253, 255] },
    didParseCell: alignNumericHeaders,
  });
}

function pageComps(doc: jsPDF, d: ReportData, branding?: BrandingConfig | null) {
  const c = d.comps;
  if (!c) return;
  let y = M.top + 12;
  const themeColor = resolveThemeColor(branding);
  const themeTextColor = resolveThemeTextColor(branding);
  y = sectionTitle(doc, "Sale & Rent Comps", y, undefined, themeColor);
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  // WRAPPED, not a single text call. Adding the pull date pushed this line
  // past the right margin and it silently clipped mid-word — a one-line
  // subtitle only fits until the day someone lengthens it.
  const compsSubtitle = c.fetchedAt
    ? `Comparable sales and rentals near this property. Pulled ${new Date(c.fetchedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} via RentCast — reference only, not used in the analysis math.`
    : "Comparable sales and rentals near this property (RentCast). Reference only — not used in the analysis math.";
  const compsSubtitleLines = doc.splitTextToSize(compsSubtitle, SAFE.w) as string[];
  doc.text(compsSubtitleLines, M.left, y, { lineHeightFactor: 1.35 });
  y += 22 + (compsSubtitleLines.length - 1) * 12;

  const cw = (SAFE.w - 12) / 2;
  const ch = 60;
  statCard(doc, M.left, y, cw, ch, "Estimated Value", c.valueEstimate != null ? fmtCurrency(c.valueEstimate) : "—", { tone: "primary", themeColor });
  statCard(doc, M.left + cw + 12, y, cw, ch, "Estimated Rent", c.rentEstimate != null ? `${fmtCurrency(c.rentEstimate)}/mo` : "—", { tone: "success", themeColor });
  y += ch + 10;

  const valRange =
    c.valueRange && c.valueRange.low != null && c.valueRange.high != null
      ? `Value range ${fmtCurrency(c.valueRange.low)}–${fmtCurrency(c.valueRange.high)}`
      : null;
  const rentRange =
    c.rentRange && c.rentRange.low != null && c.rentRange.high != null
      ? `Rent range ${fmtCurrency(c.rentRange.low)}–${fmtCurrency(c.rentRange.high)}/mo`
      : null;
  const rangeLine = [valRange, rentRange].filter(Boolean).join("     ·     ");
  if (rangeLine) {
    setText(doc, COLOR.sub);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(rangeLine, M.left, y);
    y += 18;
  }
  y += 4;

  // $/sqft is the normalizer every comp conversation runs on — without it the
  // reader has to divide six rows in their head to know whether a comp is
  // actually comparable. Computed in lib/report-comps.ts, never here.
  const rowOf = (perSqftDecimals: 0 | 2) => (s: {
    address: string;
    price: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    squareFootage: number | null;
    distanceMiles: number | null;
    pricePerSqft?: number | null;
  }) => [
    s.address,
    s.price != null ? fmtCurrency(s.price) : "—",
    s.pricePerSqft != null
      ? perSqftDecimals === 0
        ? fmtCurrency(s.pricePerSqft)
        : `$${s.pricePerSqft.toFixed(2)}`
      : "—",
    s.bedrooms != null ? String(s.bedrooms) : "—",
    s.bathrooms != null ? String(s.bathrooms) : "—",
    s.squareFootage != null ? s.squareFootage.toLocaleString("en-US") : "—",
    s.distanceMiles != null ? s.distanceMiles.toFixed(2) : "—",
  ];

  if (c.saleComps.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(doc, COLOR.ink);
    doc.text("Sale comps", M.left, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: M.left, right: M.right },
      head: [["Address", "Sale Price", "$/sqft", "Bd", "Ba", "Sq Ft", "Dist (mi)"]],
      body: c.saleComps.map(rowOf(0)),
      theme: "plain",
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 4.5, lineColor: hexToRgb(COLOR.line), lineWidth: 0.3 },
      headStyles: { fillColor: hexToRgb(COLOR.cardSoft), textColor: hexToRgb(themeTextColor), fontStyle: "bold", fontSize: 7.5, lineWidth: { bottom: 0.6, top: 0, left: 0, right: 0 }, lineColor: hexToRgb(themeColor) },
      columnStyles: {
        1: { fontStyle: "bold", textColor: hexToRgb(COLOR.ink), halign: "right" },
        // 2..6 — the $/sqft column added one, and a stale range left the
        // distance column alone on the left.
        ...Object.fromEntries([2, 3, 4, 5, 6].map((i) => [i, { halign: "right" as const }])),
      },
      alternateRowStyles: { fillColor: [252, 253, 255] },
      didParseCell: alignNumericHeaders,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  }

  if (c.rentComps.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(doc, COLOR.ink);
    doc.text("Rent comps", M.left, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: M.left, right: M.right },
      head: [["Address", "Rent / mo", "$/sqft", "Bd", "Ba", "Sq Ft", "Dist (mi)"]],
      body: c.rentComps.map(rowOf(2)),
      theme: "plain",
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 4.5, lineColor: hexToRgb(COLOR.line), lineWidth: 0.3 },
      headStyles: { fillColor: hexToRgb(COLOR.cardSoft), textColor: hexToRgb(themeTextColor), fontStyle: "bold", fontSize: 7.5, lineWidth: { bottom: 0.6, top: 0, left: 0, right: 0 }, lineColor: hexToRgb(themeColor) },
      columnStyles: {
        1: { fontStyle: "bold", textColor: hexToRgb(COLOR.ink), halign: "right" },
        // 2..6 — the $/sqft column added one, and a stale range left the
        // distance column alone on the left.
        ...Object.fromEntries([2, 3, 4, 5, 6].map((i) => [i, { halign: "right" as const }])),
      },
      alternateRowStyles: { fillColor: [252, 253, 255] },
      didParseCell: alignNumericHeaders,
    });
  }
}

/**
 * Draws a wrapped paragraph at (x, y) within width w and returns the y
 * just below the last line. Keeps the multi-paragraph Disclosures page
 * readable without hand-counting line offsets.
 */
function drawParagraph(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  w: number,
  opts: { size?: number; color?: string; leading?: number } = {}
): number {
  const size = opts.size ?? 9.5;
  const leading = opts.leading ?? 1.45;
  setText(doc, opts.color ?? COLOR.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  doc.setCharSpace(0);
  const lines = doc.splitTextToSize(text, w) as string[];
  doc.text(lines, x, y, { lineHeightFactor: leading });
  return y + lines.length * size * leading;
}

/**
 * Closing page: states the assumptions the projections rest on and the
 * disclosures a serious reader (a lender, a partner, a client's attorney)
 * expects. Both credibility and CYA — an investor report without an
 * assumptions/disclaimer page reads as a back-of-napkin estimate.
 */
function pageDisclosures(doc: jsPDF, d: ReportData, branding?: BrandingConfig | null) {
  let y = M.top + 12;
  const themeColor = resolveThemeColor(branding);
  y = sectionTitle(doc, "Assumptions & Disclosures", y, undefined, themeColor);
  y = drawParagraph(
    doc,
    "Every figure in this report is a projection derived from the inputs and assumptions below. Actual results will vary. The assumptions are shown here in full so the analysis can be reviewed, stress-tested, and reproduced.",
    M.left,
    y,
    SAFE.w,
    { size: 9.5, color: COLOR.sub }
  );
  y += 16;

  // Key assumptions — reuse the input-block grid for a familiar, scannable
  // two-column layout.
  const colW = (SAFE.w - 12) / 2;
  const rowH = 92;
  drawInputBlock(
    doc,
    M.left,
    y,
    colW,
    rowH,
    "Growth & Exit",
    [
      ["Rent growth", `${d.expenses.rentGrowth}% / yr`],
      ["Expense growth", `${d.expenses.expenseGrowth}% / yr`],
      ["Appreciation", `${d.expenses.appreciation}% / yr`],
      ["Selling cost", `${d.expenses.sellingCost}%`],
    ],
    themeColor
  );
  drawInputBlock(
    doc,
    M.left + colW + 12,
    y,
    colW,
    rowH,
    "Operating & Tax",
    [
      ["Vacancy", `${d.expenses.vacancyPct}%`],
      ["Management", `${d.expenses.managementPct}%`],
      ["Maintenance / CapEx", `${d.expenses.maintenancePct}% / ${d.expenses.capexPct}%`],
      ["Assumed tax rate", `${d.expenses.taxRate}%`],
    ],
    themeColor
  );
  y += rowH + 24;

  y = sectionTitle(
    doc,
    d.methodologyLabel ??
      `${TRUECAP_UNDERWRITING_STANDARD_NAME} v${d.methodologyVersion ?? TRUECAP_UNDERWRITING_STANDARD_VERSION}`,
    y,
    undefined,
    themeColor
  );
  y = drawParagraph(
    doc,
    "Returns are computed from the purchase price, financing terms, rents, and operating expenses entered for this property. The 10-year projection grows rents and operating expenses at the rates above and amortizes the loan on its stated schedule. NOI and lender-style DSCR exclude the CapEx reserve; cash flow includes it. PMI/MIP, when modeled, is included in cash flow but excluded from lender-style DSCR.",
    M.left,
    y,
    SAFE.w
  );
  y += 14;
  y = drawParagraph(
    doc,
    "Any HUD auto-filled rent is an area rent benchmark, not a property-specific rent opinion or local comparable. Any FRED auto-filled rate is an owner-occupied national mortgage benchmark, not an investor-loan quote, approval, or commitment. Replace both with verified local rents and written lender terms before making an offer.",
    M.left,
    y,
    SAFE.w
  );
  y += 14;
  y = drawParagraph(
    doc,
    "Illustrative tax impact applies the entered marginal rate to modeled rental income and deductions. It does not determine whether losses are usable or model passive-activity, at-risk, material-participation, filing-status, state/local-tax, mixed personal/rental-use allocation, or individual eligibility rules. Exit comparisons rank only the modeled hold years under the stated appreciation, selling-cost, cash-flow, and simplified exit-tax assumptions; the highest modeled profit is not a recommendation to sell in that year.",
    M.left,
    y,
    SAFE.w
  );
  y += 22;

  y = sectionTitle(doc, "Disclaimer", y, undefined, themeColor);
  y = drawParagraph(
    doc,
    "This report is provided for informational purposes only and does not constitute financial, investment, tax, or legal advice. Projections are estimates based on the inputs and assumptions stated above and are not guarantees of future performance. Rents, expenses, interest rates, market conditions, and tax law can change. Independently verify all figures and consult licensed professionals before making any investment decision.",
    M.left,
    y,
    SAFE.w,
    { color: COLOR.sub }
  );
}

// ===================== Public API =====================
async function buildInvestmentPDFDocument(
  data: ReportData,
  branding?: BrandingConfig | null,
  mode: ReportMode = "personal"
) {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const d = data;

  // Document metadata. Without a Title a viewer shows the raw filename in its
  // tab and window chrome, and assistive tech has no document name to announce
  // — on a file the user forwards to a lender, that is the first thing they
  // see. Author follows the white-label: a branded pack is the agent's
  // document, not TrueCap's.
  doc.setProperties({
    title: `Investment Analysis — ${d.property.address}`,
    subject: `Rental underwriting for ${d.property.address}`,
    author: branding?.companyName?.trim() || "TrueCap",
    creator: "TrueCap",
    keywords: [
      "rental property analysis",
      d.property.type,
      `NOI`,
      `DSCR`,
      TRUECAP_UNDERWRITING_STANDARD_NAME,
    ].join(", "),
  });

  // Logo source — branded URL if present and valid, else the TrueCap
  // default. The custom URL is the public Supabase Storage URL; if the
  // fetch fails for any reason (bucket misconfig, network), we fall
  // back to the TrueCap logo so the PDF never renders with a blank
  // header.
  let logoData = null as Awaited<ReturnType<typeof loadLogoDataUrl>>;
  if (branding?.logoUrl) {
    logoData = await loadLogoDataUrl(branding.logoUrl);
  }
  // Fall back to the TrueCap mark ONLY for unbranded reports. A branded
  // report with no uploaded logo must NOT show TrueCap's logo (it would
  // undercut the white-label) — drawHeader / pageCover render the company
  // NAME as a text wordmark instead when logoData is null but branding exists.
  const isBranded = Boolean(
    branding?.companyName?.trim() || branding?.logoUrl || branding?.primaryColorHex
  );
  if (!logoData && !isBranded) {
    logoData = await loadLogoDataUrl(); // TrueCap default
  }

  // Never evaluate the owner's *current* mutable Buy Boxes while rendering a
  // historical report. The canonical Decision + Offer Ceiling above are bound
  // to the captured target/source; mixing in today's box could contradict the
  // saved decision. A frozen rule-by-rule Buy Box snapshot can be reintroduced
  // only once its identity/version is persisted with the analysis.
  const buyBoxVerdict: BuyBoxPdfVerdict | null = null;
  const buyBoxStateResolved = true;

  // Cover page first — the "arrival" beat (address + verdict + bottom line).
  // Self-contained: the running header/footer loop skips page 1.
  pageCover(doc, d, branding ?? null, logoData);
  doc.addPage();
  pageInputs(doc, d, branding ?? null, buyBoxVerdict);
  if (d.inputConfidence) {
    doc.addPage();
    pageDecisionReadiness(doc, d, branding ?? null);
  }
  doc.addPage();
  if (d.downsideScenario) {
    pageDownside(doc, d, branding ?? null);
    doc.addPage();
  }
  pageProjection(doc, d, branding ?? null);
  // Tax Strategy is a personal-tax view — only the full personal report.
  if (mode === "personal") {
    doc.addPage();
    pageTax(doc, d, branding ?? null);
  }
  // Exit Scenarios (returns/IRR) go to personal, partner + agent, not lender.
  if (mode !== "lender") {
    doc.addPage();
    pageExit(doc, d, branding ?? null);
  }
  // Sale + rent comps — reference data valued in every report mode (lenders
  // especially want comps). Renders only when a comp set is present.
  if (d.comps && (d.comps.saleComps.length > 0 || d.comps.rentComps.length > 0)) {
    doc.addPage();
    pageComps(doc, d, branding ?? null);
  }

  // Assumptions & Disclosures — always last. Credibility + CYA for every
  // mode (a lender packet, a partner memo, and a client-facing agent report
  // all expect stated assumptions and a disclaimer).
  doc.addPage();
  pageDisclosures(doc, d, branding ?? null);

  // Add headers/footers AFTER all pages exist
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    if (i === 1) continue; // cover draws its own chrome
    drawHeader(doc, i, total, d.generatedAt, logoData, branding ?? null);
  }

  return {
    doc,
    hasBuyBoxVerdict: buyBoxVerdict !== null,
    buyBoxStateResolved,
  };
}

export type InvestmentPdfArtifact = {
  blob: Blob;
  hasBuyBoxVerdict: boolean;
  buyBoxStateResolved: boolean;
};

/** Server renderer output plus the exact mutable-state metadata needed by
 *  the saved-PDF completion step. Keeping this beside the bytes closes the
 *  render→completion delete/downgrade race without trusting a later lookup. */
export async function generateInvestmentPDFArtifact(
  data: ReportData,
  branding?: BrandingConfig | null,
  mode: ReportMode = "personal"
): Promise<InvestmentPdfArtifact> {
  const rendered = await buildInvestmentPDFDocument(data, branding, mode);
  return {
    blob: rendered.doc.output("blob"),
    hasBuyBoxVerdict: rendered.hasBuyBoxVerdict,
    buyBoxStateResolved: rendered.buyBoxStateResolved,
  };
}

export async function generateInvestmentPDFBlob(
  data: ReportData,
  branding?: BrandingConfig | null,
  mode: ReportMode = "personal"
): Promise<Blob> {
  return (await generateInvestmentPDFArtifact(data, branding, mode)).blob;
}
