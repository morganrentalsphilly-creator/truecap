import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { AGENT_FAQS } from "@/lib/agent-faqs";
import { CLIENT_RECEIVES } from "@/lib/client-receives";

/**
 * The agent pitch may only describe what the share page and the PDF render
 * (2026-10 go-to-market audit, rows P0-01, P0-13, P1-04, P1-09, P1-12).
 *
 * The share page (components/investcalc/read-only-analysis-view.tsx) shows
 * four metrics and three drivers, and, when the share captured targets, the
 * decision and the Offer Ceiling with those targets. It does not show where
 * an input came from or list tax, insurance or down payment, the rerun hands the
 * analyzer values without their source labels, and the PDF's per-input source
 * table is off (lib/report-data-builder.ts). Until that changes, no sentence
 * here may promise the client source labels. A statement about a competitor
 * is checked against the vendor's own page before it is written.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** Source text without comments, with whitespace collapsed, so a sentence
 *  that wraps across JSX lines still matches as one string. */
const copy = (path: string) =>
  read(path)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ");

const AGENT_PITCH_FILES = [
  "app/for-agents/page.tsx",
  "app/pricing/page.tsx",
  "app/sample-decision-memo/page.tsx",
  "components/marketing/landing-sections.tsx",
] as const;

const DEALCHECK_SENTENCE =
  "Every DealCheck plan exports a PDF report; putting your own name and logo on it needs DealCheck Pro.";

