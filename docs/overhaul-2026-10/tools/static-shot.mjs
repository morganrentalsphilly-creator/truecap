// Screenshots a static HTML file at desktop and phone widths. Used with the
// Phase 6 render harness (a vitest file renders a signed-in surface with
// mock data to HTML next to the built stylesheet, since no local Supabase
// exists to sign in against). Usage: node docs/overhaul-2026-10/tools/static-shot.mjs <dir> <name>
import { chromium } from "playwright";
import path from "node:path";
const dir = process.argv[2];
const name = process.argv[3] ?? "shell";
const browser = await chromium.launch();
for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto("file://" + path.join(dir, `${name}.html`), { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(dir, `${name}-${w}.png`), fullPage: false });
  await ctx.close();
}
await browser.close();
console.log("shot", name);
