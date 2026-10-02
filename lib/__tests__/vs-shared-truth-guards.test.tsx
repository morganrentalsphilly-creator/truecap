/**
 * Truth guards for the parts every /vs comparison page shares: the sources
 * note in ComparisonFaq, its one line for agents, and the hub (app/vs/page.tsx).
 *
 * Each block pins a defect the 2026-10 go-to-market audit found live:
 *
 *   - 35 of 38 pages printed "last reviewed June 2026" from one shared
 *     constant, on rows nobody had re-checked. A page now prints a review date
 *     only when it passes `reviewedDate` itself; with none, the note claims no
 *     review.
 *   - 34 of 38 pages never mentioned agents. The shared block now carries one
 *     line for them, linked to /for-agents only where that page renders.
 *   - The hub said "most landlords use TrueCap + one of these together", and
 *     comparison pages repeated softer forms ("Most serious investors use
 *     both", "typically use both", "a common combination"). No data supports
 *     how many people use anything here: the proof registries are empty. The
 *     guard is pinned to the quantified forms, so "may use both" and a "How X
 *     and Y fit together" heading still pass.
 *   - The hub carried unit ranges no vendor publishes, an AirDNA line that read
 *     as an integration, and a metric the analyzer does not show.
 *   - Review of the fix found two lines that implied a competitor lacks what
 *     its own site lists: the complementary group's intro (Bricked lists a
 *     rental offer calculator) and the Rentometer row (its Pro worksheet
 *     works out a maximum offer price).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/vs/example" }));

/** Whether Agent Pro is sold on the deployment under test (the Stripe Price id is absent in unit tests). */
const agentPro = vi.hoisted(() => ({ configured: false }));
vi.mock("@/lib/stripe/plan-prices", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/stripe/plan-prices")>()),
  isAgentProConfigured: () => agentPro.configured,
}));
vi.mock("@/components/marketing/intent-prefetch-link", async (importActual) => ({
  ...(await importActual<typeof import("@/components/marketing/intent-prefetch-link")>()),
  IntentPrefetchLink: ({ href, children }: { href: string; children?: ReactNode }) =>
    createElement("a", { href, "data-intent-prefetch": "" }, children),
}));

import { ComparisonFaq } from "@/components/marketing/comparison-faq";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const tracked = (globs: string[]) =>
  execFileSync("git", ["ls-files", ...globs], { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })
    .split("\n")
    .filter((file) => Boolean(file) && existsSync(join(ROOT, file)));

/** Source as a reader meets it: comments out, entities decoded, JSX line wraps joined. */
const visibleSource = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ")
    .replace(/&apos;|&rsquo;/g, "'")
    .replace(/\s+/g, " ");

const FAQ = "components/marketing/comparison-faq.tsx";
const HUB = "app/vs/page.tsx";
const ITEMS = [{ question: "Q?", answer: "A." }];

/** The sources note as rendered: the <aside> that follows the FAQ rows. */
function sourcesNote(html: string): string {
  const start = html.indexOf("<aside");
  const end = html.indexOf("</aside>", start);
  expect(start, "ComparisonFaq renders its sources note as a Note (<aside>)").toBeGreaterThan(-1);
  return html.slice(start, end).replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
}

