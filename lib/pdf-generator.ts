// Use the package's default entry point. The deep "/dist/jspdf.es.min.js"
// path was specific to jspdf v2 and broke in v3/v4 where the bundle layout
// changed — silently failing PDF export.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Chart,
  BarController,
  LineController,
  BarElement,
  PointElement,
  LineElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
  Title,
} from "chart.js";

export interface ReportData {
  generatedAt: Date;
  property: {
    address: string;
    type: string;
    yearBuilt: number;
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
    propertyTaxPct: number;
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
}

Chart.register(
  BarController,
  LineController,
  BarElement,
  PointElement,
  LineElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
  Title,
);

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
  primary: "#2563EB",
  primarySoft: "#EFF4FF",
  success: "#16A34A",
  successSoft: "#ECFDF5",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  warn: "#D97706",
  warnSoft: "#FFFBEB",
  violet: "#7C3AED",
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

/** "#1A4FBA" + 0.12 → "rgba(26, 79, 186, 0.12)". For chart fills/backgrounds. */
function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
const setFill = (doc: jsPDF, hex: string) => doc.setFillColor(...hexToRgb(hex));
const setStroke = (doc: jsPDF, hex: string) => doc.setDrawColor(...hexToRgb(hex));
const setText = (doc: jsPDF, hex: string) => doc.setTextColor(...hexToRgb(hex));

function getRecommendationRiskTextColor(recommendation: string, risk: string): string {
  const normalizedRecommendation = recommendation.trim().toLowerCase();
  const normalizedRisk = risk.trim().toLowerCase();

  if (normalizedRecommendation === "avoid" || normalizedRisk === "high risk") return COLOR.danger;
  if (normalizedRecommendation === "risky" || normalizedRisk === "medium risk" || normalizedRisk === "moderate") {
    return COLOR.warn;
  }
  if (normalizedRisk === "balanced" || normalizedRisk === "low return" || normalizedRecommendation === "neutral") {
    return COLOR.warn;
  }
  if (normalizedRecommendation === "buy") return COLOR.primary;
  return COLOR.success;
}

function getRecommendationPillColor(recommendation: string): { bg: string; fg: string } {
  const normalizedRecommendation = recommendation.trim().toLowerCase();
  if (normalizedRecommendation === "avoid") return { bg: COLOR.danger, fg: "#FFFFFF" };
  if (normalizedRecommendation === "risky" || normalizedRecommendation === "neutral") {
    return { bg: COLOR.warn, fg: "#FFFFFF" };
  }
  if (normalizedRecommendation === "buy") return { bg: COLOR.primary, fg: "#FFFFFF" };
  return { bg: COLOR.success, fg: "#FFFFFF" };
}

function getScorePillColor(score: number): { bg: string; fg: string } {
  if (score >= 70) return { bg: COLOR.success, fg: "#FFFFFF" };
  if (score >= 40) return { bg: COLOR.warn, fg: "#FFFFFF" };
  return { bg: COLOR.danger, fg: "#FFFFFF" };
}

function getRiskPillColor(risk: string): { bg: string; fg: string } {
  const normalizedRisk = risk.trim().toLowerCase();
  if (normalizedRisk === "low risk") return { bg: COLOR.success, fg: "#FFFFFF" };
  if (normalizedRisk === "high risk") return { bg: COLOR.danger, fg: "#FFFFFF" };
  return { bg: COLOR.warn, fg: "#FFFFFF" };
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

async function loadLogoDataUrl(
  src: string = "/Logo-png-w.png"
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const response = await fetch(src);
    if (!response.ok) return null;
    const blob = await response.blob();
    const rawDataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    if (!rawDataUrl) return null;
    const image = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = rawDataUrl;
    });
    if (!image) return { dataUrl: rawDataUrl, width: 1, height: 1 };
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || 1;
    canvas.height = image.naturalHeight || 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { dataUrl: rawDataUrl, width: image.naturalWidth || 1, height: image.naturalHeight || 1 };
    }
    ctx.drawImage(image, 0, 0);
    return {
      dataUrl: canvas.toDataURL("image/png", 1),
      width: image.naturalWidth || 1,
      height: image.naturalHeight || 1,
    };
  } catch {
    return null;
  }
}

