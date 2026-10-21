// Trust pass, A16: the story's one sheet at 1440. The section's height, the
// rows' opacity as the steps scroll past (it accumulates and rests complete),
// and the same page without JavaScript (every row visible in one sheet).
//   BASE=http://127.0.0.1:3100 node docs/overhaul-2026-10/trust-pass/tools/story-sheet.mjs
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const b = await chromium.launch();
const out = {};
const rows = () => [...document.querySelectorAll("[data-story-panel] [data-story-row]")].map((r) => +getComputedStyle(r).opacity);
for (const js of [true, false]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: js });
  await ctx.addInitScript(() => { try { localStorage.setItem("truecap_cookie_consent_v1", "denied"); } catch {} });
  const p = await ctx.newPage();
  await p.goto(BASE + "/", { waitUntil: "load" });
  await p.waitForTimeout(800);
  const sectionHeight = await p.evaluate(() => Math.round(document.getElementById("how-it-works").getBoundingClientRect().height));
  const timeline = [];
  if (js) {
    const steps = await p.locator("[data-story-step]").count();
    for (let i = 0; i < steps; i++) {
      await p.locator("[data-story-step]").nth(i).scrollIntoViewIfNeeded();
      await p.evaluate((i) => { const el = document.querySelectorAll("[data-story-step]")[i]; window.scrollBy(0, el.getBoundingClientRect().top - innerHeight / 2 + 40); }, i);
      await p.waitForTimeout(600);
      timeline.push({ step: i + 1, rows: await p.evaluate(rows), armed: await p.evaluate(() => document.getElementById("how-it-works").hasAttribute("data-story-armed")) });
    }
    await p.screenshot({ path: "docs/overhaul-2026-10/trust-pass/shots/story-1440-rest.jpg", type: "jpeg", quality: 60 });
  }
  const atRest = await p.evaluate(rows);
  out[js ? "js" : "noJs"] = { sectionHeight, timeline, atRest };
  await ctx.close();
}
fs.writeFileSync("docs/overhaul-2026-10/trust-pass/instruments/story-sheet.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
await b.close();
