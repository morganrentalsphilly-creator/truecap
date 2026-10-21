import { chromium, LIVE, denyCookies } from "./lib.mjs";
import fs from "node:fs";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await denyCookies(ctx);
const p = await ctx.newPage(); await p.goto(LIVE + "/", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
const hero = await p.locator("[data-hero-ledger]").ariaSnapshot();
await p.goto(LIVE + "/analyze?sample=1", { waitUntil: "networkidle" }); await p.locator("#decision-summary-title").waitFor({ timeout: 30000 }); await p.waitForTimeout(2500);
const card = await p.locator('section[aria-labelledby="decision-summary-title"]').first().ariaSnapshot();
const focus = await p.evaluate(() => ({ id: document.activeElement?.id, tag: document.activeElement?.tagName }));
// Keyboard on the what-if slider: does a polite region announce on release?
const slider = p.locator('[aria-label="What-if offer price"]').first();
await slider.focus(); await p.keyboard.press("ArrowLeft"); await p.keyboard.press("ArrowLeft"); await p.waitForTimeout(1200);
const live = await p.evaluate(() => [...document.querySelectorAll('[aria-live]')].map(e => e.textContent.trim()).filter(Boolean).slice(0, 6));
fs.writeFileSync("docs/overhaul-2026-10/adversarial-audit/instruments/aria-snapshots.txt", `# Hero sheet (390)\n${hero}\n\n# Decision card (390, sample)\n${card}\n\n# Focus after the sample run: ${JSON.stringify(focus)}\n# Live regions after two ArrowLeft on the what-if: ${JSON.stringify(live)}\n`);
console.log(hero.split("\n").length, card.split("\n").length, JSON.stringify(focus), JSON.stringify(live));
await b.close();
