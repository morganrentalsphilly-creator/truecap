// Screenshots the three direction comps at 1440 and 390 (first screen and
// full page) and composes a side-by-side contact sheet.
// Usage: node docs/overhaul-2026-10/tools/capture-comps.mjs
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const DIR = path.resolve("docs/overhaul-2026-10/directions");
const OUT = path.join(DIR, "shots");
fs.mkdirSync(OUT, { recursive: true });
const COMPS = ["a-deal-desk", "b-blueprint", "c-big-numbers"];
const VIEWS = [
  { w: 1440, h: 900, mobile: false },
  { w: 390, h: 844, mobile: true },
];

const browser = await chromium.launch();
for (const comp of COMPS) {
  for (const v of VIEWS) {
    const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 2, isMobile: v.mobile, hasTouch: v.mobile });
    const page = await ctx.newPage();
    await page.goto("file://" + path.join(DIR, `${comp}.html`), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${comp}-${v.w}-first.png`) });
    await page.screenshot({ path: path.join(OUT, `${comp}-${v.w}-full.png`), fullPage: true });
    await ctx.close();
    console.log(`captured ${comp} @ ${v.w}`);
  }
}

// Contact sheet: hero at 1440 on top, the three 390 first screens beside the
// full pages, so the founder sees all three side by side at once.
const sheet = `<!doctype html><meta charset="utf-8"><title>TrueCap overhaul: directions side by side</title>
<style>
body{margin:0;background:#1a1d24;color:#e8ebf0;font:14px/1.4 ui-sans-serif,system-ui;padding:24px}
h1{font-size:18px;margin:0 0 16px}
.row{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:28px}
.col h2{font-size:14px;margin:0 0 8px;color:#aab2bf}
img{width:100%;display:block;border-radius:6px;box-shadow:0 6px 24px rgba(0,0,0,.5)}
.phones{display:grid;grid-template-columns:1fr 1fr;gap:12px}
</style>
<h1>TrueCap overhaul · Checkpoint 1 · three directions (figures from the engine)</h1>
<div class="row">
${COMPS.map((c, i) => `<div class="col"><h2>${["A · Deal Desk", "B · Blueprint", "C · Big Numbers"][i]} · hero at 1440</h2><img src="shots/${c}-1440-first.png"></div>`).join("")}
</div>
<div class="row">
${COMPS.map((c) => `<div class="col"><h2>Full page at 1440</h2><img src="shots/${c}-1440-full.png"></div>`).join("")}
</div>
<div class="row">
${COMPS.map((c) => `<div class="col"><h2>Phone at 390: first screen and full page</h2><div class="phones"><img src="shots/${c}-390-first.png"><img src="shots/${c}-390-full.png"></div></div>`).join("")}
</div>`;
fs.writeFileSync(path.join(DIR, "index.html"), sheet);

// Render the contact sheet itself as one image.
const ctx = await browser.newContext({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto("file://" + path.join(DIR, "index.html"), { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(DIR, "side-by-side.png"), fullPage: true });
await ctx.close();
await browser.close();
console.log("wrote index.html and side-by-side.png");
