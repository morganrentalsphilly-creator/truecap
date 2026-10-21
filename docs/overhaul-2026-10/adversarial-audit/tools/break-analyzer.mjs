import { chromium, DEVICES, shot, save, LIVE, denyCookies } from "./lib.mjs";
import { fillDeal, runAndRead } from "./analyzer-lib.mjs";
const device = process.argv[2] ?? "desktop";
const only = process.argv[3];
const cases = [
  ["baseline", { address: "4821 Larchwood Ave, Philadelphia, PA 19143", price: 250000, beds: 3, rent: 2400 }],
  ["bare-price-rent", { price: 250000, rent: 2400 }],
  ["cash-purchase", { address: "4821 Larchwood Ave, Philadelphia, PA 19143", price: 250000, beds: 3, rent: 2400, down: 100 }],
  ["zero-rent", { address: "4821 Larchwood Ave, Philadelphia, PA 19143", price: 250000, beds: 3, rent: 0 }],
  ["negative-cf", { address: "4821 Larchwood Ave, Philadelphia, PA 19143", price: 400000, beds: 3, rent: 1500 }],
  ["price-20k", { address: "1907 W Ontario St, Philadelphia, PA 19140", price: 20000, beds: 2, rent: 900 }],
  ["price-5m", { address: "1 Central Park West, New York, NY 10023", price: 5000000, beds: 4, rent: 25000 }],
  ["long-address", { address: "4821 Larchwood Avenue Apartment Building Rear Carriage House Unit 3 Floor 2 Behind The Blue Door Next To The Corner Store Across From The Park, ".repeat(2) + "Philadelphia, PA 19143", price: 250000, beds: 3, rent: 2400 }],
  ["emoji", { address: "🏠 4821 Larchwood Ave 🙂, Philadelphia, PA 19143", price: 250000, beds: 3, rent: 2400 }],
  ["excel-paste", { address: "4821 Larchwood Ave, Philadelphia, PA 19143", pastePrice: "$250,000.00\r\n", beds: 3, rent: 2400 }],
  ["zero-down-high-rate", { address: "4821 Larchwood Ave, Philadelphia, PA 19143", price: 250000, beds: 3, rent: 2400, down: 0, rate: 12 }],
];
const b = await chromium.launch();
const results = {};
for (const [name, d] of cases) {
  if (only && !only.split(",").includes(name)) continue;
  const ctx = await b.newContext({ ...DEVICES[device] });
  await denyCookies(ctx);
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await page.goto(LIVE + "/analyze", { waitUntil: "networkidle" });
  try {
    await fillDeal(page, d);
    const priceValue = await page.locator("#purchasePrice").inputValue();
    const r = await runAndRead(page);
    r.priceFieldValue = priceValue; r.pageErrors = errors;
    const top = await page.locator("#decision-summary-title").isVisible() ? await page.locator('section[aria-labelledby="decision-summary-title"]').first().boundingBox() : null;
    if (top) await page.evaluate((y) => window.scrollTo(0, y - 80), top.y + (await page.evaluate(() => scrollY)));
    r.shot = await shot(page, `break-${device}-${name}`);
    results[name] = r;
    console.log(name, r.ok, r.ms + "ms", "|", r.verdict, "|", JSON.stringify(r.metrics), "| alerts:", JSON.stringify(r.alerts), "| price field:", priceValue, errors.length ? "| ERR " + errors.join(";") : "");
  } catch (e) { results[name] = { error: String(e).slice(0, 300) }; console.log(name, "FAILED", String(e).slice(0, 200)); await shot(page, `break-${device}-${name}-fail`); }
  await ctx.close();
}
save(`break-analyzer-${device}${only ? "-" + only.replace(/,/g, "_") : ""}`, results);
await b.close();
