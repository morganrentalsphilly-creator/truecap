export async function fillDeal(page, d) {
  if (d.address != null) { await page.locator("#address").click(); await page.locator("#address").fill(d.address); await page.keyboard.press("Escape").catch(() => {}); }
  if (d.price != null) { await page.locator("#purchasePrice").fill(String(d.price)); }
  if (d.pastePrice != null) { await page.locator("#purchasePrice").click(); await page.keyboard.insertText(d.pastePrice); }
  if (d.beds != null) await page.locator("#bedrooms").fill(String(d.beds));
  if (d.rent != null) { await page.locator("#monthlyRent").fill(String(d.rent)); }
  if (d.down != null || d.rate != null) {
    if (!(await page.locator("#downPaymentPct").isVisible())) await page.getByRole("button", { name: /down ·/ }).first().click();
    if (d.down != null) await page.locator("#downPaymentPct").fill(String(d.down));
    if (d.rate != null) await page.locator("#interestRate").fill(String(d.rate));
  }
}
export async function runAndRead(page, { timeout = 25000 } = {}) {
  const t0 = Date.now();
  await page.locator('[data-inform-submit="true"]').first().click();
  let ok = true;
  try { await page.locator("#decision-summary-title").waitFor({ state: "visible", timeout }); } catch { ok = false; }
  const ms = Date.now() - t0;
  await page.waitForTimeout(1600);
  const facts = await page.evaluate(() => {
    const txt = (s) => document.querySelector(s)?.innerText?.replace(/\s+/g, " ").trim() ?? null;
    const card = document.querySelector('section[aria-labelledby="decision-summary-title"]');
    const metrics = {};
    for (const el of document.querySelectorAll("[data-decision-metric]")) {
      const nf = el.querySelector("number-flow-react, number-flow");
      metrics[el.getAttribute("data-decision-metric")] = (nf?.getAttribute("aria-label") || el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 60);
    }
    const alerts = [...document.querySelectorAll('[role=alert],[aria-invalid="true"],[data-slot="form-message"],.text-destructive,.text-destructive-text')].filter(e => e.getBoundingClientRect().height > 0).map(e => (e.innerText || e.id || "").replace(/\s+/g, " ").trim().slice(0, 140)).filter(Boolean);
    const slider = document.querySelector('[aria-label="What-if offer price"]');
    return { verdict: txt("#decision-summary-title"), card: card?.innerText?.replace(/\s+/g, " ").slice(0, 700) ?? null, metrics, alerts: [...new Set(alerts)].slice(0, 8), whatIf: slider ? { min: slider.getAttribute("aria-valuemin"), now: slider.getAttribute("aria-valuenow"), max: slider.getAttribute("aria-valuemax"), text: slider.getAttribute("aria-valuetext") } : null, url: location.href, scrollWidth: document.documentElement.scrollWidth, innerWidth };
  });
  return { ok, ms, ...facts };
}
