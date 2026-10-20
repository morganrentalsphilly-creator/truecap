// Phase 8: Firefox (no scroll timelines) and WebKit. Captures the homepage
// and the sample result in each engine and checks the leaders are drawn and
// the hero's scrubber answers the keyboard.
// Usage: ENGINES=firefox,webkit node docs/overhaul-2026-10/tools/qa-engines.mjs [base] [outDir]
// (WebKit never reached "networkidle" on the sample result, so the script waits for "load".)
import { firefox, webkit } from "playwright";
import fs from "node:fs";
import path from "node:path";
const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const OUT = process.argv[3] ?? "docs/overhaul-2026-10/phase-8/engines";
fs.mkdirSync(OUT, { recursive: true });
const results = {};
const wanted = (process.env.ENGINES ?? "firefox,webkit").split(",");
for (const [name, engine] of [["firefox", firefox], ["webkit", webkit]].filter(([n]) => wanted.includes(n))) {
  const browser = await engine.launch();
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(() => { try { localStorage.setItem("truecap_cookie_consent_v1", "denied"); } catch {} });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(BASE + "/", { waitUntil: "load" });
    await page.waitForTimeout(2600);
    const slider = page.locator('[data-hero-ledger=""] [role="slider"]');
    await slider.scrollIntoViewIfNeeded();
    await slider.focus();
    const v0 = Number(await slider.getAttribute("aria-valuenow"));
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(250);
    const v1 = Number(await slider.getAttribute("aria-valuenow"));
    const leaders = await page.evaluate(() => Array.from(document.querySelectorAll(".tc-leader")).map((el) => getComputedStyle(el).strokeDashoffset));
    const supportsTimeline = await page.evaluate(() => CSS.supports("animation-timeline: view()"));
    await page.screenshot({ path: path.join(OUT, `home-${name}-${w}.png`) });
    await page.goto(BASE + "/analyze?sample=1", { waitUntil: "load" });
    await page.locator('[data-analysis-results="true"]').waitFor({ state: "visible", timeout: 40000 });
    await page.waitForTimeout(1800);
    await page.locator('[data-analysis-results="true"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, `result-${name}-${w}.png`) });
    results[`${name}-${w}`] = { scrubberSteps: v1 > v0, leadersDashoffset: leaders, supportsScrollTimeline: supportsTimeline, pageErrors: errors };
    await ctx.close();
  }
  await browser.close();
}
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
