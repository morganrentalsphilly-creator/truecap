/**
 * The emails use the site's colours (go-to-market audit, row P2-132).
 *
 * The four app templates and the five Supabase auth templates carried the
 * purple (#5248D4) and slate greys from before the 2026 design pass. They now
 * use the Newsprint values DESIGN.md documents. This guard keeps a stray
 * colour from coming back: it renders each app template with made-up data and
 * reads the auth templates as files, and every colour it finds has to be one
 * of the documented ones.
 *
 * It sends nothing and makes no network call: render() only builds a string.
 * Set EMAIL_PALETTE_OUT to a folder to also write the rendered HTML there.
 *
 * emails/weekly-digest.tsx is not covered on purpose: it belongs to the
 * retired newsletter and was left as it is.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import LifecycleEmail from "@/emails/lifecycle-email";
import RateAlertEmail from "@/emails/rate-alert";
import RentAlertEmail from "@/emails/rent-alert";
import WeeklySummaryEmail from "@/emails/weekly-summary";
import type { RateAlertDeal } from "@/lib/rate-alerts";
import type { RentAlertDeal } from "@/lib/rent-alerts";
import type { WeeklySummaryPayload } from "@/lib/weekly-summary";

const ROOT = join(__dirname, "..", "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

/** DESIGN.md, "Decided: Newsprint" and "Color", as the hex an email needs. */
const SITE = {
  paper: "#efece8",
  raised: "#f6f5f2",
  band: "#e9e6e0",
  ruleSoft: "#d8d5d0",
  ink: "#1b1b1b",
  ink2: "#51504c",
  signalBlue: "#0066ba",
  onSignalBlue: "#fcfcfc",
  positive: "#006d32",
  negative: "#b9003d",
} as const;
const ALLOWED = new Set<string>(Object.values(SITE));

const SITE_URL = "https://usetruecap.com";

const rateDeal = {
  id: "deal-1",
  label: "Sample property",
  savedRatePct: 7.1,
  currentRatePct: 6.6,
  before: { monthlyCashFlow: -40, dscr: 0.98, dscrBand: "below", tier: "weak" },
  after: { monthlyCashFlow: 85, dscr: 1.06, dscrBand: "thin", tier: "fair" },
  changes: ["Cash flow turned positive"],
  improved: true,
} as unknown as RateAlertDeal;

const rentDeals = [
  {
    id: "deal-1",
    label: "Sample property",
    savedRentMonthly: 1800,
    currentMarketRentMonthly: 1900,
    before: { monthlyCashFlow: 40, dscr: 1.04, dscrBand: "thin", tier: "fair" },
    after: { monthlyCashFlow: 130, dscr: 1.12, dscrBand: "thin", tier: "fair" },
    changes: ["Cash flow up $90/mo"],
    improved: true,
  },
  {
    id: "deal-2",
    label: "Second sample property",
    savedRentMonthly: 2100,
    currentMarketRentMonthly: 1950,
    before: { monthlyCashFlow: 60, dscr: 1.05, dscrBand: "thin", tier: "fair" },
    after: { monthlyCashFlow: -75, dscr: 0.95, dscrBand: "below", tier: "weak" },
    changes: ["Cash flow turned negative"],
    improved: false,
  },
] as unknown as RentAlertDeal[];

const weeklyPayload: WeeklySummaryPayload = {
  pipeline: { count: 3, monthlyCashFlow: 410 },
  owned: { count: 2, monthlyCashFlow: 620, totalEquity: 98000, equityGain: -1200, datedCount: 1 },
  rateMover: {
    currentRatePct: 6.6,
    previousRatePct: 6.5,
    weeklyMovePp: 0.1,
    monitoredCount: 3,
    changedCount: 1,
    topDeal: { ...rateDeal, improved: false },
  },
  dueItems: [
    { dealId: "deal-1", dealLabel: "Sample property", itemLabel: "Inspection", dueDate: "2026-10-01", status: "overdue" },
    { dealId: "deal-2", dealLabel: "Second sample property", itemLabel: "Appraisal", dueDate: "2026-10-09", status: "due-soon" },
  ],
  buyBox: { passingCount: 1, evaluatedCount: 3, boxCount: 2 },
  methodologyNotes: ["One saved deal uses an earlier model version."],
};