describe("the /vs sources note prints a review date only when the page passes one", () => {
  beforeEach(() => {
    agentPro.configured = false;
  });

  it("has no shared default date", () => {
    const source = read(FAQ);
    expect(source).not.toContain("COMPARISON_REVIEWED");
    // The prop is destructured bare: `reviewedDate,` with no `= <default>`.
    expect(source).toMatch(/\n {2}reviewedDate,\n\}: \{/);
    expect(source).not.toMatch(/reviewedDate\s*=\s*[^=>\s{]/);
    expect(visibleSource(source)).not.toMatch(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December) 20\d\d\b/);
  });

  it("claims no review, and prints no date, on a page that passes none", () => {
    const note = sourcesNote(renderToStaticMarkup(<ComparisonFaq competitorName="Acme" items={ITEMS} />));
    expect(note).toContain("Sources & methodology:");
    expect(note).toContain("Rows about Acme are TrueCap's summary and may be out of date.");
    expect(note).toContain("check the vendor's own site for current details");
    expect(note).not.toMatch(/review|checked on|verified on|as of/i);
    expect(note).not.toMatch(/\b20\d\d\b/);
  });

  it("prints the page's own date when it passes one", () => {
    const note = sourcesNote(
      renderToStaticMarkup(<ComparisonFaq competitorName="Acme" reviewedDate="October 2026" items={ITEMS} />),
    );
    expect(note).toContain("Feature and pricing rows reflect Acme's publicly listed information, last reviewed October 2026.");
    expect(note).toContain("verify current details on Acme's own site.");
    expect(note).not.toContain("may be out of date");
  });

  it("keeps the note a Note, never a heading", () => {
    const html = renderToStaticMarkup(<ComparisonFaq competitorName="Acme" items={ITEMS} />);
    expect(html).not.toMatch(/<h[1-6][^>]*>[^<]*Sources/);
    // The label opens the first <aside> on the block: Note's own element.
    expect(html).toMatch(/<aside class="max-w-\[68ch\][^"]*"><div[^>]*><span class="font-semibold text-foreground">Sources &amp; methodology:<\/span>/);
  });
});

describe("the /vs agent line links /for-agents only where that page renders", () => {
  it("renders nothing while Agent Pro is not sold (the persona page redirects, and the link graph forbids linking a redirect)", () => {
    agentPro.configured = false;
    const html = renderToStaticMarkup(<ComparisonFaq competitorName="Acme" items={ITEMS} />);
    expect(html).not.toContain("/for-agents");
    expect(html).not.toContain("investor clients");
  });

  it("renders one sentence with one intent-prefetch link when it is", () => {
    agentPro.configured = true;
    const html = renderToStaticMarkup(<ComparisonFaq competitorName="Acme" items={ITEMS} />);
    expect(html.match(/href="\/for-agents"/g)).toHaveLength(1);
    expect(html).toContain('<a href="/for-agents" data-intent-prefetch="">TrueCap for agents</a>');
    expect(html.replace(/<!-- -->/g, "")).toContain(
      "Screening listings for investor clients? <a href=\"/for-agents\" data-intent-prefetch=\"\">TrueCap for agents</a> keeps a client roster and screens each deal against the Buy Box of the client you assign it to.",
    );
    // The sentence names the client it means: "that client's" had no antecedent
    // when the line before it spoke only of "clients" and "a roster".
    expect(html).not.toContain("that client");
    agentPro.configured = false;
  });
});

/**
 * A statement of how many people use the tools, alone or together. Two shapes:
 * a quantifier in the same sentence as "use both" / "used together" / "a
 * combination", and "most|many <people> use|default to|run ...".
 */
const QUANTIFIED_PAIRING =
  /\b(?:most|many|typically|often|commonly|usually|common)\b[^.?!]{0,80}\b(?:use both|uses both|using both|used together|combination|combined workflow)\b/i;
const QUANTIFIED_USERS =
  /\b(?:most|many)\s+(?:[a-z-]+\s+){0,3}(?:landlords|investors|agents|realtors|hosts|buyers|operators|owners|wholesalers|users)\b[^.?!]{0,60}\b(?:use|uses|using|default to|defaults to|rely on|run)\b/i;

const usageClaim = (source: string): string | null => {
  const text = visibleSource(source);
  return QUANTIFIED_PAIRING.exec(text)?.[0] ?? QUANTIFIED_USERS.exec(text)?.[0] ?? null;
};

