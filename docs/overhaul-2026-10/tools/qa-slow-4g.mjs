// Phase 8: the hero on a throttled connection (Lighthouse's "Slow 4G":
// 150ms RTT, 1.6 Mbps down, 750 Kbps up) with 4× CPU slowdown, in Chromium.
// Reports when the first paint, the address field and the hero sheet land.
// Usage: node docs/overhaul-2026-10/tools/qa-slow-4g.mjs [base] [outDir]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const OUT = process.argv[3] ?? "docs/overhaul-2026-10/phase-8/slow-4g";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const runs = [];
for (let run = 0; run < 3; run += 1) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem("truecap_cookie_consent_v1", "denied"); } catch {} });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const t0 = Date.now();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const field = page.locator('input[aria-label="Property address or listing link"]').first();
  await field.waitFor({ state: "visible", timeout: 60000 });
  const fieldMs = Date.now() - t0;
  await page.locator('[data-hero-ledger=""]').waitFor({ state: "visible", timeout: 60000 });
  const sheetMs = Date.now() - t0;
  await page.waitForLoadState("networkidle", { timeout: 90000 }).catch(() => undefined);
  const timing = await page.evaluate(() => new Promise((resolve) => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = Object.fromEntries(performance.getEntriesByType("paint").map((p) => [p.name, Math.round(p.startTime)]));
    let lcp = null;
    try { const po = new PerformanceObserver((list) => { const last = list.getEntries().at(-1); if (last) lcp = Math.round(last.startTime); }); po.observe({ type: "largest-contentful-paint", buffered: true }); } catch {}
    setTimeout(() => resolve({ domContentLoaded: Math.round(nav?.domContentLoadedEventEnd ?? 0), load: Math.round(nav?.loadEventEnd ?? 0), ...paints, lcp }), 300);
  }));
  runs.push({ run, addressFieldVisibleMs: fieldMs, heroSheetVisibleMs: sheetMs, ...timing });
  if (run === 0) await page.screenshot({ path: path.join(OUT, "home-390-slow-4g.png") });
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(runs, null, 2));
console.log(JSON.stringify(runs, null, 2));
