// Agent and investor flows: listing links, the result on a phone, memo, pricing, sign-up, 404.
import { chromium, DEVICES, shot, save, LIVE, denyCookies } from "./lib.mjs";
const b = await chromium.launch();
const R = {};
async function newPage(device, { cookies = false } = {}) { const ctx = await b.newContext({ ...DEVICES[device] }); if (!cookies) await denyCookies(ctx); const p = await ctx.newPage(); p._ctx = ctx; return p; }
const facts = (p) => p.evaluate(() => ({ url: location.href, sw: document.documentElement.scrollWidth, iw: innerWidth, h: document.documentElement.scrollHeight, h1: document.querySelector("h1")?.innerText?.slice(0, 80) }));

// 1. Listing links and an address into the hero (phone).
for (const [name, value] of [["zillow", "https://www.zillow.com/homedetails/5919-Belmar-Ter-Philadelphia-PA-19143/10282215_zpid/"], ["redfin", "https://www.redfin.com/PA/Philadelphia/5919-Belmar-Ter-19143/home/38831402"], ["address", "5919 Belmar Ter, Philadelphia, PA 19143"]]) {
  const p = await newPage("iphone");
  await p.goto(LIVE + "/", { waitUntil: "networkidle" });
  const field = p.locator('input[aria-label="Property address or listing link"]').first();
  await field.fill(value); await p.keyboard.press("Escape").catch(() => {});
  await p.getByRole("button", { name: "Analyze a deal free" }).first().click();
  await p.waitForTimeout(6000);
  const st = await p.evaluate(() => ({ address: document.querySelector("#address")?.value, price: document.querySelector("#purchasePrice")?.value, rent: document.querySelector("#monthlyRent")?.value, beds: document.querySelector("#bedrooms")?.value, focused: document.activeElement?.id || document.activeElement?.tagName, notes: [...document.querySelectorAll('[role=status],[role=alert],[data-sonner-toast],[data-listing-import]')].map(e => e.innerText.replace(/\s+/g, " ").slice(0, 200)).filter(Boolean) }));
  R[`hero-${name}`] = { ...(await facts(p)), ...st, shot: await shot(p, `flow-hero-${name}-390`) };
  await p._ctx.close();
}

// 2. The sample result on a phone, scrolled, and the what-if drag.
{
  const p = await newPage("iphone");
  await p.goto(LIVE + "/analyze?sample=1", { waitUntil: "networkidle" });
  await p.locator("#decision-summary-title").waitFor({ timeout: 30000 });
  await p.waitForTimeout(2500);
  const shots = [await shot(p, "flow-result-390-0")];
  const card = await p.locator('section[aria-labelledby="decision-summary-title"]').first().boundingBox();
  const y0 = await p.evaluate(() => scrollY);
  for (let k = 1; k <= 5; k++) { await p.evaluate(() => window.scrollBy(0, innerHeight * 0.85)); await p.waitForTimeout(600); shots.push(await shot(p, `flow-result-390-${k}`)); }
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500);
  const thumb = p.locator('[aria-label="What-if offer price"]').first();
  const tb = await thumb.boundingBox();
  const before = await thumb.getAttribute("aria-valuetext");
  await p.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2); await p.mouse.down();
  await p.mouse.move(tb.x - 90, tb.y + tb.height / 2, { steps: 12 }); await p.mouse.up();
  await p.waitForTimeout(1200);
  const after = await thumb.getAttribute("aria-valuetext");
  const cardText = await p.locator('section[aria-labelledby="decision-summary-title"]').first().innerText();
  shots.push(await shot(p, "flow-result-390-whatif"));
  const back = await p.getByRole("button", { name: /back to asking/i }).count();
  R["result-390"] = { ...(await facts(p)), cardTop: card?.y, cardH: card?.height, before, after, backToAsking: back, cardText: cardText.replace(/\s+/g, " ").slice(0, 900), shots };
  await p._ctx.close();
}

// 3. Memo, pricing, sign-up, 404 at both widths.
for (const device of ["iphone", "desktop"]) {
  const w = device === "iphone" ? 390 : 1440;
  for (const [name, url] of [["memo", "/sample-decision-memo"], ["pricing", "/pricing"], ["signup", "/auth/sign-up"], ["404", "/listings/zz-not-a-page"], ["for-agents", "/for-agents"]]) {
    const p = await newPage(device);
    const resp = await p.goto(LIVE + url, { waitUntil: "load", timeout: 45000 }); await p.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(1200);
    const o = { status: resp?.status(), ...(await facts(p)), first: await shot(p, `flow-${name}-${w}`), full: await shot(p, `flow-${name}-${w}-full`, { fullPage: true, quality: 50 }) };
    if (name === "pricing") {
      const radios = p.locator('[data-cadence]');
      o.cadence = await radios.evaluateAll(els => els.map(e => `${e.getAttribute("data-cadence")}=${e.getAttribute("aria-checked")}`));
      const mon = p.locator('[data-cadence="monthly"]').first();
      if (await mon.count()) { await mon.click(); await p.waitForTimeout(900); o.monthly = await shot(p, `flow-pricing-${w}-monthly`); }
      const ctas = await p.locator("main a, main button").evaluateAll(els => els.filter(e => e.getBoundingClientRect().height > 0).map(e => `${e.tagName}:${e.innerText.replace(/\s+/g, " ").slice(0, 40)}:${e.getAttribute("href") ?? ""}`));
      o.ctas = ctas.filter(c => /pro|start|trial|get|choose|upgrade/i.test(c)).slice(0, 12);
      const start = p.locator("main").getByRole("link", { name: /start|try|get pro|choose pro|upgrade/i }).first();
      if (await start.count()) { const href = await start.getAttribute("href"); await start.click(); await p.waitForTimeout(3000); o.checkoutStart = { clicked: href, landed: p.url(), shot: await shot(p, `flow-pricing-${w}-start`) }; }
    }
    R[`${name}-${w}`] = o;
    await p._ctx.close();
  }
}
save("flows-a", R);
for (const [k, v] of Object.entries(R)) console.log(k, JSON.stringify(v).slice(0, 600));
await b.close();