describe("no /vs surface states how many people use the tools", () => {
  const surfaces = [...new Set([...tracked(["app/vs/**/*.tsx"]), HUB, FAQ, "components/marketing/vs-page.tsx"])];

  it("reads the hub, the shared frame and every comparison page and card", () => {
    expect(surfaces).toContain(HUB);
    expect(surfaces).toContain(FAQ);
    expect(surfaces.length).toBeGreaterThan(75);
    // The social cards are read too: each is served as its page's og:image.
    expect(surfaces.filter((file) => file.endsWith("/opengraph-image.tsx")).length).toBeGreaterThan(35);
  });

  it("matches the audited forms and lets the plain ones pass", () => {
    for (const claim of [
      "We don't compete — most landlords use TrueCap + one of these together.",
      "Most serious investors use both: PropStream to source, TrueCap to underwrite.",
      "Landlords managing 5-100 units typically use both.",
      "Yes — that's a common combination.",
      "AirDNA estimates STR revenue. TrueCap underwrites the full deal. Often used together.",
      "QuickBooks is general accounting many landlords default to.",
      "Many investors use Rentometer for rent comp and TrueCap for the full deal underwrite.",
    ]) {
      expect(usageClaim(claim), claim).not.toBeNull();
    }
    for (const plain of [
      "STR investors may use both.",
      "Can a realtor use both TrueCap + RentSpree?",
      "Using both is optional, not the default answer.",
      "How TrueCap and Landlord Studio fit together",
      "You can use TrueCap alongside any of them for the rental purchase decision.",
      "Honest take: most landlords should consider a rental-specific tool instead.",
    ]) {
      expect(usageClaim(plain), plain).toBeNull();
    }
  });

  it("finds no quantified usage claim on any /vs surface: no file is exempt", () => {
    const violations = surfaces
      .map((file) => [file, usageClaim(read(file))] as const)
      .filter(([, claim]) => claim !== null)
      .map(([file, claim]) => `${file}: ${claim}`);
    expect(violations).toEqual([]);
  });
});

describe("the /vs hub's one-liners", () => {
  const hub = visibleSource(read(HUB));

  it("says nothing about who uses the tools together", () => {
    expect(hub).not.toMatch(/\buse both\b|\bused together\b/i);
    expect(hub).not.toMatch(/most landlords|many landlords/i);
  });

  it("does not restore the corrected competitor lines", () => {
    // BatchLeads has been a PropStream product since PropStream's 2025-07-07 acquisition.
    expect(hub).not.toMatch(/PropStream alternative/i);
    expect(hub).toContain("a PropStream product since 2025");
    // No vendor publishes these unit ranges (Rentec Direct, Yardi Breeze, Hostaway, Lodgify).
    expect(hub).not.toMatch(/\b\d+-\d+ (?:unit|units|properties|STRs)\b/i);
    // Rentometer's Pro plan includes a Deal Worksheet, and TrueCap's starting rent is a HUD benchmark, not an estimate.
    expect(hub).not.toMatch(/including the rent/i);
    expect(hub).not.toMatch(/gold-standard|enterprise commercial|LoopNet/i);
  });

  it("does not imply a competitor lacks what its own site lists", () => {
    // Bricked is in the complementary group and lists offer calculators for
    // each deal type, a rental one included (bricked.ai, 2026-10-02), so the
    // group's intro cannot say these tools leave the purchase decision to TrueCap.
    expect(hub).not.toMatch(/different stage of the rental lifecycle/i);
    expect(hub).not.toMatch(/covers the purchase decision, so/i);
    // Rentometer's Pro worksheet also works out a maximum offer price
    // (rentometer.com/pricing/individual, 2026-10-02), so the row does not set
    // TrueCap's highest price against it.
    expect(hub).not.toMatch(/Rentometer is[^"]*(?:highest|maximum) (?:offer )?price/i);
    // Privy's own description is deal sourcing and property analysis, wider
    // than the "investor-filtered MLS search" the hub used to call it.
    expect(hub).not.toMatch(/investor-filtered/i);
    // Landlord Studio lists rentals, screens tenants and collects rent online
    // on every plan (landlordstudio.com/pricing, 2026-10-02), so the row does
    // not reduce it to expense tracking and Schedule E.
    expect(hub).not.toMatch(/Landlord Studio tracks expenses/i);
  });

  it("does not describe TrueCap features that do not exist", () => {
    // There is no AirDNA integration: the reader enters AirDNA's numbers.
    expect(hub).not.toMatch(/using AirDNA's projections/i);
    // The analyzer has no "effective rent saved" output; House Hack mode counts the owner's unit at $0 rent.
    expect(hub).not.toMatch(/rent[- ]saved/i);
  });

  it("does not call the library sourced or honest while most pages carry no review date", () => {
    expect(hub).not.toMatch(/\bsourced\b/i);
    expect(hub).not.toMatch(/Honest feature matrices/i);
  });
});
