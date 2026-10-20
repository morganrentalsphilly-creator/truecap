// Phase 8: the reduced-motion pass. Under prefers-reduced-motion: reduce the
// hero rests at the ceiling (no glide), the result reveal never plays, the
// receipt leaders are fully drawn, the key figure's stroke is drawn.
// Usage: node docs/overhaul-2026-10/tools/qa-reduced-motion.mjs [base] [outDir]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const OUT = process.argv[3] ?? "docs/overhaul-2026-10/phase-8/reduced-motion";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
await ctx.addInitScript(() => { try { localStorage.setItem("truecap_cookie_consent_v1", "denied"); } catch {} });
const page = await ctx.newPage();
const results = {};
await page.goto(BASE + "/", { waitUntil: "networkidle" });
const slider = page.locator('[data-hero-ledger=""] [role="slider"]');
await slider.scrollIntoViewIfNeeded();
const v0 = await slider.getAttribute("aria-valuenow");
await page.waitForTimeout(2500);
const v1 = await slider.getAttribute("aria-valuenow");
results.heroRestsAtCeiling = { atLoad: v0, after2500ms: v1, sameValue: v0 === v1 };
results.leadersDrawn = await page.evaluate(() => Array.from(document.querySelectorAll(".tc-leader")).map((el) => { const cs = getComputedStyle(el); return { animation: cs.animationName, dashoffset: cs.strokeDashoffset }; }));
results.heroStrokeAnimation = await page.evaluate(() => { const el = document.querySelector('[data-hero-ledger=""] .highlight-stroke'); return el ? getComputedStyle(el).animationName : "no element"; });
await page.screenshot({ path: path.join(OUT, "home-1440.png") });
await page.goto(BASE + "/analyze?sample=1", { waitUntil: "networkidle" });
await page.locator('[data-analysis-results="true"]').waitFor({ state: "visible", timeout: 30000 });
await page.waitForTimeout(600);
results.resultRevealAttribute = await page.evaluate(() => document.querySelector("[data-result-reveal]")?.getAttribute("data-result-reveal") ?? "absent");
results.resultStepsVisible = await page.evaluate(() => Array.from(document.querySelectorAll("[data-reveal-step]")).map((el) => ({ step: el.getAttribute("data-reveal-step"), opacity: getComputedStyle(el).opacity, animation: getComputedStyle(el).animationName })));
await page.locator('[data-analysis-results="true"]').scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(OUT, "result-1440.png") });
await browser.close();
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
