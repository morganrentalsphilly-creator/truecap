// Trust pass, A12: the sample's decision card height at 390x844 and 1440x900,
// on this branch and on main, after the reveal settles.
//   node docs/overhaul-2026-10/trust-pass/tools/card-height.mjs http://127.0.0.1:3100 http://127.0.0.1:3101
import { chromium } from "playwright";
import fs from "node:fs";
const [branch, main] = process.argv.slice(2);
const b = await chromium.launch();
const out = {};
for (const [label, base] of [["branch", branch], ["main", main]]) {
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
    await ctx.addInitScript(() => { try { localStorage.setItem("truecap_cookie_consent_v1", "denied"); } catch {} });
    const p = await ctx.newPage();
    await p.goto(base + "/analyze?sample=1", { waitUntil: "load" });
    await p.locator("section[aria-labelledby='decision-summary-title'][data-decision-settled], section[aria-labelledby='decision-summary-title']").last().waitFor({ timeout: 30000 });
    await p.waitForTimeout(2500);
    out[`${label}-${w}`] = await p.evaluate(() => {
      const card = document.querySelector("section[aria-labelledby='decision-summary-title']");
      const r = card.getBoundingClientRect();
      const actions = card.querySelector('[aria-label="Primary result actions"]')?.getBoundingClientRect();
      return { height: Math.round(r.height), actionsBottom: actions ? Math.round(actions.bottom + scrollY) : null, focus: document.activeElement?.id || document.activeElement?.tagName };
    });
    await ctx.close();
  }
}
for (const w of [390, 1440]) out[`shorter-${w}`] = `${Math.round((1 - out[`branch-${w}`].height / out[`main-${w}`].height) * 100)}%`;
fs.writeFileSync("docs/overhaul-2026-10/trust-pass/instruments/card-height.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
await b.close();
