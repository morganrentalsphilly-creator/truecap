import { chromium, DEVICES, NETWORKS, throttle, PROBE, shot, save, LIVE } from "./lib.mjs";
const [deviceName, netName, label] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ ...DEVICES[deviceName] });
await ctx.addInitScript(PROBE);
const page = await ctx.newPage();
await throttle(ctx, page, NETWORKS[netName]);
const t0 = Date.now();
const frames = [];
page.goto(LIVE + "/", { waitUntil: "commit", timeout: 60000 }).catch(() => {});
let i = 0;
while (Date.now() - t0 < 9000) {
  const dt = Date.now() - t0;
  try {
    const name = `timeline-${label}-${String(i).padStart(2, "0")}`;
    await shot(page, name, { quality: 50 });
    const st = await page.evaluate(() => {
      const s = document.querySelector('[data-hero-ledger] [role="slider"]');
      const fig = document.querySelector("[data-hero-ledger]");
      const r = fig?.getBoundingClientRect();
      const banner = [...document.querySelectorAll("button")].find((x) => x.textContent?.trim() === "Accept all");
      const br = banner?.closest("div[role], section, aside, div")?.getBoundingClientRect();
      return { valuenow: s?.getAttribute("aria-valuenow") ?? null, heroTop: r ? Math.round(r.top) : null, heroH: r ? Math.round(r.height) : null, bannerTop: br ? Math.round(br.top) : null, readyState: document.readyState };
    }).catch(() => null);
    frames.push({ i, ms: dt, name, ...st });
  } catch (e) { frames.push({ i, ms: dt, err: String(e).slice(0, 80) }); }
  i += 1;
  await page.waitForTimeout(250);
}
const probe = await page.evaluate(() => window.__probe).catch(() => null);
save(`hero-timeline-${label}`, { device: deviceName, net: netName ?? "none", frames, probe });
console.log(label, frames.length, JSON.stringify(probe?.events?.slice(0, 20)), "lcp", JSON.stringify(probe?.lcp), "longtasks", probe?.longtasks?.length);
await b.close();
