import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

const rootLayout = read("../../app/layout.tsx");
const shortlistPage = read("../../app/dashboard/triage/page.tsx");
const settingsPage = read("../../app/settings/page.tsx");
const authShell = read("../../components/auth/auth-shell.tsx");
const analysisDashboard = read("../../components/investcalc/analysis-dashboard.tsx");
const comments = read("../../components/investcalc/deal-comments-panel.tsx");
const notes = read("../../components/investcalc/deal-notes-panel.tsx");
const dueDiligence = read("../../components/investcalc/due-diligence-card.tsx");
const savedDeals = read("../../components/investcalc/saved-analyses-page-v2.tsx");
const shareButton = read("../../components/investcalc/share-link-button.tsx");
const branding = read("../../components/settings/branding-form.tsx");
const mobileNav = read("../../components/marketing/marketing-nav.tsx");
const portfolioChart = read("../../components/dashboard/PortfolioChart.tsx");
const riskReturn = read("../../components/dashboard/RiskReturn.tsx");
const form = read("../../components/ui/form.tsx");
const toast = read("../../components/ui/toast.tsx");
const css = read("../../app/globals.css");

describe("WCAG 2.1 AA remediation guards", () => {
  it("keeps skip links wired to real main landmarks and page-level headings", () => {
    expect(rootLayout).toContain('href="#main"');
    expect(shortlistPage).toContain('<main id="main"');
    expect(settingsPage).toContain('<main id="main"');
    expect(settingsPage).toContain("<h1");
    expect(authShell).toContain('<main id="main"');
    expect(authShell).toContain("<h1");
    expect(analysisDashboard).toContain('<h1');
    expect(analysisDashboard).toContain('id="analysis-decision-title"');
  });

  it("gives the audited icon-only controls accessible names", () => {
    expect(comments).toContain('aria-label="Add comment"');
    expect(dueDiligence).toContain('aria-label="Add checklist item"');
    expect(toast).toContain('aria-label="Close notification"');
  });

  it("keeps persistent labels on notes, comments, checklist entry, search, and branding inputs", () => {
    expect(comments).toContain('htmlFor="deal-comment-draft"');
    expect(comments).toContain('id="deal-comment-draft"');
    expect(notes).toContain('htmlFor="deal-notes-input"');
    expect(notes).toContain('id="deal-notes-input"');
    expect(dueDiligence).toContain('htmlFor="new-due-diligence-item"');
    expect(dueDiligence).toContain('id="new-due-diligence-item"');
    expect(savedDeals).toContain('htmlFor="saved-analysis-search"');
    expect(savedDeals).toContain('id="saved-analysis-search"');
    expect(branding).toContain("<fieldset");
    expect(branding).toContain("<legend");
    expect(branding).toContain("aria-label={ariaLabel}");
  });

  it("announces asynchronous save states without moving focus", () => {
    for (const source of [comments, notes, dueDiligence, branding]) {
      expect(source).toContain('role="status"');
      expect(source).toContain('aria-live="polite"');
    }
  });

  it("preserves 44px targets for mobile navigation and audited compact controls", () => {
    expect(mobileNav).toContain("min-h-11");
    expect(dueDiligence).toContain("flex size-11 shrink-0 cursor-pointer");
    expect(dueDiligence).toContain('className="min-h-11 text-xs"');

    const savedSelectionTargets = savedDeals.match(
      /<label className="flex size-11[^>]*cursor-pointer[^>]*">/g,
    );
    expect(savedSelectionTargets).toHaveLength(3);
  });

  it("keeps text and control boundaries at AA contrast and focus baselines", () => {
    expect(css).toContain("--border: oklch(0.65 0.02 240)");
    expect(css).toContain("--input: oklch(0.65 0.02 240)");
    expect(css).toContain("--brand-orange: oklch(0.58 0.18 42)");
    expect(css).toContain("outline: 3px solid var(--ring)");
    expect(css).toContain("outline-offset: 2px");
  });

  it("uses grouped pressed controls instead of incomplete tab semantics", () => {
    expect(portfolioChart).toContain('role="group"');
    expect(portfolioChart).toContain("aria-pressed={metric === item.id}");
    expect(riskReturn).toContain('role="group"');
    expect(riskReturn).toContain("aria-pressed={metric === m.id}");
  });

  it("does not point aria-describedby at an absent description", () => {
    expect(form).toContain("hasDescription ? formDescriptionId : null");
    expect(form).toContain("error ? formMessageId : null");
    expect(form).toContain("aria-describedby={describedBy}");
  });

  it("keeps the Share action visibly named at phone widths", () => {
    const buttonStart = shareButton.indexOf("<Button");
    const buttonEnd = shareButton.indexOf("</Button>", buttonStart);
    const trigger = shareButton.slice(buttonStart, buttonEnd);

    expect(trigger).toContain('context === "client-report" ? "Client report" : "Share"');
    expect(trigger).not.toMatch(/hidden[^\n"]*sm:inline/);
  });
});
