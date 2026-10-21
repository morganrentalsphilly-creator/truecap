// Trust pass, A14: does the sticky conversion bar ever sit over a plan card?
// Scrolls the homepage in steps at 1440x900 and 1095x760 and, at each stop,
// checks the bar's box against every plan card's box.
//   BASE=http://127.0.0.1:3100 node docs/overhaul-2026-10/trust-pass/tools/bar-overlap.mjs
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const b = await chromium.launch();
const out = {};
for (const [w, h] of [[1440, 900], [1095, 760]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(() => { try { localStorage.setItem("truecap_cookie_consent_v1", "denied"); } catch {} });
  const p = await ctx.newPage();
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  const stops = [];
  for (let y = 0; y < H; y += Math.round(h * 0.5)) {
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await p.waitForTimeout(250);
    stops.push(await p.evaluate(() => {
      const bar = document.querySelector("[data-conversion-bar-root]");
      if (!bar) return { y: Math.round(scrollY), bar: false, overPlan: false };
      const r = bar.getBoundingClientRect();
      const cards = [...document.querySelectorAll('[aria-labelledby="plans-heading"] article')];
      const overPlan = cards.some((c) => { const k = c.getBoundingClientRect(); return k.bottom > r.top && k.top < r.bottom && k.right > r.left && k.left < r.right; });
      return { y: Math.round(scrollY), bar: true, overPlan, docked: Math.round(r.width) === innerWidth && Math.round(r.bottom) === innerHeight };
    }));
  }
  out[`${w}x${h}`] = { stops: stops.length, barShown: stops.filter((s) => s.bar).length, overPlan: stops.filter((s) => s.overPlan).length, allDocked: stops.filter((s) => s.bar).every((s) => s.docked) };
  await ctx.close();
}
fs.writeFileSync("docs/overhaul-2026-10/trust-pass/instruments/bar-overlap.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
await b.close();
