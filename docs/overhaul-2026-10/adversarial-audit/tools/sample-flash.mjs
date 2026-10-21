// Times what a visitor sees after tapping "See the sample deal": frames every ~100 ms.
import { chromium, DEVICES, NETWORKS, throttle, shot, save, LIVE, denyCookies } from "./lib.mjs";
const [device, net, label] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ ...DEVICES[device] });
await denyCookies(ctx);
const page = await ctx.newPage();
await throttle(ctx, page, NETWORKS[net]);
const t0 = Date.now();
page.goto(LIVE + "/analyze?sample=1", { waitUntil: "commit", timeout: 60000 }).catch(() => {});
const frames = [];
let i = 0, verdictAt = null, formAt = null;
while (Date.now() - t0 < (net ? 14000 : 10000)) {
  const st = await page.evaluate(() => ({
    form: !!document.querySelector("#purchasePrice") && document.querySelector("#purchasePrice").getBoundingClientRect().height > 0,
    verdict: !!document.querySelector("#decision-summary-title") && document.querySelector("#decision-summary-title").getBoundingClientRect().height > 0,
    // Trust pass (A2): the sample's server-rendered decision, before the live one.
    prerender: !!document.querySelector("[data-sample-prerender]") && document.querySelector("[data-sample-prerender]").getBoundingClientRect().height > 0,
    h1: document.querySelector("h1")?.innerText?.slice(0, 50) ?? null,
  })).catch(() => null);
  const ms = Date.now() - t0;
  if (st?.form && formAt == null) formAt = ms;
  if (st?.verdict && verdictAt == null) verdictAt = ms;
  if (i < 40 && (i % (net ? 1 : 2) === 0)) frames.push({ ms, ...st, shot: await shot(page, `sample-${label}-${String(i).padStart(2, "0")}`, { quality: 45 }).catch(() => null) });
  else frames.push({ ms, ...st });
  i++;
  if (verdictAt && ms - verdictAt > 1500) break;
}
save(`sample-flash-${label}`, { device, net: net ?? "none", formFirstVisibleMs: formAt, verdictVisibleMs: verdictAt, frames });
const formVisibleWindow = frames.filter(f => f.form && !f.verdict && !f.prerender).map(f => f.ms);
const prerenderFrames = frames.filter(f => f.prerender).map(f => f.ms);
console.log(label, "static card visible", prerenderFrames.length ? `${prerenderFrames[0]}..${prerenderFrames.at(-1)}` : "never", "frames with both", frames.filter(f => f.prerender && f.verdict).length);
console.log(label, "form first visible", formAt, "verdict visible", verdictAt, "form-only frames", formVisibleWindow.length ? `${formVisibleWindow[0]}..${formVisibleWindow.at(-1)}` : "none");
await b.close();
