/**
 * Truth guards for the parts every /vs comparison page shares: the sources
 * note in ComparisonFaq and its one line for agents.
 *
 * Each block pins a defect the 2026-10 go-to-market audit found live:
 *
 *   - 35 of 38 pages printed "last reviewed June 2026" from one shared
 *     constant, on rows nobody had re-checked. A page now prints a review date
 *     only when it passes `reviewedDate` itself; with none, the note claims no
 *     review.
 *   - 34 of 38 pages never mentioned agents. The shared block now carries one
 *     line for them, linked to /for-agents only where that page renders.
 */
import { readFileSync } from "node:fs";
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

/** Source as a reader meets it: comments out, entities decoded, JSX line wraps joined. */
const visibleSource = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ")
    .replace(/&apos;|&rsquo;/g, "'")
    .replace(/\s+/g, " ");

const FAQ = "components/marketing/comparison-faq.tsx";
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
      "Screening listings for investor clients? <a href=\"/for-agents\" data-intent-prefetch=\"\">TrueCap for agents</a> keeps a client roster and screens a deal against that client&#x27;s Buy Box.",
    );
    agentPro.configured = false;
  });
});
