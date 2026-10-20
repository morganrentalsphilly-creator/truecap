// Records the analyzer's result reveal on the local production build
// (OVERHAUL.md §7, Phase 4): the sample deal's decision card arriving
// (verdict, the Offer Ceiling rolling in, the price track, the figures, the
// chips, the next step), then a scroll into the report so the summary bar
// shows, and the bar's way back.
// Usage: node docs/overhaul-2026-10/tools/result-reveal-video.mjs [baseUrl] [outDir]
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const OUT = process.argv[3] ?? "docs/overhaul-2026-10/phase-4";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const { name, width, height, mobile } of [
  { name: "result-reveal-1440", width: 1440, height: 900, mobile: false },
  { name: "result-reveal-390", width: 390, height: 844, mobile: true },
]) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
    recordVideo: { dir: OUT, size: { width, height } },
  });
  await ctx.addInitScript(() => {
    try {
      window.localStorage.setItem("truecap_cookie_consent_v1", "denied");
    } catch {}
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "/analyze?sample=1", { waitUntil: "networkidle" });
  const results = page.locator('[data-analysis-results="true"]');
  await results.waitFor({ state: "visible", timeout: 30_000 });
  await results.scrollIntoViewIfNeeded();
  // The reveal and the Offer Ceiling's roll-in.
  await page.waitForTimeout(3200);
  // Into the report, so the summary bar appears, and back.
  for (let i = 0; i < 12; i += 1) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(900);
  const back = page.locator('[data-result-summary-bar=""] button');
  if (await back.isVisible().catch(() => false)) await back.click();
  await page.waitForTimeout(1200);
  const video = page.video();
  await ctx.close();
  const recorded = await video?.path();
  if (recorded) fs.renameSync(recorded, `${OUT}/${name}.webm`);
  console.log("recorded", name);
}
await browser.close();
