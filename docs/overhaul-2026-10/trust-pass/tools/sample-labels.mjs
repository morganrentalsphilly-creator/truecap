// Trust pass, A1: the sample's rent and rate carry one source line on every
// surface: the homepage hero, the opened sample's input tags, the memo.
//   BASE=http://127.0.0.1:3100 node docs/overhaul-2026-10/trust-pass/tools/sample-labels.mjs
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const RENT = "Sample input, 25 Aug 2026";
const RATE = "FRED, 20 Aug 2026";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem("truecap_cookie_consent_v1", "denied"); } catch {} });
const p = await ctx.newPage();
const text = async () => p.evaluate(() => document.body.innerText);
const out = {};
await p.goto(BASE + "/", { waitUntil: "networkidle" });
let t = await text();
out.home = { rent: t.includes(RENT), rate: t.includes(RATE), hudFmrOnSample: /Rent\s+\$3,050\/mo\s*·\s*HUD FMR/.test(t) };
await p.goto(BASE + "/analyze?sample=1", { waitUntil: "networkidle" });
await p.locator("[data-decision-settled]").waitFor({ timeout: 30000 });
await p.waitForTimeout(1500);
// Open every disclosure so the input tags are in the visible text.
await p.evaluate(() => document.querySelectorAll("details").forEach((d) => d.setAttribute("open", "")));
await p.waitForTimeout(500);
t = await text();
out.sample = { rent: t.includes(RENT), rate: t.includes(RATE), yourEnteredRent: t.includes("Your entered rent"), yourRateEstimate: t.includes("Your rate estimate"), synthetic: /synthetic/i.test(t) };
await p.goto(BASE + "/sample-decision-memo", { waitUntil: "networkidle" });
t = await text();
out.memo = { rent: t.includes(RENT), rate: t.includes(RATE) };
fs.writeFileSync("docs/overhaul-2026-10/trust-pass/instruments/sample-labels.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
await b.close();
