// Trust pass, A2: does the swap from the sample's server-rendered decision to
// the live one move anything? For each width: the static card alone (scripts
// blocked after the inline head bootstrap), then the live card after a normal
// load; the positions of the parts both share, and the CLS of the live load.
//   BASE=http://127.0.0.1:3100 node docs/overhaul-2026-10/trust-pass/tools/sample-swap.mjs
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const OUT = "docs/overhaul-2026-10/trust-pass";
const sizes = [[390, 844, true], [1095, 760, false], [1440, 900, false]];
const measure = () => {
  const card = document.querySelector('[data-sample-prerender]')?.getBoundingClientRect().height
    ? document.querySelector('[data-sample-prerender] section[aria-labelledby]')
    : document.querySelector('section[aria-labelledby="decision-summary-title"]');
  if (!card) return null;
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), left: Math.round(r.left), h: Math.round(r.height), w: Math.round(r.width) }; };
  return {
    card: box(card),
    heading: box(card.querySelector("h2")),
    ceiling: box(card.querySelector(".highlight-stroke")),
    track: box(card.querySelector(".h-\\[2px\\]")),
    figures: box(card.querySelector('[aria-label="First-year investment snapshot"]')),
    actions: box(card.querySelector(".mt-4.grid")),
    scrollY: Math.round(scrollY),
  };
};
const b = await chromium.launch();
const rows = [];
for (const [w, h, mobile] of sizes) {
  const ctxA = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  await ctxA.addInitScript(() => { try { localStorage.setItem("truecap_cookie_consent_v1", "denied"); } catch {} });
  const a = await ctxA.newPage();
  await a.route("**/_next/static/chunks/**", (r) => r.abort());
  await a.goto(BASE + "/analyze?sample=1", { waitUntil: "load" });
  await a.waitForTimeout(500);
  const statik = await a.evaluate(measure);
  await a.screenshot({ path: `${OUT}/shots/sample-static-${w}.jpg`, type: "jpeg", quality: 60 });
  await ctxA.close();

  const ctxB = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  await ctxB.addInitScript(() => {
    try { localStorage.setItem("truecap_cookie_consent_v1", "denied"); } catch {}
    window.__cls = 0; window.__shifts = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__shifts.push([Math.round(e.startTime), +e.value.toFixed(4), (e.sources || []).map((s) => s.node?.nodeName + "." + String(s.node?.className || "").slice(0, 40))]); } }).observe({ type: "layout-shift", buffered: true });
  });
  const p = await ctxB.newPage();
  await p.goto(BASE + "/analyze?sample=1", { waitUntil: "load" });
  await p.locator("#decision-summary-title").waitFor({ timeout: 30000 });
  await p.waitForTimeout(2500);
  const live = await p.evaluate(measure);
  const cls = await p.evaluate(() => ({ cls: +window.__cls.toFixed(4), shifts: window.__shifts, flag: document.documentElement.hasAttribute("data-sample"), focus: document.activeElement?.id || document.activeElement?.tagName }));
  await p.screenshot({ path: `${OUT}/shots/sample-live-${w}.jpg`, type: "jpeg", quality: 60 });
  await ctxB.close();
  const delta = {};
  for (const k of ["card", "heading", "ceiling", "track", "figures", "actions"]) delta[k] = statik?.[k] && live?.[k] ? live[k].top - statik[k].top : null;
  rows.push({ viewport: `${w}x${h}`, statik, live, deltaTop: delta, ...cls });
}
fs.writeFileSync(`${OUT}/instruments/sample-swap.json`, JSON.stringify(rows, null, 2));
for (const r of rows) console.log(r.viewport, "deltaTop", JSON.stringify(r.deltaTop), "CLS", r.cls, "flag left", r.flag, "focus", r.focus, "live card h", r.live?.card?.h, "static h", r.statik?.card?.h);
await b.close();
