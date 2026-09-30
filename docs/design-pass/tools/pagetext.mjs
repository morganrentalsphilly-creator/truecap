import { chromium } from "playwright";
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
await ctx.addInitScript(() => { try { localStorage.setItem("truecap_cookie_consent_v1", "denied"); } catch {} });
const p = await ctx.newPage(); await p.goto(process.argv[2], { waitUntil: "networkidle" });
const t = await p.evaluate(() => { const m = document.querySelector("main"); m.querySelectorAll("details").forEach(d => d.open = true); return m.innerText; });
console.log(t); await b.close();
