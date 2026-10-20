import { chromium } from "playwright";
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
await ctx.addInitScript(() => { try { localStorage.setItem("truecap_cookie_consent_v1", "denied"); } catch {} });
const p = await ctx.newPage(); await p.goto(process.argv[2], { waitUntil: "networkidle" });
const r = await p.evaluate(() => {
  const m = document.querySelector("main");
  const wc = (t) => t.trim().split(/\s+/).filter(Boolean).length;
  const closed = wc(m.innerText);
  const per = [...m.querySelectorAll("section")].map((s) => ({ id: s.id || s.getAttribute("aria-labelledby") || s.className.slice(0, 30), words: wc(s.innerText) }));
  m.querySelectorAll("details").forEach((d) => (d.open = true));
  const open = wc(m.innerText);
  return { closed, open, per };
});
console.log(JSON.stringify(r, null, 1)); await b.close();
