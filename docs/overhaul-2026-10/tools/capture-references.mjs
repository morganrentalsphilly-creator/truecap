// Reference capture for the 2026-10 overhaul (OVERHAUL.md §3): first screen
// and a scrolled full page of each reference site at 1440 and 390.
// Usage: node docs/overhaul-2026-10/tools/capture-references.mjs [outDir]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = process.argv[2] ?? "docs/overhaul-2026-10/references";
const SITES = [
  ["wise", "https://wise.com/us/"],
  ["stripe", "https://stripe.com/"],
  ["mercury", "https://mercury.com/"],
  ["ramp", "https://ramp.com/"],
  ["plaid", "https://plaid.com/"],
  ["linear", "https://linear.app/"],
  ["dealcheck", "https://dealcheck.io/"],
  ["biggerpockets-calc", "https://www.biggerpockets.com/rental-property-calculator"],
];
const WIDTHS = [
  { width: 1440, height: 900, mobile: false },
  { width: 390, height: 844, mobile: true },
];

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const log = [];

for (const [slug, url] of SITES) {
  for (const { width, height, mobile } of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      isMobile: mobile,
      hasTouch: mobile,
      userAgent: mobile
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    });
    const page = await ctx.newPage();
    try {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT, `${slug}-${width}-first.png`) });
      // Scroll through so lazy sections mount, then a capped full page.
      await page.evaluate(async () => {
        const step = Math.max(300, Math.floor(window.innerHeight * 0.8));
        const max = Math.min(document.documentElement.scrollHeight, 9000);
        for (let y = 0; y < max; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 150));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(OUT, `${slug}-${width}-full.png`),
        fullPage: true,
        clip: { x: 0, y: 0, width, height: Math.min(9000, await page.evaluate(() => document.documentElement.scrollHeight)) },
      });
      const facts = await page.evaluate(() => {
        const fonts = new Set(
          [...document.querySelectorAll("h1,h2,h3,p,a,button")].map((el) => getComputedStyle(el).fontFamily.split(",")[0].trim().replace(/"/g, "")),
        );
        const h1 = document.querySelector("h1");
        return { title: document.title, h1: h1 ? h1.innerText.trim().slice(0, 120) : null, fonts: [...fonts].slice(0, 6), bg: getComputedStyle(document.body).backgroundColor };
      });
      log.push({ slug, url, width, status: res?.status() ?? null, ...facts });
      process.stdout.write(`captured ${slug} @ ${width}\n`);
    } catch (err) {
      log.push({ slug, url, width, error: String(err).slice(0, 200) });
      process.stdout.write(`FAILED ${slug} @ ${width}: ${String(err).slice(0, 120)}\n`);
    }
    await ctx.close();
  }
}
fs.writeFileSync(path.join(OUT, "facts.json"), JSON.stringify(log, null, 2));
await browser.close();
