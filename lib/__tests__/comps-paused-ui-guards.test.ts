import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * What users see when the shared RentCast pool is empty (2026-10-19). It must
 * not look broken: CAP_REACHED is an inline paused state with the day it is
 * back, never a destructive toast, and the copy never says error, failed,
 * quota, API or "RentCast limit".
 */

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
const flat = (s: string) => s.replace(/\s+/g, " ");
const section = (source: string, start: string, end: string) => {
  const a = source.indexOf(start);
  expect(a, start).toBeGreaterThan(-1);
  const b = source.indexOf(end, a + start.length);
  expect(b, end).toBeGreaterThan(a);
  return source.slice(a, b);
};

const BANNED = /\berror\b|\bfailed\b|\bquota\b|\bAPI\b|RentCast limit/i;

describe("CAP_REACHED never shows a destructive toast", () => {
  it("the Autofill handler turns CAP_REACHED into the inline paused state and returns", () => {
    const page = read("components/investcalc/investcalc-page.tsx");
    const handler = flat(section(page, "const handleAutofillFromAddress = useCallback(", "// Paste a Zillow/Redfin/Realtor link"));
    expect(handler).toContain(
      'if (r.code === "CAP_REACHED") { // The pool emptied between mount and click.',
    );
    const branch = section(handler, 'if (r.code === "CAP_REACHED") {', "return; }");
    expect(branch).toContain("setCompsAvailability({ available: false, resumesOn: r.resumesOn })");
    expect(branch).not.toContain("toast(");
    // The remaining destructive toast is for NOT_FOUND / unexpected codes only.
    expect(handler).not.toMatch(/CAP_REACHED[^;]{0,200}variant: "destructive"/);
    expect(handler).not.toContain('"Monthly limit reached"');
  });

  it("the comps card turns CAP_REACHED into the inline paused state and returns", () => {
    const card = read("components/investcalc/property-comps-card.tsx");
    const branch = section(card, 'if (r.code === "CAP_REACHED") {', "return;\n          }");
    expect(branch).toContain("setPausedUntil(r.resumesOn);");
    expect(branch).not.toContain("toast(");
    expect(flat(card)).not.toMatch(/CAP_REACHED[^;]{0,300}variant: "destructive"/);
    expect(card).not.toContain('"Monthly comps limit reached"');
  });

  it("the listing paste records the pause at the panel instead of toasting", () => {
    const page = flat(read("components/investcalc/investcalc-page.tsx"));
    expect(page).toContain(
      'else if (!r.ok && r.code === "CAP_REACHED") { // The pool is paused (nothing was sent).',
    );
    expect(page).toContain("setListingLookupPaused({ token: detail.token, resumesOn: r.resumesOn })");
  });
});

describe("the paused state shows before the click", () => {
  it("the page and the card each read availability once on mount for signed-in users", () => {
    const page = read("components/investcalc/investcalc-page.tsx");
    expect(page.match(/getCompsAvailabilityAction\(\)/g)).toHaveLength(1);
    expect(flat(page)).toContain("useEffect(() => { if (!isAuthenticated) return; let active = true; void (async () => { try { const r = await getCompsAvailabilityAction();");
    const card = read("components/investcalc/property-comps-card.tsx");
    expect(card.match(/getCompsAvailabilityAction\(\)/g)).toHaveLength(1);
  });

  it("the Autofill button stays visible, disabled, with the one-line note", () => {
    const section_ = flat(read("components/investcalc/property-details-section.tsx"));
    expect(section_).toContain("disabled={isAutofilling || autofillPausedUntil != null}");
    expect(section_).toContain('data-autofill-paused=""');
    expect(section_).toContain("`Autofill is back ${autofillPausedUntil}.`");
    expect(section_).toContain('"Autofill is paused for now."');
  });

  it("the comps card shows a cached or saved set as 'Comps from {date}', else a quiet line in place of the button", () => {
    const card = flat(read("components/investcalc/property-comps-card.tsx"));
    expect(card).toContain('data-comps-from=""');
    expect(card).toContain("Comps from {compsDate}");
    expect(card).toContain('data-comps-paused=""');
    expect(card).toContain("`Live comps are paused until ${pausedUntil}.`");
    expect(card).toContain("Your analysis still runs. Enter beds, baths and price yourself.");
    expect(card).not.toContain("mailto:");
  });

  it("the listing panel has a paused note alongside the refusal note", () => {
    const input = flat(read("components/investcalc/listing-link-input.tsx"));
    expect(input).toContain('data-listing-lookup-paused=""');
    expect(input).toContain('data-listing-lookup-refused=""');
    expect(input).toContain("`Live comps are paused until ${priceLookupPausedUntil}, so the asking price and property facts were not filled from the link.`");
    expect(input).toContain("Type them in. Your analysis still runs.");
  });
});

describe("the paused copy", () => {
  it("never says error, failed, quota, API or RentCast limit", () => {
    const action = read("app/actions/property-comps.ts");
    for (const name of ["PAUSED_BODY", "PER_USER_PAUSED_BODY", "FREEBIE_USED_MESSAGE"]) {
      const m = action.match(new RegExp(`const ${name} =\\s*"([^"]+)"`));
      expect(m, name).not.toBeNull();
      expect(m![1], name).not.toMatch(BANNED);
    }
    expect(action).toContain(
      'const PAUSED_BODY =\n  "Your analysis still runs. Enter beds, baths and price yourself, or use comps already pulled for this address."',
    );
    const paused = [
      ...read("components/investcalc/property-details-section.tsx").matchAll(/Autofill is [^`"]+/g),
      ...read("components/investcalc/property-comps-card.tsx").matchAll(/Live comps are [^`"]+/g),
      ...read("components/investcalc/listing-link-input.tsx").matchAll(/Live comps are [^`"]+/g),
    ].map((m) => m[0]);
    expect(paused.length).toBeGreaterThan(3);
    for (const line of paused) expect(line).not.toMatch(BANNED);
  });

  it("nobody is routed to /pricing while the pool is paused", () => {
    const page = flat(read("components/investcalc/investcalc-page.tsx"));
    expect(page).toContain("action: compsPaused ? undefined : ( <ToastAction altText=\"See Pro plans with comps lookups included\"");
    const card = flat(read("components/investcalc/property-comps-card.tsx"));
    expect(card).toContain("action: paused ? undefined : ( <ToastAction altText=\"See Pro plans with comps lookups included\"");
    const input = flat(read("components/investcalc/listing-link-input.tsx"));
    // The refusal note (with its plans link) yields to the paused note.
    expect(input).toContain("{priceLookupRefused && priceLookupPausedUntil == null ? (");
  });
});

describe("the auto-pull on save", () => {
  it("passes autoPull and is skipped while the pool is known to be paused", () => {
    const page = flat(read("components/investcalc/investcalc-page.tsx"));
    expect(page).toContain("if (canUseProjections && parsedValues.success && result.id && !compsPaused) { void getPropertyCompsAction({");
    expect(page).toContain("dealId: result.id, autoPull: true, })");
  });
});
