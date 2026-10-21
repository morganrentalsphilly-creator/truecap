import { chromium, LIVE, denyCookies, save } from "./lib.mjs";
const b = await chromium.launch(); const out = {};
for (const [w, h] of [[390, 844], [412, 915], [1440, 900], [1095, 760]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600 }); await denyCookies(ctx);
  const p = await ctx.newPage(); await p.goto(LIVE + "/", { waitUntil: "networkidle" });
  out[`${w}x${h}`] = await p.evaluate(() => {
    const fig = document.querySelector("[data-hero-ledger] .highlight-stroke, [data-hero-ledger] [class*=highlight-stroke]");
    const track = document.querySelector("[data-price-scrubber] [role=slider]")?.closest("[data-orientation]") || document.querySelector("[data-price-scrubber] [role=slider]");
    const r = fig?.getBoundingClientRect(); const t = track?.getBoundingClientRect();
    return { keyFigureLabelTop: r ? Math.round(r.top) : null, trackTop: t ? Math.round(t.top) : null, fold: innerHeight };
  });
  await ctx.close();
}
save("hero-answer-position", out); console.log(JSON.stringify(out));
await b.close();
