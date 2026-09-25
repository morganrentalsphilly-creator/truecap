// Spot-check axe on a few routes without a full crawl.
//   node audit/axe-probe.mjs http://127.0.0.1:3100 /path/one /path/two
// Uses reducedMotion so scroll-reveal sections are measured at full opacity
// (the 2026-09 audit's "/states has 99 contrast violations" was a probe
// artifact without it).
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const base = process.argv[2];
const paths = process.argv.slice(3);
if (!base || paths.length === 0) {
  console.error("usage: node audit/axe-probe.mjs <base url> <path> [path…]");
  process.exit(2);
}
const browser = await chromium.launch();
let total = 0;
for (const width of [375, 1280]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: "networkidle" });
    const r = await new AxeBuilder({ page }).analyze();
    const bad = r.violations.filter((v) => ["serious", "critical", "moderate"].includes(v.impact ?? ""));
    total += bad.length;
    console.log(`${p}@${width}: ${bad.length} ${bad.map((v) => `${v.impact}:${v.id}×${v.nodes.length}`).join(", ")}`);
  }
  await ctx.close();
}
await browser.close();
console.log(`total ${total}`);
process.exit(total === 0 ? 0 : 1);
