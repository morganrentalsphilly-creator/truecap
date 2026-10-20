import { chromium } from "playwright";
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
await p.goto(process.argv[2], { waitUntil: "networkidle" });
const r = await p.evaluate(() => {
  const isCard = (el) => { const s = getComputedStyle(el); const radius = parseFloat(s.borderTopLeftRadius) > 0; const border = parseFloat(s.borderTopWidth) > 0 || parseFloat(s.borderBottomWidth) > 0; const shadow = s.boxShadow !== "none"; const bg = s.backgroundColor !== "rgba(0, 0, 0, 0)"; const r = el.getBoundingClientRect(); return radius && (border || shadow || bg) && r.width > 40 && r.height > 24; };
  const cards = [...document.querySelectorAll("main *")].filter(isCard);
  const out = [];
  for (const c of cards) { const inner = cards.filter((o) => o !== c && c.contains(o)); if (inner.length) out.push({ outer: c.tagName + "." + [...c.classList].slice(0,4).join("."), inner: inner.slice(0,6).map((o) => o.tagName + "." + [...o.classList].slice(0,4).join(".")) }); }
  return out;
});
console.log(JSON.stringify(r, null, 1)); await b.close();
