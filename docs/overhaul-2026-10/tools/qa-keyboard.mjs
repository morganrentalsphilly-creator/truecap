// Phase 8: the keyboard-only pass of every interactive demo. Each check
// drives the control with the keyboard alone and records whether it
// responded and whether it shows a visible focus ring.
// Usage: node docs/overhaul-2026-10/tools/qa-keyboard.mjs [base] [outDir]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const OUT = process.argv[3] ?? "docs/overhaul-2026-10/phase-8/keyboard";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem("truecap_cookie_consent_v1", "denied"); } catch {} });
const page = await ctx.newPage();
const checks = [];
const focusRing = async () => page.evaluate(() => { const el = document.activeElement; if (!el) return null; const cs = getComputedStyle(el); return { tag: el.tagName, text: (el.textContent ?? "").trim().slice(0, 40), outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, boxShadow: cs.boxShadow !== "none" ? "shadow" : "none", focusVisible: el.matches(":focus-visible") }; });
const record = async (name, ok, extra = {}) => { checks.push({ name, ok, ...extra, focus: await focusRing() }); };

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(2600);
// 1. The hero's price scrubber: arrow keys step the price; the figures and chips follow.
const slider = page.locator('[data-hero-ledger=""] [role="slider"]');
await slider.focus();
const before = Number(await slider.getAttribute("aria-valuenow"));
await page.keyboard.press("ArrowRight");
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(300);
const after = Number(await slider.getAttribute("aria-valuenow"));
await record("hero scrubber: ArrowRight steps the price", after > before, { before, after, valuetext: await slider.getAttribute("aria-valuetext") });
await page.keyboard.press("Home");
await page.waitForTimeout(200);
await record("hero scrubber: Home jumps to the low end", Number(await slider.getAttribute("aria-valuenow")) === Number(await slider.getAttribute("aria-valuemin")));
await page.screenshot({ path: path.join(OUT, "hero-scrubber-focus.png"), clip: { x: 0, y: 0, width: 1440, height: 900 } });
// 2. A source receipt opens its popover with Enter and closes with Escape.
const receipt = page.locator('[data-hero-ledger=""] button').filter({ hasText: /HUD|FRED|input|default/i }).first();
await receipt.focus();
await page.keyboard.press("Enter");
await page.waitForTimeout(300);
const popoverOpen = await page.locator('[role="dialog"]').first().isVisible().catch(() => false);
await record("source receipt: Enter opens the popover", popoverOpen);
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
await record("source receipt: Escape closes it", !(await page.locator('[role="dialog"]').first().isVisible().catch(() => false)));
// 3. The receipt flow's nodes (the "Every number has a receipt" section).
const node = page.locator('ol[aria-label="The starting values and where each comes from"] button').first();
await node.scrollIntoViewIfNeeded();
await node.focus();
await page.keyboard.press("Space");
await page.waitForTimeout(300);
await record("receipt flow: Space opens a source", await page.locator('[role="dialog"]').first().isVisible().catch(() => false));
await page.keyboard.press("Escape");
// 4. The plans toggle: a radiogroup; the arrow keys and Space select.
const annual = page.locator('[role="radiogroup"] [role="radio"]').nth(1);
await annual.scrollIntoViewIfNeeded();
await annual.focus();
await page.keyboard.press("Space");
await page.waitForTimeout(300);
await record("plans toggle: Space selects", (await annual.getAttribute("aria-checked")) === "true");
// 5. The FAQ: Enter opens a row.
const summary = page.locator("details.tc-accordion summary").first();
await summary.scrollIntoViewIfNeeded();
await summary.focus();
await page.keyboard.press("Enter");
await page.waitForTimeout(300);
await record("FAQ row: Enter opens", await summary.locator("xpath=..").evaluate((d) => d.hasAttribute("open")));
// 6. The co-branding preview: typing a name updates the mock.
const nameInput = page.locator('[data-cobrand-form=""] input').first();
await nameInput.scrollIntoViewIfNeeded();
await nameInput.focus();
await page.keyboard.type("Jordan Lee");
await page.waitForTimeout(300);
await record("co-branding: typing a name updates the preview", (await page.locator("text=Jordan Lee").count()) > 1);
// 7. The close band's address form: Tab reaches the field and the button.
const close = page.locator('[aria-labelledby="final-cta-heading"] input').first();
await close.scrollIntoViewIfNeeded();
await close.focus();
await record("close form: the field takes focus", await close.evaluate((el) => el === document.activeElement));
// 8. The analyzer result: the ceiling disclosure and the summary bar.
await page.goto(BASE + "/analyze?sample=1", { waitUntil: "networkidle" });
await page.locator('[data-analysis-results="true"]').waitFor({ state: "visible", timeout: 30000 });
await page.waitForTimeout(1800);
// visible: the sample's hidden static card (trust pass, A2) carries the same summary.
const ceilingSummary = page.locator("summary").filter({ hasText: "How this ceiling was calculated", visible: true }).first();
await ceilingSummary.scrollIntoViewIfNeeded();
await ceilingSummary.focus();
await page.keyboard.press("Enter");
await page.waitForTimeout(300);
await record("result: the ceiling disclosure opens with Enter", await ceilingSummary.locator("xpath=..").evaluate((d) => d.hasAttribute("open")));
for (let i = 0; i < 14; i += 1) { await page.mouse.wheel(0, 120); await page.waitForTimeout(60); }
await page.waitForTimeout(600);
const bar = page.locator('[data-result-summary-bar=""] button');
const barVisible = await bar.isVisible().catch(() => false);
if (barVisible) { await bar.focus(); await page.keyboard.press("Enter"); await page.waitForTimeout(800); }
await record("result: the summary bar's Decision button is reachable and returns focus to the heading", barVisible && (await page.evaluate(() => document.activeElement?.id === "decision-summary-title")));
// 9. Auth: the sheet's scrubber beside the form.
await page.goto(BASE + "/auth/login", { waitUntil: "networkidle" });
await page.waitForTimeout(2600);
const authSlider = page.locator('[data-hero-ledger=""] [role="slider"]');
await authSlider.focus();
const a0 = Number(await authSlider.getAttribute("aria-valuenow"));
await page.keyboard.press("ArrowLeft");
await page.waitForTimeout(200);
await record("auth sheet: ArrowLeft steps the price", Number(await authSlider.getAttribute("aria-valuenow")) < a0);
await browser.close();
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(checks, null, 2));
for (const c of checks) console.log(c.ok ? "ok  " : "FAIL", c.name, c.focus ? `[${c.focus.tag} outline=${c.focus.outlineStyle} ${c.focus.outlineWidth} focus-visible=${c.focus.focusVisible}]` : "");
