// Break it: history, refresh, two tabs, second run, zoom, 320px, reduced motion, no JS, blocked third parties, early drag.
import { chromium, DEVICES, NETWORKS, throttle, PROBE, shot, save, LIVE, denyCookies } from "./lib.mjs";
import { fillDeal, runAndRead } from "./analyzer-lib.mjs";
const b = await chromium.launch();
const R = {};
const deal = { address: "4821 Larchwood Ave, Philadelphia, PA 19143", price: 250000, beds: 3, rent: 2400 };
const deal2 = { address: "5919 Belmar Ter, Philadelphia, PA 19143", price: 210000, beds: 3, rent: 2100 };
async function ctxPage(opts = {}, device = "desktop") { const ctx = await b.newContext({ ...DEVICES[device], ...opts }); await denyCookies(ctx); const p = await ctx.newPage(); return [ctx, p]; }
const safe = async (name, fn) => { try { R[name] = await fn(); } catch (e) { R[name] = { error: String(e).slice(0, 300) }; } console.log(name, JSON.stringify(R[name]).slice(0, 500)); };

await safe("second-run", async () => {
  const [ctx, p] = await ctxPage();
  await p.goto(LIVE + "/analyze", { waitUntil: "networkidle" });
  await fillDeal(p, deal); const r1 = await runAndRead(p);
  await p.goto(LIVE + "/analyze", { waitUntil: "networkidle" });
  await fillDeal(p, deal2); const r2 = await runAndRead(p);
  const s = await shot(p, "flow-second-run-1440");
  await ctx.close();
  return { first: { verdict: r1.verdict, card: r1.card?.slice(0, 200) }, second: { ok: r2.ok, verdict: r2.verdict, card: r2.card?.slice(0, 500) }, shot: s };
});

await safe("back-forward-mid-run", async () => {
  const [ctx, p] = await ctxPage();
  await p.goto(LIVE + "/", { waitUntil: "networkidle" });
  await p.goto(LIVE + "/analyze", { waitUntil: "networkidle" });
  await fillDeal(p, deal);
  await p.locator('[data-inform-submit="true"]').first().click();
  await p.waitForTimeout(150);
  await p.goBack({ waitUntil: "networkidle" }); const afterBack = p.url();
  await p.goForward({ waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  const st = await p.evaluate(() => ({ url: location.href, address: document.querySelector("#address")?.value, price: document.querySelector("#purchasePrice")?.value, verdict: document.querySelector("#decision-summary-title")?.innerText ?? null }));
  const s = await shot(p, "flow-back-forward-1440");
  await ctx.close();
  return { afterBack, ...st, shot: s };
});

await safe("refresh-mid-run", async () => {
  const [ctx, p] = await ctxPage();
  await p.goto(LIVE + "/analyze", { waitUntil: "networkidle" });
  await fillDeal(p, deal);
  await p.locator('[data-inform-submit="true"]').first().click();
  await p.waitForTimeout(150);
  await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  const st = await p.evaluate(() => ({ url: location.href, address: document.querySelector("#address")?.value, price: document.querySelector("#purchasePrice")?.value, rent: document.querySelector("#monthlyRent")?.value, verdict: document.querySelector("#decision-summary-title")?.innerText ?? null }));
  const s = await shot(p, "flow-refresh-1440");
  await ctx.close();
  return { ...st, shot: s };
});

await safe("two-tabs", async () => {
  const ctx = await b.newContext({ ...DEVICES.desktop }); await denyCookies(ctx);
  const a = await ctx.newPage(); const c = await ctx.newPage();
  await a.goto(LIVE + "/analyze", { waitUntil: "networkidle" }); await c.goto(LIVE + "/analyze", { waitUntil: "networkidle" });
  await fillDeal(a, deal); await fillDeal(c, deal2);
  const ra = await runAndRead(a); const rc = await runAndRead(c);
  await a.bringToFront(); await a.waitForTimeout(1500);
  const aNow = await a.evaluate(() => document.querySelector('section[aria-labelledby="decision-summary-title"]')?.innerText?.replace(/\s+/g, " ").slice(0, 300));
  const s1 = await shot(a, "flow-two-tabs-a"), s2 = await shot(c, "flow-two-tabs-b");
  await ctx.close();
  return { tabA: ra.card?.slice(0, 260), tabB: rc.card?.slice(0, 400), tabAAfterB: aNow, shots: [s1, s2] };
});

for (const [name, url] of [["home", "/"], ["sample", "/analyze?sample=1"], ["pricing", "/pricing"]]) {
  await safe(`zoom200-${name}`, async () => {
    const ctx = await b.newContext({ viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 }); await denyCookies(ctx);
    const p = await ctx.newPage(); await p.goto(LIVE + url, { waitUntil: "networkidle" }); await p.waitForTimeout(name === "sample" ? 5000 : 1500);
    const st = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, headerH: document.querySelector("header")?.getBoundingClientRect().height, stickyBottom: [...document.querySelectorAll("*")].filter(e => { const s = getComputedStyle(e); return (s.position === "fixed" || s.position === "sticky") && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().bottom >= innerHeight - 2; }).map(e => Math.round(e.getBoundingClientRect().height)) }));
    const s = await shot(p, `flow-zoom200-${name}`); await ctx.close(); return { ...st, shot: s };
  });
  await safe(`w320-${name}`, async () => {
    const [ctx, p] = await ctxPage({}, "narrow"); await p.goto(LIVE + url, { waitUntil: "networkidle" }); await p.waitForTimeout(name === "sample" ? 5000 : 1500);
    const st = await p.evaluate(() => { const over = [...document.querySelectorAll("body *")].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1; }).slice(0, 6).map(e => `${e.tagName.toLowerCase()}.${(e.className?.toString() || "").slice(0, 40)} r=${Math.round(e.getBoundingClientRect().right)}`); return { sw: document.documentElement.scrollWidth, iw: innerWidth, over }; });
    const s = await shot(p, `flow-w320-${name}`, { fullPage: name !== "sample", quality: 50 }); await ctx.close(); return { ...st, shot: s };
  });
}

