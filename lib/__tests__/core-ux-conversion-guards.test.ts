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

function sourceSection(
  source: string,
  startMarker: string,
  endMarker: string,
): string {
  const start = source.indexOf(startMarker);
  expect(start, `missing source marker: ${startMarker}`).toBeGreaterThanOrEqual(
    0,
  );
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(
    end,
    `missing source marker after ${startMarker}: ${endMarker}`,
  ).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("RentCast AVM reaches the empty price field as a labeled estimate", () => {
  const calculator = read("components/investcalc/investcalc-page.tsx");
  const applyComps = sourceSection(
    calculator,
    "const applyComps = useCallback(",
    "const handleAutofillFromAddress = useCallback(",
  );

  it("fills the AVM only when the field is empty and no listing price exists", () => {
    expect(applyComps).toContain("adopted.purchasePrice == null");
    expect(applyComps).toContain(
      'isEmptyNumber(form.getValues("purchasePrice"))',
    );
    expect(applyComps).toContain("setEstimatedPriceValue(rounded)");
    expect(applyComps).toContain(
      'setPriceEstimateBasis("RentCast\'s value estimate for this address")',
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
      '? canTunePriceCeiling\n                ? "Choose at least one criterion to calculate',
    );
    expect(summary).toContain(
      "TrueCap Pro calculates the highest modeled price that still meets rules you choose",
    );
  });

  it("tune-capable users get one validated explicit Apply surface", () => {
    expect(summary).not.toContain("Apply the example targets");
    expect(summary).toContain("onClick={applyTargetDraft}");
    expect(summary).toContain(
      'targetAdopted ? "Update criteria" : "Apply criteria"',
    );
    expect(summary).toContain("targetDraftInvalid ||");
  });

  it("internal provenance slugs stay out of the UI labels", () => {
    expect(summary).not.toContain('"captured rules · schema v1"');
    expect(summary).toContain('? "example rules"');
    expect(summary).toContain('"rules recorded with this analysis"');
  });
});

describe("share links are revocable from the share dialog", () => {
  const shareButton = read("components/investcalc/share-link-button.tsx");
  const shareActions = read("app/actions/public-shares.ts");
  const shareStore = read("lib/public-share.ts");

  it("owner-scopes and paginates every safely described link", () => {
    expect(shareButton).toContain(
      "listPublicSharesAction({ offset: 0 })",
    );
    expect(shareButton).toContain("Manage all share links");
    expect(shareButton).toContain("s.propertyLabel");
    expect(shareButton).toContain(
      "savedDealId && s.dealId === savedDealId",
    );
    expect(shareButton).toContain('"another saved deal"');
    expect(shareButton).toContain('"unattached"');
    expect(shareActions).toContain(
      ".object({ offset: z.number().int().min(0) })",
    );
    expect(shareActions).toContain('.eq("owner_id", user.id)');
    expect(shareActions).toContain(".range(parsed.data.offset");
    expect(shareActions).toContain("nextOffset:");
    expect(shareActions).toContain("audience:");
    expect(shareActions).toContain("addressVisibility:");
    expect(shareActions).toContain("propertyLabel:");
    expect(shareButton).toContain("SHARE_AUDIENCE_LABEL[s.audience]");
    expect(shareButton).toContain('timeStyle: "medium"');
    expect(shareButton).toContain("Show all ${listedShares.length} links");
    expect(shareButton).toContain("showAllShares");
    expect(shareButton).toContain("Load older links");
    expect(shareButton).toContain("loadOlderShares");
    expect(shareButton).toContain('sharesListState === "error"');
    expect(shareButton).toContain("Existing links could not be loaded");
    expect(shareButton).toContain("Retry loading links");
    expect(shareButton).toContain('role="alert"');
  });

  it("requires a full-size confirmation and revokes the exact nullable scope", () => {
    expect(shareButton).toContain(
      "revokePublicShareAction({ id, dealId })",
    );
    expect(shareButton).toContain("Revoke this link?");
    expect(shareButton).toContain("It will stop opening immediately");
    expect(shareButton).toContain("Yes, revoke link");
    expect(shareButton).toContain('className="h-auto min-h-11');
    expect(shareActions).toContain(
      '.object({ id: z.string().uuid(), dealId: z.string().uuid().nullable() })',
    );
    expect(shareActions).toContain('.eq("id", parsed.data.id)');
    expect(shareActions).toContain('.eq("owner_id", user.id)');
  });

  it("keeps newly minted unsaved or dirty-analysis links revocable", () => {
    expect(shareStore).toContain('.select("id")');
    expect(shareStore).toContain("id: String(inserted.id)");
    expect(shareActions).toContain("id: minted.id");
    expect(shareActions).toContain("dealId: minted.dealId");
    expect(shareButton).toContain(
      "setCreatedShare({ id: opaque.id, dealId: opaque.dealId })",
    );
    expect(shareButton).toContain("Revoke this link");
    expect(shareButton).toContain("createdShare.dealId");
    expect(shareButton).toContain(
      "This dialog manages share links across your account",
    );
    expect(shareButton).toContain("setShareUrl(opaque.url)");
    expect(shareButton).toContain("navigator.clipboard.writeText(shareUrl)");
    expect(shareButton).toContain("Links also expire automatically.");
  });
});

describe("free-tier walls answer with a next step", () => {
  const calculator = read("components/investcalc/investcalc-page.tsx");
  const dashboard = read("components/investcalc/analysis-dashboard.tsx");

  it("anonymous autofill offers account creation, not a red error", () => {
    const branch = sourceSection(
      calculator,
      'if (r.code === "SIGN_IN_REQUIRED") {',
      'if (r.code === "ENTITLEMENT_REQUIRED") {',
    );
    expect(branch).toContain("Create a free account to autofill");
    expect(branch).toContain("Create free account");
    expect(branch).not.toContain('variant: "destructive"');
  });

  it("the free 5-deal cap offers the upgrade", () => {
    const wall = sourceSection(
      calculator,
      'if (result.code === "ENTITLEMENT_SAVE") {',
      'if (result.code === "ADDRESS_CHANGED") {',
    );
    expect(wall).toContain("const isPaidPlan = canUpdateSavedDeals");
    expect(wall).toContain("Free limit: 5 saved deals");
    expect(wall).toContain("See Pro plans");
  });

  it("the plan-locked Save explains itself instead of silently disabling", () => {
    const saveClick = sourceSection(
      dashboard,
      "const handleSaveClick = () => {",
      "const handleExportPdf = (",
    );
    expect(saveClick).toContain("Editing saved deals is Pro");
    expect(saveClick).toContain("See Pro plans");
  });

  it("comps entitlement walls route to plans, not a failure toast", () => {
    const comps = read("components/investcalc/property-comps-card.tsx");
    expect(comps).toContain(
      'if (r.code === "ENTITLEMENT_REQUIRED" || r.code === "CAP_REACHED") {',
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

  it("PDF export permits an exact anonymous decision without dropping the saved-deal gate", () => {
    expect(summary).toContain("Export PDF");
    expect(dashboard).toContain("onExportPdf={() => handleExportPdf()}");
    expect(dashboard).toContain(
      "canExportPdf && !canExportUnsavedPdf && !isSaved",
    );
    expect(dashboard).toContain(
      "isExportDisabled={isExporting || exportNeedsSave}",
    );
  });

  it("the free Screening Index renders as a secondary strip outside the decision card", () => {
    // Outside on purpose: advocacy-accessibility-guards pins that the
    // decision module itself carries no numerical-confidence claim.
    expect(dashboard).toContain('id="screening-index"');
    expect(dashboard).toContain(
      "Secondary screening heuristic — not investment advice.",
    );
    expect(summary).not.toContain("screening-index");
  });
});

describe("input-phase traps and mislabels", () => {
  const calculator = read("components/investcalc/investcalc-page.tsx");

  it("the primary CTA only becomes the sample launcher on a pristine form", () => {
    expect(calculator.replace(/\s+/g, "")).toContain(
      "activeStrategyKey===null&&!hasPropertyAvailable&&!hasMeaningfulInput&&!form.formState.isDirty",
    );
    expect(calculator).toContain(
      "onClick={() => void handlePrimaryRunAction()}",
    );
    expect(calculator.replace(/\s+/g, "")).toContain(
      "onTrySample={primaryCtaRunsSample?handleTrySampleDeal:undefined}",
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
    expect(summary).toContain("sourceAwareDecisionLabel.replace(");
    expect(summary).toContain('" at the estimated price",');
  });

  it("share links carry the estimate flag end to end", () => {
    const shareButton = read("components/investcalc/share-link-button.tsx");
    expect(shareButton).toContain("priceEstimated: true");
    expect(summary).toContain("priceIsEstimated={priceIsEstimated}");
    const action = read("app/actions/public-shares.ts");
    expect(action).toContain(
      "let priceEstimated = parsed.data.priceEstimated === true",
    );
    // Saved provenance must still override a stale browser flag. The
    // derivation now lives in one shared helper so the opaque share viewer
    // and the agent client portal cannot label the same deal differently.
    expect(action).toContain("isRecordedPriceEstimated(recordedResultSnapshot)");
    const portal = read("app/portal/[token]/d/[dealId]/page.tsx");
    expect(portal).toContain("isRecordedPriceEstimated(savedResultSnapshot)");
    expect(portal).toContain("priceEstimated={portalPriceEstimated}");
    const provenance = read("lib/recorded-price-provenance.ts");
    expect(provenance).toContain("purchasePriceEstimated");
    expect(provenance).toContain("sourceContext");
    expect(action).toContain("priceEstimated,");
    const lib = read("lib/public-share.ts");
    expect(lib).toContain(
      "...(input.priceEstimated ? { priceEstimated: true } : {})",
    );
    const viewer = read("components/investcalc/read-only-analysis-view.tsx");
    expect(viewer).toContain('priceEstimated ? "Estimated price" : "Asking"');
    const page = read("app/s/[token]/page.tsx");
    expect(page).toContain(
      "priceEstimated={resolved.snapshot.meta.priceEstimated === true}",
    );
  });

  it("surfaces that cannot know provenance use neutral price wording", () => {
    const table = read("components/dashboard/your-deals-table.tsx");
    expect(table).not.toContain(
      ">\n                Asking\n              </th>",
    );
    const pdf = read("lib/pdf-generator.ts");
    expect(pdf).toContain("At the analyzed price");
    expect(pdf).not.toContain("At the current asking price");
  });

  it("the hero landing prompt never asks for a price that is already filled", () => {
    expect(calculator).toContain('"One field to your first screen"');
    expect(calculator).toContain('form.setFocus("bedrooms")');
  });
});

describe("Offer Ceiling targets come from the user's own Buy Box", () => {
  it("the analyzer scopes buy boxes to the agent's own, not a client's", () => {
    // A client-assigned box holds THAT BUYER's criteria. Five other surfaces
    // already apply boxesForDealClient; the analyzer silently did not, so a
    // client's rules could drive a personal analysis (and a user whose only
    // box was client-scoped got "Set targets first" forever).
    const card = read("components/investcalc/buy-box-verdict-card.tsx");
    expect(card).toContain("boxesForPersonalAnalyzerStrategy(");
    expect(card).toContain("analyzerStrategyKey");
    expect(card).toContain("boxesForPersonalAnalyzerStrategy,");
  });

  it("the not-adopted state points at the Buy Box as the durable answer", () => {
    const summary = read("components/investcalc/focused-decision-summary.tsx");
    expect(summary).toContain("/settings#buy-boxes");
    expect(summary).toContain("Save reusable criteria in your");
  });
});
