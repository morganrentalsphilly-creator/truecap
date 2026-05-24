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

async function loadPublicLogoDataUrl(): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const response = await fetch("/Logo-png-w.png");
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
  logoData: { dataUrl: string; width: number; height: number } | null
) {
  // Top accent bar
  setFill(doc, COLOR.primary);
  doc.rect(0, 0, PAGE.w, 4, "F");

  // Logo mark (public logo only)
  if (logoData) {
    try {
      const targetHeight = 37;
      const targetWidth = 102;
      doc.addImage(logoData.dataUrl, "PNG", M.left, 20, targetWidth, targetHeight, undefined, "FAST");
    } catch {
      // keep header clean even if logo cannot be drawn
    }
  }

  // Subtitle below logo (matches website top bar copy)
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Professional real estate investment calculator", M.left, 62);

  // Right side title
  setText(doc, COLOR.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Investment Analysis Report", PAGE.w - M.right, 42, { align: "right" });
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `Generated ${generatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    PAGE.w - M.right,
    53,
    { align: "right" },
  );

  // Header underline
  setStroke(doc, COLOR.line);
  doc.setLineWidth(0.5);
  doc.line(M.left, 66, PAGE.w - M.right, 66);

  // Footer line
  const footerLineY = PAGE.h - M.bottom + (pageNum === 1 ? 30 : 20);
  const footerTextY = PAGE.h - M.bottom + (pageNum === 1 ? 44 : 34);
  doc.line(M.left, footerLineY, PAGE.w - M.right, footerLineY);
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Investment Report", M.left, footerTextY);
  doc.text("Confidential — for the named recipient only", PAGE.w / 2, footerTextY, { align: "center" });
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE.w - M.right, footerTextY, { align: "right" });
}

function sectionTitle(doc: jsPDF, text: string, y: number, kicker?: string) {
  if (kicker) {
    setText(doc, COLOR.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(kicker.toUpperCase(), M.left, y);
    y += 18;
  }
  setText(doc, COLOR.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(text, M.left, y);
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
  opts: { tone?: "primary" | "success" | "danger" | "neutral" | "violet" | "warn"; sub?: string } = {},
) {
  card(doc, x, y, w, h);
  // accent bar left
  const tone = opts.tone ?? "neutral";
  const toneMap = {
    primary: COLOR.primary,
    success: COLOR.success,
    danger: COLOR.danger,
    neutral: COLOR.muted,
    violet: COLOR.violet,
    warn: COLOR.warn,
  } as const;
  setFill(doc, toneMap[tone]);
  doc.roundedRect(x, y, 3, h, 1.5, 1.5, "F");

  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(label.toUpperCase(), x + 14, y + 18);

  setText(doc, tone === "neutral" ? COLOR.ink : toneMap[tone]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(value, x + 14, y + 40);

  if (opts.sub) {
    setText(doc, COLOR.sub);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(opts.sub, x + 14, y + 54);
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
function pageInputs(doc: jsPDF, d: ReportData) {
  let y = M.top;

  // Hero panel
  setFill(doc, COLOR.navy);
  doc.roundedRect(M.left, y, SAFE.w, 80, 10, 10, "F");
  setText(doc, "#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(d.property.address, M.left + 18, y + 30);
  setText(doc, "#CBD5E1");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `${d.property.type}  ·  Built ${d.property.yearBuilt}  ·  ${d.units.length} units  ·  Purchase ${fmtCurrency(d.property.purchasePrice)}`,
    M.left + 18,
    y + 48,
  );
  // recommendation pill
  const pillGap = 18;
  let pillX = M.left + 18;
  const recommendationPillColor = getRecommendationPillColor(d.performance.recommendation);
  const scorePillColor = getScorePillColor(d.performance.dealScore);
  const riskPillColor = getRiskPillColor(d.performance.risk);
  pillX += pill(doc, pillX, y + 68, `RECOMMENDATION: ${d.performance.recommendation.toUpperCase()}`, recommendationPillColor.bg, recommendationPillColor.fg) + pillGap;
  pillX += pill(doc, pillX, y + 68, `DEAL SCORE ${d.performance.dealScore}`, scorePillColor.bg, scorePillColor.fg) + pillGap;
  pill(doc, pillX, y + 68, d.performance.risk.toUpperCase(), riskPillColor.bg, riskPillColor.fg);

  y += 80 + 22;

  // Inputs grid (4 cards)
  y = sectionTitle(doc, "Property & Inputs", y, "Section 1");
  const colW = (SAFE.w - 12) / 2;
  const rowH = 92;

  drawInputBlock(doc, M.left, y, colW, rowH, "Property", [
    ["Type", d.property.type],
    ["Year built", String(d.property.yearBuilt)],
    ["Purchase price", fmtCurrency(d.property.purchasePrice)],
    ["Template", d.property.template],
  ]);
  drawInputBlock(doc, M.left + colW + 12, y, colW, rowH, "Financing", [
    ["Down payment", `${d.financing.downPaymentPct}% (${fmtCurrency(d.financing.downPayment)})`],
    ["Interest rate", `${d.financing.interestRate}%`],
    ["Loan term", `${d.financing.loanTerm} yrs`],
    ["Closing costs", `${d.financing.closingCostsPct}% (${fmtCurrency(d.financing.closingCosts)})`],
  ]);
  y += rowH + 10;
  drawInputBlock(doc, M.left, y, colW, rowH, "Operating Expenses", [
    ["Property tax / Insurance", `${d.expenses.propertyTaxPct}% / ${d.expenses.insurancePct}%`],
    ["Maintenance / Vacancy", `${d.expenses.maintenancePct}% / ${d.expenses.vacancyPct}%`],
    ["Management / CapEx", `${d.expenses.managementPct}% / ${d.expenses.capexPct}%`],
    ["HOA / Utilities", `${fmtCurrency(d.expenses.hoaMonthly)}/mo  ·  ${fmtCurrency(d.expenses.utilitiesMonthly)}/mo`],
  ]);
  drawInputBlock(doc, M.left + colW + 12, y, colW, rowH, "Assumptions", [
    ["Rent growth / Expense growth", `${d.expenses.rentGrowth}% / ${d.expenses.expenseGrowth}%`],
    ["Appreciation", `${d.expenses.appreciation}%/yr`],
    ["Selling cost", `${d.expenses.sellingCost}%`],
    ["Tax rate", `${d.expenses.taxRate}%`],
  ]);
  y += rowH + 22;

  // Units
  y = sectionTitle(doc, "Units", y);
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
  y = sectionTitle(doc, "Performance Summary", y, "Section 2");
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
    statCard(doc, M.left + col * (cw + gap), y + row * (ch + gap), cw, ch, c[0], c[1], { tone: c[2], sub: c[3] });
  });
  y += (ch + gap) * 2 + 6;

  // Recommendation / verdict card (full width). Bumped from 70pt to 130pt
  // tall so the richer auto-generated verdict paragraph (5-6 sentences)
  // fits without being truncated. Tighter line height (11pt) keeps it
  // readable without ballooning the section.
  card(doc, M.left, y, SAFE.w, 130);
  setFill(doc, COLOR.success);
  doc.roundedRect(M.left, y, 4, 130, 2, 2, "F");
  setText(doc, COLOR.success);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("AI RECOMMENDATION", M.left + 16, y + 16);
  setText(doc, getRecommendationRiskTextColor(d.performance.recommendation, d.performance.risk));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`${d.performance.recommendation} — ${d.performance.risk}`, M.left + 16, y + 34);
  setText(doc, COLOR.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  // Up to 7 lines now (was 2). At 9pt with ~11pt leading, 7 lines fits
  // comfortably in the 130pt-tall card with breathing room.
  const lines = doc.splitTextToSize(d.performance.rationale, SAFE.w - 32).slice(0, 7);
  doc.text(lines, M.left + 16, y + 50, { lineHeightFactor: 1.35 });
}

function drawInputBlock(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  rows: Array<[string, string]>,
) {
  card(doc, x, y, w, h);
  setText(doc, COLOR.primary);
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

async function pageProjection(doc: jsPDF, d: ReportData) {
  let y = M.top + 12;
  y = sectionTitle(doc, "10-Year Projection", y);
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
  statCard(doc, M.left, y, cw, 64, "Year 10 Cumulative CF", fmtCurrency(d.projection10y.cumulativeCF), { tone: "success" });
  statCard(doc, M.left + cw + 12, y, cw, 64, "Best Annual After-Tax CF", fmtCurrency(d.projection10y.bestAnnualAfterTax), { tone: "primary" });
  statCard(doc, M.left + 2 * (cw + 12), y, cw, 64, "10-Year After-Tax Total", fmtCurrency(d.projection10y.totalAfterTax), { tone: "violet" });
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
          backgroundColor: COLOR.primary,
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
    headStyles: { fillColor: hexToRgb(COLOR.cardSoft), textColor: hexToRgb(COLOR.sub), fontStyle: "bold", fontSize: 7.5, halign: "left", lineWidth: { bottom: 0.6, top: 0, left: 0, right: 0 } },
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

async function pageTax(doc: jsPDF, d: ReportData) {
  let y = M.top + 12;
  y = sectionTitle(doc, "Tax Strategy", y);
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Annual deductions, depreciation impact, and projected tax savings.", M.left, y);
  y += 22;

  // 2x2 summary cards
  const cw = (SAFE.w - 12) / 2;
  const ch = 60;
  statCard(doc, M.left, y, cw, ch, "Year 1 Taxable Rental Income", fmtCurrency(d.taxStrategy.year1Taxable), { tone: d.taxStrategy.year1Taxable < 0 ? "success" : "warn" });
  statCard(doc, M.left + cw + 12, y, cw, ch, "Year 1 Estimated Tax Savings", fmtCurrency(d.taxStrategy.year1Savings), { tone: "success" });
  y += ch + 12;
  statCard(doc, M.left, y, cw, ch, "10-Year Total Tax Benefit", fmtCurrency(d.taxStrategy.totalBenefit10y), { tone: "primary" });
  statCard(doc, M.left + cw + 12, y, cw, ch, "Annual Depreciation", fmtCurrency(d.taxStrategy.annualDepreciation), { tone: "violet" });
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
      datasets: [{ label: "Taxable Income", data: d.taxStrategy.rows.map((r) => r.taxable), borderColor: COLOR.primary, backgroundColor: "rgba(37,99,235,0.12)", fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2 }],
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
    headStyles: { fillColor: hexToRgb(COLOR.cardSoft), textColor: hexToRgb(COLOR.sub), fontStyle: "bold", fontSize: 7.2, halign: "left", lineWidth: { bottom: 0.6, top: 0, left: 0, right: 0 } },
    columnStyles: { 0: { fontStyle: "bold", textColor: hexToRgb(COLOR.ink) } },
    alternateRowStyles: { fillColor: [252, 253, 255] },
  });
}

async function pageExit(doc: jsPDF, d: ReportData) {
  let y = M.top + 12;
  y = sectionTitle(doc, "Exit Scenarios", y);
  setText(doc, COLOR.sub);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Equity build-up and projected sale proceeds across a 10-year hold horizon.", M.left, y);
  y += 22;

  const cw = (SAFE.w - 12) / 2;
  const ch = 60;
  statCard(doc, M.left, y, cw, ch, "Best Year to Sell", `Year ${d.exitScenarios.bestYear}`, { tone: "success" });
  statCard(doc, M.left + cw + 12, y, cw, ch, "Year 5 Profit", fmtCurrency(d.exitScenarios.year5Profit), { tone: "primary" });
  y += ch + 12;
  statCard(doc, M.left, y, cw, ch, "Year 10 Profit", fmtCurrency(d.exitScenarios.year10Profit), { tone: "success" });
  statCard(doc, M.left + cw + 12, y, cw, ch, "Total ROI", fmtPct(d.exitScenarios.totalROI, true), { tone: "violet" });
  y += ch + 20;

  const labels = d.exitScenarios.rows.map((r) => `Y${r.y}`);
  const chW = (SAFE.w - 12) / 2;
  const chH = 130;

  const valVsLoan = await renderChart({
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Property Value", data: d.exitScenarios.rows.map((r) => r.value), borderColor: COLOR.primary, backgroundColor: "transparent", borderWidth: 2, pointRadius: 0, tension: 0.3 },
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
        { label: "Net Sale Proceeds", data: d.exitScenarios.rows.map((r) => r.netSale), backgroundColor: COLOR.primary, stack: "p" },
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
    headStyles: { fillColor: hexToRgb(COLOR.cardSoft), textColor: hexToRgb(COLOR.sub), fontStyle: "bold", fontSize: 7.5, halign: "left", lineWidth: { bottom: 0.6, top: 0, left: 0, right: 0 } },
    columnStyles: { 0: { fontStyle: "bold", textColor: hexToRgb(COLOR.ink) } },
    alternateRowStyles: { fillColor: [252, 253, 255] },
  });
}

// ===================== Public API =====================
async function buildInvestmentPDFDocument(data: ReportData) {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const d = data;
  const logoData = await loadPublicLogoDataUrl();

  pageInputs(doc, d);
  doc.addPage();
  await pageProjection(doc, d);
  doc.addPage();
  await pageTax(doc, d);
  doc.addPage();
  await pageExit(doc, d);

  // Add headers/footers AFTER all pages exist
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawHeader(doc, i, total, d.generatedAt, logoData);
  }

  return doc;
}

export async function generateInvestmentPDFBlob(data: ReportData): Promise<Blob> {
  const doc = await buildInvestmentPDFDocument(data);
  return doc.output("blob");
}

export async function generateInvestmentPDF(data: ReportData) {
  const doc = await buildInvestmentPDFDocument(data);
  doc.save(`TrueCap-Investment-Report-${Date.now()}.pdf`);
}
