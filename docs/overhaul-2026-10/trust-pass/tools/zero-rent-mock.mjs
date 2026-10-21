// Trust pass, A6: a typed $0 rent survives the address lookup. The audit's
// zero-rent.mjs uses a Philadelphia address, which a local server without
// lookup keys never enriches; this runs against a server started with the
// loopback enrichment mock (e2e/support/enrichment-mock-server.ts on 3199),
// whose Ohio addresses return a HUD rent, so the fill really races the 0.
//   AUDIT_HUD_API_KEY=audit-hud-key AUDIT_FRED_API_KEY=audit-fred-key \
//   FRED_API_BASE_URL=http://127.0.0.1:3199 HUD_API_BASE_URL=http://127.0.0.1:3199 \
//   bash scripts/dev-isolated.sh start
//   node docs/overhaul-2026-10/trust-pass/tools/zero-rent-mock.mjs
import { chromium } from "playwright";
import fs from "node:fs";
import { startEnrichmentMockServer } from "../../../../e2e/support/enrichment-mock-server.ts";

const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const mock = await startEnrichmentMockServer(3199);
mock.setFredMode("ok");
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem("truecap_cookie_consent_v1", "denied"); } catch {} });
const p = await ctx.newPage();
await p.goto(BASE + "/analyze", { waitUntil: "domcontentloaded" });
await p.waitForSelector('[data-calc-form="true"][data-calculator-ready="true"]');
const rent = p.locator("#monthlyRent");
await p.locator("#purchasePrice").fill("250000");
await p.locator("#bedrooms").fill("3");
await rent.fill("0");
const address = p.getByLabel("Property Address", { exact: true });
await address.fill("110 Autofill Zero Ave, Columbus, OH 43215");
await address.press("Tab");
await p.waitForTimeout(3000);
const after3s = await rent.inputValue();
const lookupReached = mock.requests().some((r) => r.path.includes("/fmr"));
await p.locator('[data-inform-submit="true"]').first().click();
await p.waitForTimeout(2500);
const afterRun = await rent.inputValue().catch(() => "n/a");
const out = { typed: "0", after3s, afterRun, lookupReached, hudRequests: mock.requests().filter((r) => !r.path.includes("fred")).length };
fs.writeFileSync("docs/overhaul-2026-10/trust-pass/instruments/zero-rent-mock.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
await b.close();
await mock.close();