// ===================== Chart rendering (offscreen) =====================
async function renderChart(config: any, w = 800, h = 420): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  // offscreen
  canvas.style.position = "fixed";
  canvas.style.left = "-99999px";
  document.body.appendChild(canvas);
  const chart = new Chart(canvas, {
    ...config,
    options: {
      responsive: false,
      animation: false,
      devicePixelRatio: 2,
      ...config.options,
    },
  });
  // wait one frame
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  const url = canvas.toDataURL("image/png", 1.0);
  chart.destroy();
  canvas.remove();
  return url;
}

const baseScales = {
  x: {
    grid: { display: false },
    ticks: { color: COLOR.sub, font: { size: 11, family: "Inter, Helvetica, Arial" } },
    border: { color: COLOR.line },
  },
  y: {
    grid: { color: "#EEF2F7", drawBorder: false },
    ticks: {
      color: COLOR.sub,
      font: { size: 11, family: "Inter, Helvetica, Arial" },
      callback: (v: any) => (typeof v === "number" ? `$${(v / 1000).toFixed(0)}K` : v),
    },
    border: { display: false },
  },
};

// ===================== Page chrome =====================
function drawHeader(
  doc: jsPDF,
  pageNum: number,
  totalPages: number,
  generatedAt: Date,
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
  }

  // Subtitle below logo. Re-ordered fallback chain so the most
  // prominent spot in the document (right next to the logo) carries
  // the most useful attribution rather than redundant info:
  //   1) tagline if set (user explicit choice always wins)
  //   2) "Prepared by [contact_name]" if contact name set — the
  //      logo already shows the company name, so re-displaying it
  //      here is redundant; the preparer's name is the missing
  //      attribution that users actually want visible.
  //   3) company name only when there's a contact gap (rare)
  //   4) TrueCap default ONLY when no branding at all
  const hasAnyBranding =
    Boolean(
      branding?.logoUrl ||
        branding?.companyName ||
        branding?.tagline ||
        branding?.primaryColorHex ||
        branding?.contactName
    );
  let subtitle: string;
  if (branding?.tagline && branding.tagline.trim()) {
    subtitle = branding.tagline.trim();
  } else if (branding?.contactName && branding.contactName.trim()) {
    subtitle = `Prepared by ${branding.contactName.trim()}`;
  } else if (hasAnyBranding && branding?.companyName?.trim()) {
    subtitle = branding.companyName.trim();
  } else if (hasAnyBranding) {
    subtitle = ""; // suppress TrueCap copy for branded reports
  } else {
    subtitle = "Professional real estate investment calculator";
  }
  if (subtitle) {
    // When the subtitle is the "Prepared by [Name]" attribution, render
    // it bolder and in COLOR.ink so it actually reads as the document's
    // authorship line instead of mumbled gray copy. Other subtitle
    // variants (tagline, company name, default TrueCap copy) stay in
    // the lighter subtitle treatment.
    const isPreparedBy = subtitle.startsWith("Prepared by ");
    if (isPreparedBy) {
      setText(doc, COLOR.ink);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
    } else {
      setText(doc, COLOR.sub);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }
    doc.text(subtitle, M.left, 62);
  }

  // Right side title block — aligned to share a baseline grid with
  // the left side (logo + "Prepared by" subtitle). Both sides span
  // the same vertical range so the header reads as one cohesive
  // designed unit rather than two floating columns:
  //   y ≈ 22  → ANALYSIS REPORT kicker  (aligned ~with logo top y=18)
  //   y ≈ 44  → Investment Analysis     (large 15pt bold)
  //   y ≈ 62  → Generated [date]        (aligned with subtitle baseline)
  setText(doc, themeColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setCharSpace(1.2);
  doc.text("ANALYSIS REPORT", PAGE.w - M.right, 26, { align: "right" });
  doc.setCharSpace(0);
  setText(doc, COLOR.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Investment Analysis", PAGE.w - M.right, 46, { align: "right" });
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `Generated ${generatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    PAGE.w - M.right,
    62, // baseline alignment with "Prepared by" subtitle at y=62
    { align: "right" },
  );

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

  // Footer-left text — shows preparer attribution when branding is
  // configured so the report carries the user's name on every page,
  // not just buried in a card on page 1.
  // Priority:
  //   1) "Prepared by [contact_name] · [company_name]" if both set
  //   2) "Prepared by [contact_name]" if only the name is set
  //   3) "[company_name]" alone if only company is set
  //   4) "Investment Report" default for unbranded reports
  let footerLeft = "Investment Report";
  if (branding?.contactName?.trim() && branding?.companyName?.trim()) {
    footerLeft = `Prepared by ${branding.contactName.trim()} · ${branding.companyName.trim()}`;
  } else if (branding?.contactName?.trim()) {
    footerLeft = `Prepared by ${branding.contactName.trim()}`;
  } else if (branding?.companyName?.trim()) {
    footerLeft = branding.companyName.trim();
  }
  // Truncate hard at 80 chars so a long company name + person name
  // can't push into the centered "Confidential" line.
  if (footerLeft.length > 80) footerLeft = footerLeft.slice(0, 77) + "…";

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
  const kickerColor =
    themeColor && isValidHex(themeColor) ? themeColor : COLOR.primary;
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
  doc.setFontSize(16);
  doc.text(text, M.left, y);
  // Elegant divider beneath the title — short brand-color accent stroke
  // mirrors the header divider treatment for visual consistency across
  // the document. Gives each section a clear designed beginning.
  setStroke(doc, kickerColor);
  doc.setLineWidth(1.5);
  doc.line(M.left, y + 8, M.left + 28, y + 8);
  setStroke(doc, COLOR.line);
  doc.setLineWidth(0.5);
  return y + 24;
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

function pill(doc: jsPDF, x: number, y: number, text: string, bg: string, fg: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const tw = doc.getTextWidth(text) + 14;
  setFill(doc, bg);
  doc.roundedRect(x, y - 9, tw, 14, 7, 7, "F");
  setText(doc, fg);
  doc.text(text, x + 7, y);
  return tw;
}

// ===================== Pages =====================
function pageInputs(
  doc: jsPDF,
  d: ReportData,
  branding?: BrandingConfig | null
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

  // Subject Property kicker — small brand-color label above the
  // address panel. Matches the typeset character-spacing treatment
  // of the ANALYSIS REPORT kicker in the header for visual rhyme.
  setText(doc, themeColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setCharSpace(1.2);
  doc.text("SUBJECT PROPERTY", M.left, y);
  doc.setCharSpace(0);
  y += 14;

  // Hero panel — refined for elegance. 64pt tall, 22pt address font
  // (down from 24pt — 24pt was too aggressive, 22pt reads as confident
  // but not loud). Thin white inner accent line between the address
  // and property details adds editorial polish. Slightly smaller
  // corner radius (10pt) for sharper modern feel.
  const heroHeight = 64;
  setFill(doc, heroPanelColor);
  doc.roundedRect(M.left, y, SAFE.w, heroHeight, 10, 10, "F");
  setText(doc, "#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(d.property.address, M.left + 22, y + 30);

  // Thin white inner accent line between address and property details.
  // Subtle structural element that signals "designed" — like a
  // magazine title page divider.
  setStroke(doc, "#FFFFFF");
  doc.setLineWidth(0.6);
  doc.line(M.left + 22, y + 39, M.left + 22 + 28, y + 39);

  setText(doc, "#CBD5E1");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  // Singular/plural fix on "unit/units" so a single-family deal doesn't
  // read as "1 units."
  const unitsLabel = d.units.length === 1 ? "1 unit" : `${d.units.length} units`;
  doc.text(
    `${d.property.type}  ·  Built ${d.property.yearBuilt}  ·  ${unitsLabel}  ·  Purchase ${fmtCurrency(d.property.purchasePrice)}`,
    M.left + 22,
    y + 52,
  );

  // Restore stroke defaults for downstream draws
  setStroke(doc, COLOR.line);
  doc.setLineWidth(0.5);

  y += heroHeight + 22;

  // Inputs grid (4 cards)
  // Section kicker ("Section 1") removed per design feedback — the
  // section title itself is self-explanatory; the kicker just made
  // the page feel templated. Same change applied at every section
  // title across the document.
  y = sectionTitle(doc, "Property & Inputs", y, undefined, themeColor);
  const colW = (SAFE.w - 12) / 2;
  const rowH = 92;

  drawInputBlock(doc, M.left, y, colW, rowH, "Property", [
    ["Type", d.property.type],
    ["Year built", String(d.property.yearBuilt)],
    ["Purchase price", fmtCurrency(d.property.purchasePrice)],
    ["Template", d.property.template],
  ], themeColor);
  drawInputBlock(doc, M.left + colW + 12, y, colW, rowH, "Financing", [
    ["Down payment", `${d.financing.downPaymentPct}% (${fmtCurrency(d.financing.downPayment)})`],
    ["Interest rate", `${d.financing.interestRate}%`],
    ["Loan term", `${d.financing.loanTerm} yrs`],
    ["Closing costs", `${d.financing.closingCostsPct}% (${fmtCurrency(d.financing.closingCosts)})`],
  ], themeColor);
  y += rowH + 10;
  drawInputBlock(doc, M.left, y, colW, rowH, "Operating Expenses", [
    ["Property tax / Insurance", `${d.expenses.propertyTaxPct}% / ${d.expenses.insurancePct}%`],
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

  // Units
  y = sectionTitle(doc, "Units", y, undefined, themeColor);
  const uW = (SAFE.w - 12) / 2;
  d.units.forEach((u, i) => {
    const x = M.left + i * (uW + 12);
    card(doc, x, y, uW, 60);
    setFill(doc, i === 0 ? COLOR.primarySoft : COLOR.cardSoft);
    doc.roundedRect(x, y, uW, 22, 8, 8, "F");
    setText(doc, COLOR.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(u.label, x + 12, y + 15);
    setText(doc, COLOR.sub);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    ["BEDS", "BATHS", "SQ FT", "RENT"].forEach((lbl, j) => {
      doc.text(lbl, x + 12 + j * ((uW - 24) / 4), y + 36);
    });
    setText(doc, COLOR.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    [String(u.beds), String(u.baths), String(u.sqft), u.rent ? `${fmtCurrency(u.rent)}/mo` : "$0"].forEach((v, j) => {
      doc.text(v, x + 12 + j * ((uW - 24) / 4), y + 52);
    });
  });
  y += 60 + 22;

  // Performance Summary - card grid 3 columns
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
    ["Cap Rate", fmtPct(d.performance.capRate, true), "violet", "gross"],
    ["DSCR", dscrValue, dscrTone, dscrSub],
    ["Tax Savings", fmtCurrency(d.performance.taxSavings), "success", "/month est."],
    ["After-Tax CF", fmtCurrency(d.performance.afterTaxCF), "primary", "/month"],
  ];
  cards.forEach((c, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    statCard(doc, M.left + col * (cw + gap), y + row * (ch + gap), cw, ch, c[0], c[1], { tone: c[2], sub: c[3], themeColor });
  });
  y += (ch + gap) * 2 + 6;

  // Recommendation / verdict card (full width). Auto-sizes to its
  // content so short Neutral/Risky rationales don't leave a giant
  // empty white box, and long Strong Buy explanations don't get
  // truncated. Previously hardcoded at 130pt — which was right for
  // 5-6 sentences but left ~70pt of empty space inside the card on
  // 1-sentence rationales.
  //
  // The left stripe + the "AI RECOMMENDATION" kicker text both pick up
  // the verdict tier color (green for Strong Buy / Buy, orange for
  // Neutral / Risky, red for Avoid) so they match the headline text.
  const tierColor = getRecommendationRiskTextColor(
    d.performance.recommendation,
    d.performance.risk
  );
  // Compute the rationale lines first so we can size the card to fit.
  // splitTextToSize needs the font already set, so set the body font
  // before measuring.
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const rationaleLines = doc.splitTextToSize(
    d.performance.rationale,
    SAFE.w - 32
  ).slice(0, 7); // hard cap at 7 lines to prevent absurdly long rationales
  // Vertical accounting inside the card:
  //   y + 16  → "AI RECOMMENDATION" kicker (8pt)
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
  card(doc, M.left, y, SAFE.w, cardHeight);
  // Thinner left stripe (3pt vs 4pt) for a more refined feel.
  setFill(doc, tierColor);
  doc.roundedRect(M.left, y, 3, cardHeight, 1.5, 1.5, "F");
  // Kicker — typeset character spacing for editorial polish.
  setText(doc, tierColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setCharSpace(0.8);
  doc.text("AI RECOMMENDATION", M.left + 16, y + 16);
  doc.setCharSpace(0);
  // Headline — slightly tighter (14pt vs 13pt) for confident statement.
  setText(doc, tierColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`${d.performance.recommendation} — ${d.performance.risk}`, M.left + 16, y + 34);

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
  doc.text("DEAL SCORE", PAGE.w - M.right - 16, y + 16, { align: "right" });
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

  // PREPARED BY card was removed — the header subtitle now renders
  // "Prepared by [Name]" bold under the logo, and the footer of every
  // page shows the full "Prepared by [Name] · [Company]" attribution.
  // A third card on page 1 was redundant chrome. Page 1 now ends with
  // the AI Recommendation card; the attribution lives in the header
  // and footer where it belongs.
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
  const kickerColor =
    themeColor && isValidHex(themeColor) ? themeColor : COLOR.primary;
  setText(doc, kickerColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(title.toUpperCase(), x + 12, y + 16);
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

async function pageProjection(
  doc: jsPDF,
  d: ReportData,
  branding?: BrandingConfig | null
) {
  let y = M.top + 12;
  const themeColor = resolveThemeColor(branding);
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

  const annualCF = await renderChart({
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Net Cash Flow",
          data: d.projection10y.rows.map((r) => r.net),
          backgroundColor: themeColor,
          borderRadius: 4,
        },
      ],
    },
    options: { plugins: { legend: { display: false } }, scales: baseScales },
  });
  const incomeExpense = await renderChart({
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Rental Income", data: d.projection10y.rows.map((r) => r.rental), borderColor: COLOR.success, backgroundColor: "rgba(22,163,74,0.1)", fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2 },
        { label: "Operating Expenses", data: d.projection10y.rows.map((r) => r.opex), borderColor: COLOR.danger, backgroundColor: "rgba(220,38,38,0.08)", fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2 },
      ],
    },
    options: { plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } }, scales: baseScales },
  });
  const cumCF = await renderChart({
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Cumulative CF", data: d.projection10y.rows.map((r) => r.cum), borderColor: COLOR.violet, backgroundColor: "rgba(124,58,237,0.18)", fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2.5 },
      ],
    },
    options: { plugins: { legend: { display: false } }, scales: baseScales },
  });
  const afterTax = await renderChart({
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "After-Tax CF", data: d.projection10y.rows.map((r) => r.after), backgroundColor: COLOR.success, borderRadius: 4 },
      ],
    },
    options: { plugins: { legend: { display: false } }, scales: baseScales },
  });

  drawChartCard(doc, M.left, y, chW, chH, "Annual Cash Flow", annualCF);
  drawChartCard(doc, M.left + chW + 12, y, chW, chH, "Income vs Expenses", incomeExpense);
  y += chH + 12;
  drawChartCard(doc, M.left, y, chW, chH, "Cumulative Cash Flow", cumCF);
  drawChartCard(doc, M.left + chW + 12, y, chW, chH, "After-Tax Growth", afterTax);
  y += chH + 20;

  // Table
  autoTable(doc, {
    startY: y,
    margin: { left: M.left, right: M.right },
    head: [["Year", "Rental Income", "Op. Expenses", "Debt Service", "Net CF", "Tax Savings", "After-Tax CF", "Cumulative CF"]],
    body: d.projection10y.rows.map((r) => [
      `Y${r.y}`,
      fmtCurrency(r.rental),
      fmtCurrency(r.opex),
      fmtCurrency(r.debt),
      { content: fmtCurrency(r.net), styles: { textColor: r.net >= 0 ? hexToRgb(COLOR.success) : hexToRgb(COLOR.danger) } },
      fmtCurrency(r.tax),
      { content: fmtCurrency(r.after), styles: { textColor: hexToRgb(COLOR.success), fontStyle: "bold" } },
      fmtCurrency(r.cum),
    ]),
    theme: "plain",
    styles: { font: "helvetica", fontSize: 8.2, cellPadding: 4, lineColor: hexToRgb(COLOR.line), lineWidth: 0.3 },
    headStyles: { fillColor: hexToRgb(COLOR.cardSoft), textColor: hexToRgb(themeColor), fontStyle: "bold", fontSize: 7.5, halign: "left", lineWidth: { bottom: 0.6, top: 0, left: 0, right: 0 }, lineColor: hexToRgb(themeColor) },
    columnStyles: { 0: { fontStyle: "bold", textColor: hexToRgb(COLOR.ink) } },
    alternateRowStyles: { fillColor: [252, 253, 255] },
  });
}

function drawChartCard(doc: jsPDF, x: number, y: number, w: number, h: number, title: string, dataUrl: string) {
  card(doc, x, y, w, h);
  setText(doc, COLOR.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title, x + 12, y + 16);
  // chart area
  const padX = 8;
  const padTop = 24;
  const padBottom = 8;
  doc.addImage(dataUrl, "PNG", x + padX, y + padTop, w - padX * 2, h - padTop - padBottom, undefined, "FAST");
}

async function pageTax(
  doc: jsPDF,
  d: ReportData,
  branding?: BrandingConfig | null
) {
  let y = M.top + 12;
  const themeColor = resolveThemeColor(branding);
  y = sectionTitle(doc, "Tax Strategy", y, undefined, themeColor);
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Annual deductions, depreciation impact, and projected tax savings.", M.left, y);
  y += 22;

  // 2x2 summary cards
  const cw = (SAFE.w - 12) / 2;
  const ch = 60;
  statCard(doc, M.left, y, cw, ch, "Year 1 Taxable Rental Income", fmtCurrency(d.taxStrategy.year1Taxable), { tone: d.taxStrategy.year1Taxable < 0 ? "success" : "warn", themeColor });
  statCard(doc, M.left + cw + 12, y, cw, ch, "Year 1 Estimated Tax Savings", fmtCurrency(d.taxStrategy.year1Savings), { tone: "success", themeColor });
  y += ch + 12;
  statCard(doc, M.left, y, cw, ch, "10-Year Total Tax Benefit", fmtCurrency(d.taxStrategy.totalBenefit10y), { tone: "primary", themeColor });
  statCard(doc, M.left + cw + 12, y, cw, ch, "Annual Depreciation", fmtCurrency(d.taxStrategy.annualDepreciation), { tone: "violet", themeColor });
  y += ch + 20;

  const labels = d.taxStrategy.rows.map((r) => `Y${r.y}`);
  const chW = (SAFE.w - 12) / 2;
  const chH = 130;

  const savingsChart = await renderChart({
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Tax Savings", data: d.taxStrategy.rows.map((r) => r.savings), backgroundColor: COLOR.success, borderRadius: 4 }],
    },
    options: { plugins: { legend: { display: false } }, scales: baseScales },
  });
  const taxableChart = await renderChart({
    type: "line",
    data: {
      labels,
      datasets: [{ label: "Taxable Income", data: d.taxStrategy.rows.map((r) => r.taxable), borderColor: themeColor, backgroundColor: hexToRgba(themeColor, 0.12), fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2 }],
    },
    options: { plugins: { legend: { display: false } }, scales: baseScales },
  });
  const intDepChart = await renderChart({
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Mortgage Interest", data: d.taxStrategy.rows.map((r) => r.interest), borderColor: COLOR.violet, backgroundColor: "transparent", borderWidth: 2, pointRadius: 0, tension: 0.3 },
        { label: "Depreciation", data: d.taxStrategy.rows.map((r) => r.dep), borderColor: COLOR.warn, backgroundColor: "transparent", borderWidth: 2, pointRadius: 0, tension: 0.3 },
      ],
    },
    options: { plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } }, scales: baseScales },
  });
  const breakdownChart = await renderChart({
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Op. Expenses", data: d.taxStrategy.rows.map((r) => r.opex), backgroundColor: COLOR.danger, stack: "s" },
        { label: "Interest", data: d.taxStrategy.rows.map((r) => r.interest), backgroundColor: COLOR.violet, stack: "s" },
        { label: "Depreciation", data: d.taxStrategy.rows.map((r) => r.dep), backgroundColor: COLOR.warn, stack: "s" },
      ],
    },
    options: {
      plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } },
      scales: { x: { ...baseScales.x, stacked: true }, y: { ...baseScales.y, stacked: true } },
    },
  });

  drawChartCard(doc, M.left, y, chW, chH, "Annual Tax Savings", savingsChart);
  drawChartCard(doc, M.left + chW + 12, y, chW, chH, "Taxable Rental Income Trend", taxableChart);
  y += chH + 12;
  drawChartCard(doc, M.left, y, chW, chH, "Interest vs Depreciation", intDepChart);
  drawChartCard(doc, M.left + chW + 12, y, chW, chH, "Deductions Breakdown", breakdownChart);
  y += chH + 20;

  autoTable(doc, {
    startY: y,
    margin: { left: M.left, right: M.right },
    head: [["Year", "Rental", "Op. Exp.", "Interest Ded.", "Depreciation", "Total Ded.", "Taxable Income", "Tax Savings", "Net Benefit"]],
    body: d.taxStrategy.rows.map((r) => [
      `Y${r.y}`,
      fmtCurrency(r.rental),
      fmtCurrency(r.opex),
      fmtCurrency(r.interest),
      fmtCurrency(r.dep),
      fmtCurrency(r.total),
      { content: fmtCurrency(r.taxable), styles: { textColor: r.taxable < 0 ? hexToRgb(COLOR.success) : hexToRgb(COLOR.danger) } },
      { content: fmtCurrency(r.savings), styles: { textColor: hexToRgb(COLOR.success), fontStyle: "bold" } },
      { content: fmtCurrency(r.benefit), styles: { textColor: r.benefit >= 0 ? hexToRgb(COLOR.success) : hexToRgb(COLOR.danger) } },
    ]),
    theme: "plain",
    styles: { font: "helvetica", fontSize: 7.8, cellPadding: 3.5, lineColor: hexToRgb(COLOR.line), lineWidth: 0.3 },
    headStyles: { fillColor: hexToRgb(COLOR.cardSoft), textColor: hexToRgb(themeColor), fontStyle: "bold", fontSize: 7.2, halign: "left", lineWidth: { bottom: 0.6, top: 0, left: 0, right: 0 }, lineColor: hexToRgb(themeColor) },
    columnStyles: { 0: { fontStyle: "bold", textColor: hexToRgb(COLOR.ink) } },
    alternateRowStyles: { fillColor: [252, 253, 255] },
  });
}

async function pageExit(
  doc: jsPDF,
  d: ReportData,
  branding?: BrandingConfig | null
) {
  let y = M.top + 12;
  const themeColor = resolveThemeColor(branding);
  y = sectionTitle(doc, "Exit Scenarios", y, undefined, themeColor);
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Equity build-up and projected sale proceeds across a 10-year hold horizon.", M.left, y);
  y += 22;

  const cw = (SAFE.w - 12) / 2;
  const ch = 60;
  statCard(doc, M.left, y, cw, ch, "Best Year to Sell", `Year ${d.exitScenarios.bestYear}`, { tone: "success", themeColor });
  statCard(doc, M.left + cw + 12, y, cw, ch, "Year 5 Profit", fmtCurrency(d.exitScenarios.year5Profit), { tone: "primary", themeColor });
  y += ch + 12;
  statCard(doc, M.left, y, cw, ch, "Year 10 Profit", fmtCurrency(d.exitScenarios.year10Profit), { tone: "success", themeColor });
  statCard(doc, M.left + cw + 12, y, cw, ch, "Total ROI", fmtPct(d.exitScenarios.totalROI, true), { tone: "violet", themeColor });
  y += ch + 20;

  const labels = d.exitScenarios.rows.map((r) => `Y${r.y}`);
  const chW = (SAFE.w - 12) / 2;
  const chH = 130;

  const valVsLoan = await renderChart({
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Property Value", data: d.exitScenarios.rows.map((r) => r.value), borderColor: themeColor, backgroundColor: "transparent", borderWidth: 2, pointRadius: 0, tension: 0.3 },
        { label: "Loan Balance", data: d.exitScenarios.rows.map((r) => r.loan), borderColor: COLOR.danger, backgroundColor: "transparent", borderWidth: 2, pointRadius: 0, tension: 0.3 },
      ],
    },
    options: { plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } }, scales: baseScales },
  });
  const equity = await renderChart({
    type: "line",
    data: {
      labels,
      datasets: [{ label: "Equity", data: d.exitScenarios.rows.map((r) => r.equity), borderColor: COLOR.success, backgroundColor: "rgba(22,163,74,0.18)", fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2.5 }],
    },
    options: { plugins: { legend: { display: false } }, scales: baseScales },
  });
  const profit = await renderChart({
    type: "line",
    data: {
      labels,
      datasets: [{ label: "Total Profit", data: d.exitScenarios.rows.map((r) => r.profit), borderColor: COLOR.violet, backgroundColor: "rgba(124,58,237,0.18)", fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2.5 }],
    },
    options: { plugins: { legend: { display: false } }, scales: baseScales },
  });
  const profitBreakdown = await renderChart({
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Net Sale Proceeds", data: d.exitScenarios.rows.map((r) => r.netSale), backgroundColor: themeColor, stack: "p" },
        { label: "Total Profit", data: d.exitScenarios.rows.map((r) => Math.max(r.profit, 0)), backgroundColor: COLOR.success, stack: "p" },
      ],
    },
    options: {
      plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } },
      scales: { x: { ...baseScales.x, stacked: true }, y: { ...baseScales.y, stacked: true } },
    },
  });

  drawChartCard(doc, M.left, y, chW, chH, "Property Value vs Loan", valVsLoan);
  drawChartCard(doc, M.left + chW + 12, y, chW, chH, "Equity Growth", equity);
  y += chH + 12;
  drawChartCard(doc, M.left, y, chW, chH, "Profit Over Time", profit);
  drawChartCard(doc, M.left + chW + 12, y, chW, chH, "Profit Breakdown", profitBreakdown);
  y += chH + 20;

  autoTable(doc, {
    startY: y,
    margin: { left: M.left, right: M.right },
    head: [["Year", "Property Value", "Loan Balance", "Equity", "Net Sale Proceeds", "Total Profit"]],
    body: d.exitScenarios.rows.map((r) => [
      `Y${r.y}`,
      fmtCurrency(r.value),
      fmtCurrency(r.loan),
      { content: fmtCurrency(r.equity), styles: { textColor: hexToRgb(COLOR.success), fontStyle: "bold" } },
      fmtCurrency(r.netSale),
      { content: fmtCurrency(r.profit), styles: { textColor: r.profit >= 0 ? hexToRgb(COLOR.success) : hexToRgb(COLOR.danger), fontStyle: "bold" } },
    ]),
    theme: "plain",
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 4.5, lineColor: hexToRgb(COLOR.line), lineWidth: 0.3 },
    headStyles: { fillColor: hexToRgb(COLOR.cardSoft), textColor: hexToRgb(themeColor), fontStyle: "bold", fontSize: 7.5, halign: "left", lineWidth: { bottom: 0.6, top: 0, left: 0, right: 0 }, lineColor: hexToRgb(themeColor) },
    columnStyles: { 0: { fontStyle: "bold", textColor: hexToRgb(COLOR.ink) } },
    alternateRowStyles: { fillColor: [252, 253, 255] },
  });
}

// ===================== Public API =====================
async function buildInvestmentPDFDocument(
  data: ReportData,
  branding?: BrandingConfig | null
) {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const d = data;

  // Logo source — branded URL if present and valid, else the TrueCap
  // default. The custom URL is the public Supabase Storage URL; if the
  // fetch fails for any reason (bucket misconfig, network), we fall
  // back to the TrueCap logo so the PDF never renders with a blank
  // header.
  let logoData = null as Awaited<ReturnType<typeof loadLogoDataUrl>>;
  if (branding?.logoUrl) {
    logoData = await loadLogoDataUrl(branding.logoUrl);
  }
  if (!logoData) {
    logoData = await loadLogoDataUrl(); // TrueCap default
  }

  pageInputs(doc, d, branding ?? null);
  doc.addPage();
  await pageProjection(doc, d, branding ?? null);
  doc.addPage();
  await pageTax(doc, d, branding ?? null);
  doc.addPage();
  await pageExit(doc, d, branding ?? null);

  // Add headers/footers AFTER all pages exist
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawHeader(doc, i, total, d.generatedAt, logoData, branding ?? null);
  }

  return doc;
}

export async function generateInvestmentPDFBlob(
  data: ReportData,
  branding?: BrandingConfig | null
): Promise<Blob> {
  const doc = await buildInvestmentPDFDocument(data, branding);
  return doc.output("blob");
}

/**
 * Generate the PDF AND trigger an immediate download, then return the
 * blob for any downstream uses (e.g. caching it to Supabase Storage in
 * the background).
 *
 * The download uses jsPDF's doc.save() which works regardless of user
 * gesture timing — unlike a popup window or a new-tab link click,
 * which browsers silently block after async operations because the
 * user gesture context is lost.
 */
export async function generateInvestmentPDF(
  data: ReportData,
  branding?: BrandingConfig | null
): Promise<Blob> {
  const doc = await buildInvestmentPDFDocument(data, branding);
  // Use the user's company name as a filename prefix if set, otherwise
  // the TrueCap default. Sanitize to filesystem-safe characters.
  const prefix =
    branding?.companyName?.trim().replace(/[^A-Za-z0-9_-]+/g, "-") ||
    "TrueCap";
  doc.save(`${prefix}-Investment-Report-${Date.now()}.pdf`);
  return doc.output("blob");
}