describe("what the agent pitch says the client receives", () => {
  const data = [
    ...AGENT_FAQS.map((faq) => `${faq.q} ${faq.a}`),
    ...CLIENT_RECEIVES.map((item) => `${item.title} ${item.body}`),
  ].join("\n");

  it("does not promise the client source labels the share page does not render", () => {
    const promises =
      /sees the sources|every number labeled|benchmark or entered|every assumption (?:is )?labeled|every source is labeled|every assumption visible|assumptions with their sources|labeled assumptions|assumptions and the risks intact/i;
    expect(data).not.toMatch(promises);
    for (const file of AGENT_PITCH_FILES) {
      expect(copy(file), file).not.toMatch(promises);
    }
  });

  it("says what the share page shows, and that the rerun carries no source labels", () => {
    const numbers = CLIENT_RECEIVES.find((item) => item.key === "numbers");
    expect(numbers?.body).toContain("the Offer Ceiling with those targets");
    expect(numbers?.body).toContain("The PDF lists the inputs");
    const rerun = CLIENT_RECEIVES.find((item) => item.key === "rerun");
    expect(rerun?.body).toContain("without source labels");
    // With the address hidden (the Share dialog's default) the rerun drops
    // the address and the analyzer asks for one.
    expect(rerun?.body).toContain("when the address is hidden, they enter the property address");
  });

  it("promises the decision and the Offer Ceiling only for a share that captured targets", () => {
    // A share with no adopted target reads "Preliminary underwriting" and
    // Offer Ceiling "Unavailable" (read-only-analysis-view.tsx), so the list
    // may name the two only behind the condition.
    const view = copy("components/investcalc/read-only-analysis-view.tsx");
    expect(view).toContain('"Preliminary underwriting"');
    expect(view).toContain("did not capture an adopted target");
    const numbers = CLIENT_RECEIVES.find((item) => item.key === "numbers");
    // The title sits outside the condition, so it may not list the decision
    // as something every share shows.
    expect(numbers?.title).not.toMatch(/^the decision\b/i);
    const body = numbers?.body ?? "";
    const condition = body.indexOf("When the deal was screened against a Buy Box or targets you chose");
    expect(condition).toBeGreaterThan(-1);
    expect(body.indexOf("meets the targets at asking")).toBeGreaterThan(condition);
    expect(body.indexOf("the Offer Ceiling with those targets")).toBeGreaterThan(condition);
    expect(body.slice(0, condition)).not.toMatch(/Offer Ceiling|meets the targets/);
  });

  it("states the share link's 180-day expiry wherever it says the link expires", () => {
    expect(data).not.toMatch(/it expires,/i);
    expect(data).not.toMatch(/\bexpiring\b/i);
    expect(data.match(/expires after 180 days/g)).toHaveLength(2);
    // The period is the table default; a change there must reach this copy.
    expect(read("supabase/migrations/20260817150658_public_shares.sql")).toContain(
      "expires_at timestamptz default (now() + interval '180 days')",
    );
  });

  it("captions the memo capture as the sample page, not as what the client receives", () => {
    // public/product/manifest.json records the memo shot's source as the
    // /sample-decision-memo page: it is not a capture of a share page or PDF.
    const manifest = JSON.parse(read("public/product/manifest.json")) as {
      shots: { shot: string; source: string }[];
    };
    for (const shot of manifest.shots.filter((entry) => entry.shot === "memo")) {
      expect(shot.source).toMatch(/\/sample-decision-memo$/);
    }
    for (const file of [
      "app/for-agents/page.tsx",
      "app/pricing/page.tsx",
      "components/marketing/landing-sections.tsx",
    ]) {
      const text = copy(file);
      expect(text, file).not.toContain("What your client receives: the decision memo");
      expect(text, file).not.toContain("The memo you hand a client");
      expect(text, file).not.toContain("The decision memo, generated from the free sample deal");
      // The homepage block no longer mounts the memo capture (next test);
      // wherever the capture is mounted it is captioned as the sample page.
      if (text.includes("MEMO_SHOT")) {
        expect(text, file).toContain("sample decision memo page");
      }
    }
    for (const file of ["app/for-agents/page.tsx", "app/pricing/page.tsx"]) {
      expect(copy(file), file).toContain("MEMO_SHOT");
    }
    expect(copy("app/sample-decision-memo/page.tsx")).not.toMatch(
      /exactly what a real deal\s+produces/,
    );
  });

  it("pictures the real, unbranded PDF cover of the sample deal under 'What your client receives'", () => {
    // Row P1-47, founder answer 5 (2026-10-03): the picture is page 1 of the
    // real PDF. Both pages mount the one component inside the block.
    const home = copy("components/marketing/landing-sections.tsx");
    const homeBlock = home.slice(home.indexOf("export function ClientReceivesSection"));
    expect(homeBlock.slice(0, homeBlock.indexOf("</Section>"))).toContain("<ClientPdfCover");
    expect(home).not.toContain("MEMO_SHOT");
    const agents = copy("app/for-agents/page.tsx");
    const agentsBlock = agents.slice(agents.indexOf('<Section id="what-your-client-receives"'));
    expect(agentsBlock.slice(0, agentsBlock.indexOf("</Section>"))).toContain("<ClientPdfCover");

    // The image is produced from the sample deal by the PDF generator, with
    // no branding, and the file the component points at exists.
    const script = read("scripts/render-pdf-cover-shot.ts");
    expect(script).toContain("values: SAMPLE_DEAL_VALUES");
    expect(script).toContain("buildCanonicalReportData");
    expect(script).toContain('generateInvestmentPDFBlob(report, null, "personal")');
    expect(script).toContain("public/product/pdf-cover.webp");
    const cover = copy("components/marketing/client-pdf-cover.tsx");
    expect(cover).toContain('src: "/product/pdf-cover.webp"');
    expect(readFileSync(join(process.cwd(), "public/product/pdf-cover.webp")).length).toBeGreaterThan(10_000);

    // The caption says what the picture is, and does not pass an unbranded
    // sample cover off as an agent's co-branded report.
    expect(cover).toContain("rendered from the sample deal with no branding set");
    expect(cover).not.toMatch(/co-branded (?:report|cover|PDF)|your client's report|a real deal/i);
  });
});

describe("what the money pages say about DealCheck's PDF reports", () => {
  it("uses the one checked sentence and never says branding is on every plan", () => {
    for (const file of [
      "app/for-agents/page.tsx",
      "app/pricing/page.tsx",
      "components/marketing/landing-sections.tsx",
    ]) {
      const text = copy(file);
      expect(text, file).toContain(DEALCHECK_SENTENCE);
      expect(text, file).not.toMatch(/branded PDF[^.]*\b(?:free|any plan|every plan|its plans)\b/i);
    }
  });
});

describe("TrueCap's own product on the money and persona pages", () => {
  it("does not send investors to a BRRRR calculator that is not offered", () => {
    expect(copy("app/for-investors/page.tsx")).not.toMatch(/the BRRRR calculator/i);
  });

  it("does not claim that every formula is published", () => {
    for (const file of [
      "app/about/page.tsx",
      "app/reviews/page.tsx",
      "app/for-agents/page.tsx",
      "components/marketing/landing-sections.tsx",
      "components/marketing/marketing-nav.tsx",
    ]) {
      expect(copy(file), file).not.toMatch(/every formula/i);
    }
  });

  it("names controls and places as the product does", () => {
    const sections = copy("components/marketing/landing-sections.tsx");
    expect(sections).not.toContain("Improve accuracy");
    expect(read("components/investcalc/assumptions-strip.tsx")).toContain("Review assumptions");
    for (const file of ["app/for-agents/page.tsx", "components/marketing/landing-sections.tsx"]) {
      expect(copy(file), file).not.toMatch(/set up once in your profile/i);
      expect(copy(file), file).toContain("up once in Settings");
    }
    const houseHack = copy("app/for-house-hackers/page.tsx");
    expect(houseHack).not.toContain("propertyType");
    expect(houseHack).toContain("Owner Occupant property type");
    for (const file of ["app/for-house-hackers/page.tsx", "app/for-buy-and-hold/page.tsx"]) {
      expect(copy(file), file).not.toContain("Hit Calculate");
    }
  });

  it("states the Buy Box cap as the action that enforces it does", () => {
    // The cap is a private constant in a "use server" file, so the copy
    // cannot import it: a change there must fail here and reach the copy.
    expect(read("app/actions/user-buy-boxes.ts")).toContain("const MAX_BUY_BOXES = 12");
    expect(copy("app/pricing/page.tsx")).toContain(
      "assign Buy Boxes to clients (up to 12 per account)",
    );
    expect(copy("components/marketing/landing-sections.tsx")).toContain(
      "Buy Boxes you assign to clients (up to 12 per account)",
    );
  });

  it("does not promise one-click cancellation", () => {
    expect(copy("app/pricing/page.tsx")).not.toMatch(/in one click/i);
    expect(AGENT_FAQS.map((faq) => faq.a).join("\n")).not.toMatch(/in one click/i);
  });
});