const APP_TEMPLATES: Array<[string, () => Promise<string>]> = [
  [
    "lifecycle-email",
    () =>
      render(
        <LifecycleEmail
          preheader="Preheader"
          headline="Headline"
          body={["First paragraph.", "Second paragraph."]}
          ctaText="Open the analyzer"
          ctaUrl={`${SITE_URL}/analyze`}
          signatureNote="A note under the button."
          siteUrl={SITE_URL}
          manageUrl={`${SITE_URL}/settings`}
          unsubscribeUrl={`${SITE_URL}/email/unsubscribe?token=sample`}
          postalAddress={null}
        />,
      ),
  ],
  [
    "rate-alert",
    () =>
      render(
        <RateAlertEmail
          currentRatePct={6.6}
          previousRatePct={7.1}
          deals={[rateDeal, { ...rateDeal, id: "deal-2", improved: false }]}
          siteUrl={SITE_URL}
        />,
      ),
  ],
  ["rent-alert", () => render(<RentAlertEmail deals={rentDeals} siteUrl={SITE_URL} />)],
  ["weekly-summary", () => render(<WeeklySummaryEmail payload={weeklyPayload} siteUrl={SITE_URL} />)],
];

const AUTH_DIR = "email-templates/supabase";
const AUTH_TEMPLATES = readdirSync(join(ROOT, AUTH_DIR)).filter((file) => file.endsWith(".html")).sort();

/** Every colour written in a style: hex of any length, rgb(), hsl(), oklch(). */
function coloursIn(html: string): string[] {
  const styles = [...html.matchAll(/style="([^"]*)"/g)].map((match) => match[1]!);
  return styles.flatMap((style) =>
    [...style.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch)\([^)]*\)/g)].map((match) => match[0]),
  );
}

function save(name: string, html: string) {
  const out = process.env.EMAIL_PALETTE_OUT;
  if (!out) return;
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, `${name}.html`), html);
}

describe("app email templates render in the site's colours", () => {
  it.each(APP_TEMPLATES)("%s", async (name, build) => {
    const html = await build();
    save(name, html);
    const colours = coloursIn(html);
    expect(colours.length).toBeGreaterThan(5);
    expect([...new Set(colours.filter((colour) => !ALLOWED.has(colour)))]).toEqual([]);
    // The page is paper, the card is raised paper, the action is Signal Blue.
    expect(html).toContain(`background-color:${SITE.paper}`);
    expect(html).toContain(`background-color:${SITE.raised}`);
    expect(html).toContain(`background-color:${SITE.signalBlue}`);
  });

  it("the sign of a number is the only thing that earns green or red", async () => {
    const lifecycle = await APP_TEMPLATES[0]![1]();
    expect(lifecycle).not.toContain(SITE.positive);
    expect(lifecycle).not.toContain(SITE.negative);
    const rent = await APP_TEMPLATES[2]![1]();
    expect(rent).toContain(SITE.positive);
    expect(rent).toContain(SITE.negative);
  });
});

describe("Supabase auth templates use the site's colours", () => {
  it("finds the five templates", () => {
    expect(AUTH_TEMPLATES).toEqual([
      "change-email.html",
      "confirm-signup.html",
      "invite-user.html",
      "magic-link.html",
      "reset-password.html",
    ]);
  });

  it.each(AUTH_TEMPLATES)("%s", (file) => {
    const html = read(`${AUTH_DIR}/${file}`);
    const colours = coloursIn(html);
    expect(colours.length).toBeGreaterThan(5);
    expect([...new Set(colours.filter((colour) => !ALLOWED.has(colour)))]).toEqual([]);
    expect(html).toContain(`background-color:${SITE.paper}`);
    expect(html).toContain(`background-color:${SITE.raised}`);
    expect(html).toContain(`background-color:${SITE.signalBlue}`);
    // No shadow at rest (DESIGN.md).
    expect(html).not.toContain("box-shadow");
    // The wording the audit removed stays out.
    expect(html).not.toMatch(/institutional/i);
  });
});

describe("the email colours keep their contrast", () => {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  };
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
    return (hi + 0.05) / (lo + 0.05);
  };

  it.each([
    ["ink on the card", SITE.ink, SITE.raised],
    ["Ink 2 on the card", SITE.ink2, SITE.raised],
    ["Ink 2 on paper (the footer)", SITE.ink2, SITE.paper],
    ["Ink 2 on the band (the code label)", SITE.ink2, SITE.band],
    ["ink on the band (the code)", SITE.ink, SITE.band],
    ["Signal Blue link on the card", SITE.signalBlue, SITE.raised],
    ["button label on Signal Blue", SITE.onSignalBlue, SITE.signalBlue],
    ["positive on the card", SITE.positive, SITE.raised],
    ["negative on the card", SITE.negative, SITE.raised],
  ])("%s is at least 4.5:1", (_label, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
