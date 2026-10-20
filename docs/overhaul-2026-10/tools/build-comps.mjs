// Builds the three direction comps (OVERHAUL.md §5) from their templates and
// the engine figures in directions/comp-data.json (written by comp-data.ts).
// Every {{key}} in a template is replaced from that JSON, so no figure in a
// comp is typed by hand. Usage: node docs/overhaul-2026-10/tools/build-comps.mjs
import fs from "node:fs";
import path from "node:path";

const DIR = path.join("docs", "overhaul-2026-10", "directions");
const data = JSON.parse(fs.readFileSync(path.join(DIR, "comp-data.json"), "utf8"));

const fmt = {
  ...data.formatted,
  dealScore: String(data.dealScore?.score ?? ""),
  proMonthly: data.plans.pro.monthly,
  proAnnual: data.plans.pro.annual,
  proAnnualPerMonth: data.plans.pro.annualPerMonth,
  agentProMonthly: data.plans.agentPro.monthly,
  agentProAnnual: data.plans.agentPro.annual,
  agentProAnnualPerMonth: data.plans.agentPro.annualPerMonth,
  targetCashFlow: `$${data.target.monthlyCashFlow.toLocaleString("en-US")}/mo`,
  targetDscr: String(data.target.dscr),
  targetCashFlowRaw: String(data.target.monthlyCashFlow),
  bindingTarget: data.bindingTarget,
  title: data.title,
  // The price track: positions as percentages of the sweep range.
  trackLow: String(data.sweep[0].price),
  trackHigh: String(data.sweep[data.sweep.length - 1].price),
  trackLowFmt: "$" + data.sweep[0].price.toLocaleString("en-US"),
  trackHighFmt: "$" + data.sweep[data.sweep.length - 1].price.toLocaleString("en-US"),
  cashFlowAskingRaw: String(Math.round(data.atAsking.cashFlow)),
  ceilingPct: pct(data.ceiling),
  askingPct: pct(data.asking),
  sweepJson: JSON.stringify(
    data.sweep.map((p) => ({ p: p.price, cf: Math.round(p.cashFlow), d: +p.dscr.toFixed(2), c: +p.coc.toFixed(1), m: p.meets })),
  ),
  asking: data.formatted.asking,
  ceiling: data.formatted.ceiling,
  askingRaw: String(data.asking),
  ceilingRaw: String(data.ceiling),
  shortfallAsking: `$${Math.round(data.target.monthlyCashFlow - data.atAsking.cashFlow).toLocaleString("en-US")}`,
  bedrooms: String(data.inputs.bedrooms),
  downPaymentPct: `${data.inputs.downPaymentPct}%`,
};
function pct(price) {
  const lo = data.sweep[0].price;
  const hi = data.sweep[data.sweep.length - 1].price;
  return (((price - lo) / (hi - lo)) * 100).toFixed(2);
}

const srcDir = path.join(DIR, "src");
for (const file of fs.readdirSync(srcDir).filter((f) => f.endsWith(".html"))) {
  let html = fs.readFileSync(path.join(srcDir, file), "utf8");
  const missing = new Set();
  html = html.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in fmt)) {
      missing.add(key);
      return `{{${key}}}`;
    }
    return fmt[key];
  });
  if (missing.size) throw new Error(`${file}: unknown keys ${[...missing].join(", ")}`);
  fs.writeFileSync(path.join(DIR, file), html);
  console.log(`built ${file}`);
}