await safe("reduced-motion", async () => {
  const [ctx, p] = await ctxPage({ reducedMotion: "reduce" }, "iphone");
  await p.addInitScript(PROBE);
  await p.goto(LIVE + "/", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelector("[data-hero-ledger]").scrollIntoView({ block: "start" })); await p.waitForTimeout(2500);
  const home = await p.evaluate(() => ({ running: document.getAnimations().filter(a => a.playState === "running").map(a => a.animationName || a.constructor.name).slice(0, 10), valuenows: window.__probe?.events?.filter(e => e[1] === "valuenow").map(e => e[2]) }));
  const s1 = await shot(p, "flow-reduced-home-390");
  await p.goto(LIVE + "/analyze?sample=1", { waitUntil: "networkidle" }); await p.locator("#decision-summary-title").waitFor({ timeout: 30000 }); await p.waitForTimeout(300);
  const result = await p.evaluate(() => ({ revealAttr: document.querySelector("[data-result-reveal]") ? "present" : "absent", steps: [...document.querySelectorAll("[data-reveal-step]")].map(e => getComputedStyle(e).opacity), running: document.getAnimations().filter(a => a.playState === "running").length }));
  const s2 = await shot(p, "flow-reduced-result-390");
  await ctx.close(); return { home, result, shots: [s1, s2] };
});

