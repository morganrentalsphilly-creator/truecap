// Phase 8: the homepage without JavaScript. The resting state is the complete
// page (DESIGN.md): with scripts off, the hero sheet is server-rendered at the
// ceiling, the receipt flow lists its sources, the co-branding form and its
// preview render, both plans show their prices, the FAQ rows are native
// disclosures, and nothing in <main> is hidden by opacity or a transform.
// Usage: node docs/overhaul-2026-10/tools/qa-no-js.mjs [base] [outDir]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const OUT = process.argv[3] ?? "docs/overhaul-2026-10/phase-8/no-js";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const results = {};
for (const [label, viewport] of [["1440", { width: 1440, height: 900 }], ["390", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  results[label] = await page.evaluate(() => {
    const visible = (el) => { if (!el) return false; const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.opacity !== "0" && cs.visibility !== "hidden" && cs.display !== "none" && r.width > 0 && r.height > 0; };
    const sheet = document.querySelector('[data-hero-ledger=""]');
    const slider = sheet?.querySelector('[role="slider"]');
    const receiptNodes = Array.from(document.querySelectorAll('ol[aria-label="The starting values and where each comes from"] button'));
    const cobrand = document.querySelector('[data-cobrand-form=""]');
    const radios = document.querySelectorAll('[role="radiogroup"] [role="radio"]');
    const main = document.querySelector("main");
    const text = main?.innerText ?? "";
    const all = main ? Array.from(main.querySelectorAll("*")) : [];
    return {
      h1: document.querySelector("h1")?.textContent?.trim() ?? null,
      heroSheet: { present: !!sheet, visible: visible(sheet), sliderValue: slider?.getAttribute("aria-valuenow") ?? null, sliderText: slider?.getAttribute("aria-valuetext") ?? null, figures: sheet ? sheet.querySelectorAll(".font-figure").length : 0 },
      receiptFlow: { nodes: receiptNodes.length, allVisible: receiptNodes.length > 0 && receiptNodes.every(visible) },
      cobranding: { formPresent: !!cobrand, inputs: cobrand ? cobrand.querySelectorAll("input").length : 0 },
      plans: { radios: radios.length, monthlyPrice: /\$29\.99/.test(text), annualPrice: /\$300(?![,\d])/.test(text) },
      faq: { details: document.querySelectorAll("details.tc-accordion").length },
      hiddenByOpacity: all.filter((el) => getComputedStyle(el).opacity === "0").length,
      offsetByTransform: all.filter((el) => { const t = getComputedStyle(el).transform; return t !== "none" && t !== "matrix(1, 0, 0, 1, 0, 0)"; }).length,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      words: text.split(/\s+/).filter(Boolean).length,
    };
  });
  await page.screenshot({ path: path.join(OUT, `home-${label}-no-js.png`), fullPage: true });
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 1));
