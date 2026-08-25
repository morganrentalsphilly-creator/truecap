import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Pins for the 2026-08-25 core-UX audit fixes (founder-named symptoms):
 * the RentCast AVM must reach the empty price field as a LABELED estimate,
 * free users must never be instructed to perform a Pro-only action, share
 * links must be revocable from the product, and every free-tier wall must
 * answer with a next step instead of a dead end.
 */

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

function sourceSection(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  expect(start, `missing source marker: ${startMarker}`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(end, `missing source marker after ${startMarker}: ${endMarker}`).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("RentCast AVM reaches the empty price field as a labeled estimate", () => {
  const calculator = read("components/investcalc/investcalc-page.tsx");
  const applyComps = sourceSection(
    calculator,
    "const applyComps = useCallback(",
    "const handleAutofillFromAddress = useCallback("
  );

  it("fills the AVM only when the field is empty and no listing price exists", () => {
    expect(applyComps).toContain("adopted.purchasePrice == null");
    expect(applyComps).toContain('isEmptyNumber(form.getValues("purchasePrice"))');
    expect(applyComps).toContain("setEstimatedPriceValue(rounded)");
    expect(applyComps).toContain(
      'setPriceEstimateBasis("RentCast\'s value estimate for this address")'
    );
    expect(applyComps).toContain("setPriceEstimated(true)");
  });

  it("the toast says which price it filled instead of a blanket disclaimer", () => {
    expect(applyComps).toContain("Price is RentCast's value estimate");
    expect(applyComps).not.toContain("AVM value stayed in comps");
  });

  it("an estimated price is never headlined as Asking", () => {
    const summary = read("components/investcalc/focused-decision-summary.tsx");
    expect(summary).toContain('priceIsEstimated ? "Est. price" : "Asking"');
    const dashboard = read("components/investcalc/analysis-dashboard.tsx");
    expect(dashboard).toContain("priceIsEstimated={priceIsEstimated}");
    expect(calculator).toContain("priceIsEstimated={priceEstimated}");
  });
});

describe("free users are never instructed to perform a Pro-only action", () => {
  const summary = read("components/investcalc/focused-decision-summary.tsx");

  it("the apply-targets instruction renders only for users who can apply", () => {
    expect(summary).toContain(
      '? canTunePriceCeiling\n                ? "Review or edit the example targets, then apply at least one'
    );
    expect(summary).toContain(
      "TrueCap Pro calculates the highest modeled price that still meets rules you choose"
    );
  });

  it("tune-capable users get a one-click explicit apply for the example targets", () => {
    const applyBlock = sourceSection(
      summary,
      "{!targetAdopted && canTunePriceCeiling && !targetBlocked ? (",
      "Apply the example targets"
    );
    expect(applyBlock).toContain("onClick={onAdoptTarget}");
  });

  it("internal provenance slugs stay out of the UI labels", () => {
    expect(summary).not.toContain('"captured rules · schema v1"');
    expect(summary).toContain('? "example rules"');
    expect(summary).toContain('"rules recorded with this analysis"');
  });
});

describe("share links are revocable from the share dialog", () => {
  const shareButton = read("components/investcalc/share-link-button.tsx");

  it("lists the owner's links and wires the revoke action", () => {
    expect(shareButton).toContain("listPublicSharesAction()");
    expect(shareButton).toContain("revokePublicShareAction({ id })");
    expect(shareButton).toContain("Your share links");
    expect(shareButton).toContain('"Revoke"');
  });

  it("the dialog no longer promises revocation lives somewhere else", () => {
    expect(shareButton).not.toContain("can be\n                revoked there");
  });
});

describe("free-tier walls answer with a next step", () => {
  const calculator = read("components/investcalc/investcalc-page.tsx");
  const dashboard = read("components/investcalc/analysis-dashboard.tsx");

  it("anonymous autofill offers account creation, not a red error", () => {
    const branch = sourceSection(
      calculator,
      'if (r.code === "SIGN_IN_REQUIRED") {',
      'if (r.code === "ENTITLEMENT_REQUIRED") {'
    );
    expect(branch).toContain("Create a free account to autofill");
    expect(branch).toContain("Create free account");
    expect(branch).not.toContain('variant: "destructive"');
  });

  it("the free 5-deal cap offers the upgrade", () => {
    const wall = sourceSection(
      calculator,
      'if (result.code === "ENTITLEMENT_SAVE") {',
      'if (result.code === "ADDRESS_CHANGED") {'
    );
    expect(wall).toContain("const isPaidPlan = canUpdateSavedDeals");
    expect(wall).toContain("Free limit: 5 saved deals");
    expect(wall).toContain("See Pro plans");
  });

  it("the plan-locked Save explains itself instead of silently disabling", () => {
    const saveClick = sourceSection(
      dashboard,
      "const handleSaveClick = () => {",
      "const handleExportPdf = ("
    );
    expect(saveClick).toContain("Editing saved deals is Pro");
    expect(saveClick).toContain("See Pro plans");
  });

  it("comps entitlement walls route to plans, not a failure toast", () => {
    const comps = read("components/investcalc/property-comps-card.tsx");
    expect(comps).toContain(
      'if (r.code === "ENTITLEMENT_REQUIRED" || r.code === "CAP_REACHED") {'
    );
    expect(comps).toContain("See plans");
  });

  it("decision-first results pitch the Offer Ceiling once, not twice", () => {
    expect(dashboard).toContain("!canUseMaxOffer && !decisionFirst ? (");
  });
});

describe("sold features are reachable from the decision-first results", () => {
  const summary = read("components/investcalc/focused-decision-summary.tsx");
  const dashboard = read("components/investcalc/analysis-dashboard.tsx");

  it("PDF export renders in the decision card with the legacy gating", () => {
    expect(summary).toContain("Export PDF");
    expect(dashboard).toContain("onExportPdf={() => handleExportPdf()}");
    expect(dashboard).toContain(
      "isExportDisabled={isExporting || (canExportPdf && !isSaved)}"
    );
  });

  it("the free Screening Index renders as a secondary strip outside the decision card", () => {
    // Outside on purpose: advocacy-accessibility-guards pins that the
    // decision module itself carries no numerical-confidence claim.
    expect(dashboard).toContain('id="screening-index"');
    expect(dashboard).toContain("Secondary screening heuristic — not investment advice.");
    expect(summary).not.toContain("screening-index");
  });
});

describe("input-phase traps and mislabels", () => {
  const calculator = read("components/investcalc/investcalc-page.tsx");

  it("the primary CTA only becomes the sample launcher on a pristine form", () => {
    expect(calculator).toContain(
      "const primaryCtaRunsSample = !hasPropertyAvailable && !hasMeaningfulInput"
    );
    expect(calculator).toContain('type={primaryCtaRunsSample ? "button" : "submit"}');
    expect(calculator).toContain(
      "onTrySample={primaryCtaRunsSample ? handleTrySampleDeal : undefined}"
    );
  });

  it("the keyboard hint modifier is platform-aware with a stable SSR default", () => {
    expect(calculator).toContain('useState("⌘")');
    expect(calculator).toContain('setKbdModifier("Ctrl")');
    expect(calculator).toContain("{kbdModifier}");
  });

  it("a statewide-average HUD fallback never wears the local FMR label", () => {
    const action = read("app/actions/enrich-property.ts");
    expect(action).toContain("stateAverage: true,");
    expect(calculator).toContain('"(HUD statewide average)"');
    expect(calculator).toContain("this is a statewide average");
    // The multi-family per-unit fill discloses the same fallback.
    expect(calculator).toContain("these are statewide averages");
  });
});

describe("an estimated price never masquerades as an asking price downstream", () => {
  const calculator = read("components/investcalc/investcalc-page.tsx");
  const summary = read("components/investcalc/focused-decision-summary.tsx");

  it("the decision headline is substituted at render when the price is estimated", () => {
    expect(summary).toContain(
      'rawDecisionLabel.replace(/ at asking\\b/, " at the estimated price")'
    );
  });

  it("share links carry the estimate flag end to end", () => {
    const shareButton = read("components/investcalc/share-link-button.tsx");
    expect(shareButton).toContain("priceEstimated: true");
    expect(summary).toContain("priceIsEstimated={priceIsEstimated}");
    const action = read("app/actions/public-shares.ts");
    expect(action).toContain("priceEstimated: parsed.data.priceEstimated === true");
    const lib = read("lib/public-share.ts");
    expect(lib).toContain("...(input.priceEstimated ? { priceEstimated: true } : {})");
    const viewer = read("components/investcalc/read-only-analysis-view.tsx");
    expect(viewer).toContain('priceEstimated ? "Estimated price" : "Asking"');
    const page = read("app/s/[token]/page.tsx");
    expect(page).toContain("priceEstimated={resolved.snapshot.meta.priceEstimated === true}");
  });

  it("surfaces that cannot know provenance use neutral price wording", () => {
    const table = read("components/dashboard/your-deals-table.tsx");
    expect(table).not.toContain(">\n                Asking\n              </th>");
    const pdf = read("lib/pdf-generator.ts");
    expect(pdf).toContain("At the analyzed price");
    expect(pdf).not.toContain("At the current asking price");
  });

  it("the hero landing prompt never asks for a price that is already filled", () => {
    expect(calculator).toContain('"One field to your first screen"');
    expect(calculator).toContain('form.setFocus("bedrooms")');
  });
});