await safe("no-js", async () => {
  const out = {};
  for (const [name, url] of [["home", "/"], ["analyze", "/analyze"], ["sample", "/analyze?sample=1"], ["pricing", "/pricing"], ["memo", "/sample-decision-memo"]]) {
    const [ctx, p] = await ctxPage({ javaScriptEnabled: false }, "iphone");
    await p.goto(LIVE + url, { waitUntil: "load" });
    out[name] = await p.evaluate(() => ({ h1: document.querySelector("h1")?.innerText?.slice(0, 60), words: (document.querySelector("main")?.innerText || "").split(/\s+/).filter(Boolean).length, forms: document.querySelectorAll("form").length, formActions: [...document.querySelectorAll("form")].map(f => f.getAttribute("action") || "(none)").slice(0, 3), noscript: [...document.querySelectorAll("noscript")].map(n => n.textContent.slice(0, 80)).slice(0, 2), verdict: document.querySelector("#decision-summary-title")?.innerText ?? null }));
    out[name].shot = await shot(p, `flow-nojs-${name}-390`);
    await ctx.close();
  }
  // Does the hero's form do anything without JS?
  const [ctx, p] = await ctxPage({ javaScriptEnabled: false }, "iphone");
  await p.goto(LIVE + "/", { waitUntil: "load" });
  await p.locator('input[aria-label="Property address or listing link"]').first().fill("4821 Larchwood Ave, Philadelphia, PA 19143");
  await p.getByRole("button", { name: "Analyze a deal free" }).first().click(); await p.waitForTimeout(2500);
  out.heroSubmit = { url: p.url(), shot: await shot(p, "flow-nojs-hero-submit-390") };
  await ctx.close();
  return out;
});

await safe("blocked-third-party", async () => {
  const [ctx, p] = await ctxPage({}, "iphone");
  const blocked = new Set();
  await ctx.route("**/*", (route) => { const u = new URL(route.request().url()); if (!/(^|\.)usetruecap\.com$/.test(u.hostname)) { blocked.add(u.hostname); return route.abort(); } return route.continue(); });
  const errors = []; p.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const t0 = Date.now();
  await p.goto(LIVE + "/", { waitUntil: "load", timeout: 60000 }); const homeLoad = Date.now() - t0;
  await p.goto(LIVE + "/analyze", { waitUntil: "load" });
  await fillDeal(p, deal); const r = await runAndRead(p);
  const s = await shot(p, "flow-blocked-3p-result-390");
  await ctx.close();
  return { blockedHosts: [...blocked], homeLoadMs: homeLoad, ok: r.ok, ms: r.ms, verdict: r.verdict, errors: errors.slice(0, 5), shot: s };
});

await safe("early-drag-slow4g", async () => {
  const ctx = await b.newContext({ ...DEVICES.iphone }); await denyCookies(ctx); await ctx.addInitScript(PROBE);
  const p = await ctx.newPage(); await throttle(ctx, p, { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, cpu: 4 });
  const t0 = Date.now();
  await p.goto(LIVE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.locator("[data-hero-ledger]").waitFor({ state: "visible", timeout: 60000 });
  await p.evaluate(() => document.querySelector("[data-price-scrubber]").scrollIntoView({ block: "center" }));
  const track = await p.locator('[data-hero-ledger] [role="slider"]').first().boundingBox();
  const dragAt = Date.now() - t0;
  // Drag the static diamond left by 120px with the pointer, as a thumb would.
  await p.mouse.move(track.x + 14, track.y + 14); await p.mouse.down(); await p.mouse.move(track.x - 110, track.y + 14, { steps: 10 }); await p.mouse.up();
  const valueAfterDrag = await p.locator('[data-hero-ledger] [role="slider"]').first().getAttribute("aria-valuenow");
  const s1 = await shot(p, "flow-early-drag-0");
  await p.waitForTimeout(9000);
  const s2 = await shot(p, "flow-early-drag-9s");
  const probe = await p.evaluate(() => window.__probe);
  // Second attempt after hydration.
  const tb = await p.locator('[data-hero-ledger] [role="slider"]').first().boundingBox();
  await p.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2); await p.mouse.down(); await p.mouse.move(tb.x - 110, tb.y + tb.height / 2, { steps: 10 }); await p.mouse.up();
  await p.waitForTimeout(1500);
  const valueAfterLateDrag = await p.locator('[data-hero-ledger] [role="slider"]').first().getAttribute("aria-valuenow");
  await ctx.close();
  return { dragAtMs: dragAt, valueAfterDrag, valueAfterLateDrag, valuenowTimeline: probe.events.filter(e => e[1] === "valuenow"), shots: [s1, s2] };
});

save("flows-b", R);
await b.close();
