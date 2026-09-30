// Lab INP / LCP / CLS for the homepage with scripted interactions (web-vitals, reportAllChanges).
// Usage: node vitals.mjs <url> <out.json>   (CPU throttled 4x on the mobile profile)
import { chromium } from "playwright";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// The package does not export its IIFE build, so resolve the package root and read the file directly.
const iife = fs.readFileSync(require.resolve("web-vitals").replace(/[^/]+$/, "web-vitals.attribution.iife.js"), "utf8");
const [url, out] = process.argv.slice(2);
const profiles = [
  { name: "desktop-1440", viewport: { width: 1440, height: 900 }, mobile: false, cpu: 1 },
  { name: "mobile-390", viewport: { width: 390, height: 844 }, mobile: true, cpu: 4 },
];
const results = [];
const browser = await chromium.launch();
for (const prof of profiles) {
  for (let run = 1; run <= 3; run++) {
    const ctx = await browser.newContext({ viewport: prof.viewport, isMobile: prof.mobile, hasTouch: prof.mobile, deviceScaleFactor: prof.mobile ? 3 : 1 });
    await ctx.addInitScript(() => { try { localStorage.setItem("truecap_cookie_consent_v1", "denied"); } catch {} });
    await ctx.addInitScript({ content: iife + `;window.__v={};['onINP','onLCP','onCLS'].forEach(function(f){webVitals[f](function(m){window.__v[m.name]={value:m.value,target:(m.attribution&&(m.attribution.interactionTarget||m.attribution.element||m.attribution.largestShiftTarget))||null};},{reportAllChanges:true});});` });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    if (prof.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: prof.cpu });
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(1500);
    // Interactions a first-time visitor makes: type an address, open the menu (phone), open an FAQ answer.
    const field = page.locator('input[name="address"], input[placeholder*="Address"]').first();
    if (await field.count()) { await field.click(); await page.keyboard.type("1234 Main St", { delay: 40 }); }
    if (prof.mobile) { const menu = page.getByRole("button", { name: /menu/i }).first(); if (await menu.count()) { await menu.click(); await page.waitForTimeout(400); await page.keyboard.press("Escape"); } }
    // An FAQ answer, as at baseline. Since the design pass the walkthrough
    // ledger's rows are <details> too, so prefer the FAQ section's own rows.
    const faq = (await page.locator("#questions details summary").count())
      ? page.locator("#questions details summary").first()
      : page.locator("details summary").first();
    if (await faq.count()) { await faq.scrollIntoViewIfNeeded(); await faq.click(); }
    await page.waitForTimeout(800);
    // Background the page so INP/CLS finalize.
    await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
    await page.waitForTimeout(300);
    const v = await page.evaluate(() => window.__v);
    results.push({ profile: prof.name, run, INP_ms: v.INP ? Math.round(v.INP.value) : null, INP_target: v.INP ? v.INP.target : null, LCP_ms: v.LCP ? Math.round(v.LCP.value) : null, LCP_element: v.LCP ? v.LCP.target : null, CLS: v.CLS ? +v.CLS.value.toFixed(4) : 0 });
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(out, JSON.stringify({ url, measuredAt: new Date().toISOString(), note: "Lab measurement: Playwright Chromium, web-vitals attribution build, 3 runs per profile; mobile profile throttles CPU 4x (no network throttling).", results }, null, 2));
for (const r of results) console.log(r.profile, "run", r.run, "INP", r.INP_ms, "LCP", r.LCP_ms, "CLS", r.CLS, "| LCP el:", r.LCP_element, "| INP target:", r.INP_target);
