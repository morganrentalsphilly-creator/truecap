// Records the hero's "drag the price" interaction on the local production
// build (OVERHAUL.md §8, Checkpoint 2): the first-view glide from asking to
// the ceiling, a pointer drag up past asking and back, and the arrow keys.
// Usage: node docs/overhaul-2026-10/tools/hero-video.mjs [baseUrl] [outDir]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const OUT = process.argv[3] ?? "docs/overhaul-2026-10/phase-3";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const { name, width, height, mobile } of [
  { name: "hero-drag-1440", width: 1440, height: 900, mobile: false },
  { name: "hero-drag-390", width: 390, height: 844, mobile: true },
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
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const slider = page.locator('[data-hero-ledger=""] [role="slider"]');
  await slider.scrollIntoViewIfNeeded();
  // The first-view glide plays after a beat; let it finish.
  await page.waitForTimeout(2400);
  const box = await slider.boundingBox();
  const track = await page.locator('[data-hero-ledger=""] [data-orientation="horizontal"]').first().boundingBox();
  if (box && track) {
    const y = box.y + box.height / 2;
    const x0 = box.x + box.width / 2;
    await page.mouse.move(x0, y);
    await page.mouse.down();
    // Drag up to asking and a little past, then back below the ceiling.
    for (let i = 1; i <= 24; i += 1) {
      await page.mouse.move(x0 + ((track.x + track.width * 0.78 - x0) * i) / 24, y);
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(600);
    for (let i = 1; i <= 24; i += 1) {
      await page.mouse.move(track.x + track.width * 0.78 - ((track.width * 0.6) * i) / 24, y);
      await page.waitForTimeout(40);
    }
    await page.mouse.up();
    await page.waitForTimeout(600);
  }
  // Keyboard: focus the handle and step with the arrow keys.
  await slider.focus();
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(120);
  }
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(800);
  const video = page.video();
  await ctx.close();
  const recorded = await video.path();
  const target = path.join(OUT, `${name}.webm`);
  fs.renameSync(recorded, target);
  console.log("wrote", target);
}
await browser.close();
