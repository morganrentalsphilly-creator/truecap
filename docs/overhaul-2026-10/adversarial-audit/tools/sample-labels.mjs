import { chromium, LIVE, denyCookies } from "./lib.mjs";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await denyCookies(ctx);
const p = await ctx.newPage(); await p.goto(LIVE + "/analyze?sample=1", { waitUntil: "networkidle" });
await p.locator("#decision-summary-title").waitFor({ timeout: 30000 }); await p.waitForTimeout(1500);
console.log(await p.evaluate(() => {
  const hits = []; const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) { const t = walker.currentNode.textContent; if (/synthetic/i.test(t)) { const el = walker.currentNode.parentElement; if (el.getBoundingClientRect().height > 0) hits.push(t.trim().slice(0, 100)); } }
  const inputs = [...document.querySelectorAll("input")].filter(i => /synthetic/i.test(i.value)).map(i => `${i.id}=${i.value}`);
  const srcTags = [...document.querySelectorAll("body *")].filter(e => e.children.length === 0 && /^(Your entered rent|Your rate estimate|HUD FMR|FRED rate|User estimate|TrueCap financing default)$/.test(e.textContent.trim())).map(e => e.textContent.trim());
  return { visibleTextHits: hits, inputs, srcTags: [...new Set(srcTags)], rate: document.querySelector("#interestRate")?.value, rent: document.querySelector("#monthlyRent")?.value };
}));
await b.close();
