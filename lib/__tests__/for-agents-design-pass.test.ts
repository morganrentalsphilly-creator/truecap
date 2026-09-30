import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { VerifiedAgentProof } from "@/lib/proof-records";

// The agent-proof registry is empty in the repo. Swap in a mutable copy so the
// gate can be exercised with records that do and do not pass it; the real
// isPublicationReady() still decides.
const agentProof = vi.hoisted(() => [] as unknown[]);
vi.mock("@/lib/proof-records", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/proof-records")>()),
  VERIFIED_AGENT_PROOF: agentProof,
}));

import { AgentProofSection } from "@/components/marketing/testimonial-card";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

/**
 * /for-agents on the design system (DESIGN.md, 2026-09 design pass). The
 * baseline page rendered two Disclaimers (a page-level card beside the memo
 * and SiteFooter's), showed the memo in a fake browser frame, hand-rolled its
 * sections, and set its labels as uppercase tracked micro-text with arrows
 * after link text. The design-pass assertions below fail on that baseline.
 * The ones marked "kept" held on the baseline too and guard behaviour the
 * restyle had to preserve: SiteFooter's Disclaimer stays on, the FAQ keeps
 * emitting the page's one FAQPage, and the agent proof renders nothing until
 * a verified, approved record exists.
 */
describe("/for-agents design pass", () => {
  const page = read("app/for-agents/page.tsx");
  const proof = read("components/marketing/testimonial-card.tsx");

  it("renders exactly one Disclaimer: SiteFooter's", () => {
    expect(page).not.toMatch(/<Disclaimer\b/);
    expect(page).not.toMatch(/components\/marketing\/disclaimer/);
    // Kept: the footer's Disclaimer is the page's one and stays switched on.
    expect(page).toContain("<SiteFooter />");
    expect(page).not.toMatch(/disclaimer=\{false\}/);
  });

  it("shows the memo as a document, not inside a browser frame", () => {
    expect(page).toMatch(/<ProductShot\s+shot=\{MEMO_SHOT\}\s+frame="document"/);
  });

  it("builds the page from the shared parts", () => {
    for (const part of ["<PageHero", "<RuledList", "<StepList", "<CloseSection"]) {
      expect(page, part).toContain(part);
    }
  });

  it("kept: one FaqSection, emitting the page's FAQPage", () => {
    expect(page.match(/<FaqSection\b/g)).toHaveLength(1);
    expect(page).not.toMatch(/structuredData=\{false\}/);
  });

  it("carries no retired chrome: arrows, decorative icons, micro-labels, cards", () => {
    for (const source of [page, proof]) {
      expect(source).not.toMatch(/lucide-react/);
      expect(source).not.toMatch(/\b(?:uppercase|tracking-widest|tracking-wide|text-2xs|text-3xs|text-xs)\b/);
      expect(source).not.toMatch(/\b(?:rounded-2xl|rounded-3xl|shadow-sm|bg-gradient-to-\w+|font-extrabold|font-bold)\b/);
    }
    // No arrow after link text on the page (the proof metric line's
    // before/after arrow is data, not a link).
    expect(page).not.toMatch(/→/);
  });

  describe("kept: AgentProofSection renders only verified, approved proof", () => {
    const render = () => renderToStaticMarkup(createElement(AgentProofSection));

    const record = (overrides: Partial<VerifiedAgentProof> = {}): VerifiedAgentProof => ({
      id: "agent-proof-test",
      archetype: "investor-focused-agent",
      customerType: "investor-focused agent",
      market: "Philadelphia",
      quote: "A test quote that only exists in this file.",
      customerName: "Test Agent",
      sourceChannel: "interview",
      observedAt: "2026-08-15",
      verification: {
        status: "verified",
        verifiedAt: "2026-08-15",
        verifiedBy: "proof-reviewer",
        evidenceRef: "crm:test-evidence",
      },
      approval: {
        publicDisplay: true,
        approvedAt: "2026-08-15",
        scope: ["quote", "attribution"],
        homepage: true,
        ads: false,
        caseStudy: false,
      },
      ...overrides,
    });

    afterEach(() => {
      agentProof.length = 0;
    });

    it("renders nothing, not even its heading, at zero records", () => {
      expect(render()).toBe("");
    });

    it("renders nothing when no record passes the publication gate", () => {
      agentProof.push(
        record({ verification: { status: "unverified", evidenceRef: "crm:draft" } }),
        record({ id: "not-for-homepage", approval: { ...record().approval, homepage: false } }),
      );
      expect(render()).toBe("");
    });

    it("renders the heading and the quote once a record passes the gate", () => {
      agentProof.push(record());
      const html = render();
      expect(html).toContain("Agents on TrueCap");
      expect(html).toContain("A test quote that only exists in this file.");
    });
  });
});
