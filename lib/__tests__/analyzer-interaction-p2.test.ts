import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  addressUnitDesignator,
  shouldPromptForHoa,
  withTypedUnit,
} from "@/components/investcalc/address-shape";
import { isMinimumErrorHeldWhileTyping } from "@/components/investcalc/form-field-helpers";
import { withoutHudFilledRents } from "@/components/investcalc/typed-unit-rents";
import { checkUnitRentsAgainstFmr } from "@/lib/multi-family-rent-check";

/**
 * Small analyzer and result-screen defects from the 2026-09-30 go-to-market
 * audit (report rows P2-27, P2-59, P2-61, P2-68, P2-69, P2-70, P2-73, P2-76,
 * P2-77, P2-148, P2-149, P2-150, P2-153, P2-154, P2-155, P2-157). The pure
 * helpers are tested by behaviour; markup that only a browser can measure is
 * pinned by source so the defect cannot come back unnoticed.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("a typed unit number survives a suggestion pick (P2-148)", () => {
  it("finds the designators a visitor writes", () => {
    expect(addressUnitDesignator("444 N Front St #209, Columbus, OH 43215")).toBe("#209");
    expect(addressUnitDesignator("444 N Front St # 209 Columbus OH")).toBe("# 209");
    expect(addressUnitDesignator("12 Elm Ave Apt 2B, Austin, TX 78701")).toBe("Apt 2B");
    expect(addressUnitDesignator("12 Elm Ave, Unit 5, Austin, TX")).toBe("Unit 5");
    expect(addressUnitDesignator("100 Main St Ste E, Dayton, OH")).toBe("Ste E");
    expect(addressUnitDesignator("100 Main St Suite #4A")).toBe("Suite #4A");
    expect(addressUnitDesignator("9 Oak Rd apartment 12-3, Reno, NV")).toBe("apartment 12-3");
  });

  it("does not read a street name or a plain address as a unit", () => {
    expect(addressUnitDesignator("444 N Front St, Columbus, OH 43215, USA")).toBeNull();
    expect(addressUnitDesignator("12 Unit St, Akron, OH")).toBeNull();
    expect(addressUnitDesignator("7 Suite Ave, Akron, OH")).toBeNull();
    expect(addressUnitDesignator("3 Capt Smith Rd, Mystic, CT")).toBeNull();
    expect(addressUnitDesignator(undefined)).toBeNull();
    expect(addressUnitDesignator(209)).toBeNull();
  });

  it("puts the typed unit back after the street line of the picked building", () => {
    expect(
      withTypedUnit(
        "444 N Front St, Columbus, OH 43215, USA",
        "444 N Front St #209, Columbus, OH 43215",
      ),
    ).toBe("444 N Front St #209, Columbus, OH 43215, USA");
    expect(withTypedUnit("12 Elm Ave", "12 elm ave apt 2B")).toBe("12 Elm Ave apt 2B");
  });

  it("leaves the pick alone when nothing was typed, a unit is already there, or it is another place", () => {
    const picked = "444 N Front St, Columbus, OH 43215, USA";
    expect(withTypedUnit(picked, "444 N Front St, Columbus")).toBe(picked);
    expect(withTypedUnit(picked, "")).toBe(picked);
    expect(withTypedUnit(picked, undefined)).toBe(picked);
    // Google kept a unit of its own.
    expect(
      withTypedUnit("444 N Front St #209, Columbus, OH 43215, USA", "444 N Front St #209"),
    ).toBe("444 N Front St #209, Columbus, OH 43215, USA");
    // A neighbour, and a business on the same street: not the typed building.
    expect(withTypedUnit("446 N Front St, Columbus, OH 43215, USA", "444 N Front St #209")).toBe(
      "446 N Front St, Columbus, OH 43215, USA",
    );
    expect(
      withTypedUnit("Columbus City Attorney, N Front St, Columbus, OH 43215, USA", "444 N Front St #209"),
    ).toBe("Columbus City Attorney, N Front St, Columbus, OH 43215, USA");
  });

  it("is wired into both branches of the autocomplete's pick handler", () => {
    const source = read("components/investcalc/address-autocomplete.tsx");
    const handler = source.slice(
      source.indexOf("const handleSelect = async"),
      source.indexOf("/** Pick the state/county/zip out of"),
    );
    expect(handler.split("withTypedUnit(")).toHaveLength(3);
    // The form and the caller receive the same text (the hero compares them).
    expect(handler).toContain('form.setValue("address", pickedAddress, {');
    expect(handler).toContain("formattedAddress: pickedAddress,");
    expect(handler).not.toContain('form.setValue("address", place.formattedAddress');
  });
});

describe("HOA prompt for an address with a unit number (P2-148)", () => {
  const condo = "444 N Front St #209, Columbus, OH 43215";

  it("asks while HOA is blank or 0 and the field has not been visited", () => {
    expect(shouldPromptForHoa({ address: condo, hoaMonthly: undefined, hoaFieldVisited: false })).toBe(true);
    expect(shouldPromptForHoa({ address: condo, hoaMonthly: 0, hoaFieldVisited: false })).toBe(true);
    expect(shouldPromptForHoa({ address: condo, hoaMonthly: null, hoaFieldVisited: false })).toBe(true);
  });

  it("stops once dues are entered, the field was visited, or there is no unit", () => {
    expect(shouldPromptForHoa({ address: condo, hoaMonthly: 300, hoaFieldVisited: false })).toBe(false);
    expect(shouldPromptForHoa({ address: condo, hoaMonthly: 0, hoaFieldVisited: true })).toBe(false);
    expect(
      shouldPromptForHoa({ address: "123 Main St, Columbus, OH 43215", hoaMonthly: 0, hoaFieldVisited: false }),
    ).toBe(false);
  });

  it("shows on the first screen as a chip and in the expense card, and never as a required input", () => {
    const strip = read("components/investcalc/assumptions-strip.tsx");
    expect(strip).toContain("shouldPromptForHoa({");
    expect(strip).toContain('label: "HOA $0/mo",');
    expect(strip).toContain('focusFieldId: "hoaMonthly",');
    expect(strip).toContain("{hoaChip ? renderChip(hoaChip) : null}");

    const expenses = read("components/investcalc/operating-expenses-section.tsx");
    const prompt = expenses.slice(
      expenses.indexOf("{showHoaPrompt ? ("),
      expenses.indexOf("{/* Keep advanced inputs mounted"),
    );
    expect(prompt).toContain("HOA dues are $0.");
    expect(prompt).toContain("Add HOA dues");
    expect(prompt).toContain('document.getElementById("hoaMonthly")?.focus()');
    // The HOA field itself is unchanged: optional, no required marker.
    const hoaField = expenses.slice(expenses.indexOf('id="hoaMonthly"'), expenses.indexOf('id="hoaMonthly-error"'));
    expect(hoaField).not.toMatch(/\brequired\b|aria-required/);
  });

  it("does not let the live preview claim every expense is included", () => {
    const preview = read("components/investcalc/live-verdict-panel.tsx");
    expect(preview).not.toContain("all expenses are included");
    expect(preview).toContain("the expense assumptions on this form are included");
  });
});

describe("the HUD rent check does not grade HUD's own figure (P2-149)", () => {
  const FMR = { 2: 1263, 3: 1600 };

  it("says nothing when every unit rent is still the auto-filled HUD figure", () => {
    const units = [
      { bedrooms: 2, monthlyRent: 1263 },
      { bedrooms: 2, monthlyRent: 1263 },
    ];
    // What the page did before: HUD compared with itself, always "in line".
    expect(checkUnitRentsAgainstFmr(units, FMR).rollup).toContain("in line with HUD fair-market rent");
    const scoped = withoutHudFilledRents(units, FMR);
    expect(scoped).toHaveLength(2);
    expect(checkUnitRentsAgainstFmr(scoped, FMR)).toEqual({ verdicts: [], rollup: null });
    // The form's own values are not touched.
    expect(units[0].monthlyRent).toBe(1263);
  });

  it("still checks a rent the visitor typed, at its own unit index", () => {
    const units = [
      { bedrooms: 2, monthlyRent: 1263 },
      { bedrooms: 3, monthlyRent: 2400 },
    ];
    const { verdicts, rollup } = checkUnitRentsAgainstFmr(withoutHudFilledRents(units, FMR), FMR);
    expect(verdicts).toHaveLength(1);
    expect(verdicts[0]).toMatchObject({ unitIndex: 1, verdict: "above", farOff: true });
    expect(rollup).toContain("1 of 1 units is modeled");
    expect(rollup).toContain("(1 unit not checked yet)");
  });

  it("passes units through when there is no benchmark or no match", () => {
    const units = [{ bedrooms: 4, monthlyRent: 1263 }, undefined, { bedrooms: 2 }];
    expect(withoutHudFilledRents(units, null)).toEqual(units);
    expect(withoutHudFilledRents(units, FMR)).toEqual(units);
  });

  it("is what the units section feeds the check", () => {
    const section = read("components/investcalc/multi-family-units-section.tsx");
    expect(section).toContain("withoutHudFilledRents(units, fmrByBedrooms),");
    expect(section).not.toContain("checkUnitRentsAgainstFmr(units, fmrByBedrooms)");
  });
});

describe("the minimum-price message waits for blur or a run attempt (P2-150)", () => {
  it("is held only for a too-small value in a field not yet left and not yet submitted", () => {
    expect(isMinimumErrorHeldWhileTyping({ errorType: "too_small", fieldTouched: false, submitCount: 0 })).toBe(true);
    expect(isMinimumErrorHeldWhileTyping({ errorType: "too_small", fieldTouched: true, submitCount: 0 })).toBe(false);
    expect(isMinimumErrorHeldWhileTyping({ errorType: "too_small", fieldTouched: false, submitCount: 1 })).toBe(false);
  });

  it("never holds a required or too-large message, or no error at all", () => {
    expect(isMinimumErrorHeldWhileTyping({ errorType: "invalid_type", fieldTouched: false, submitCount: 0 })).toBe(false);
    expect(isMinimumErrorHeldWhileTyping({ errorType: "too_big", fieldTouched: false, submitCount: 0 })).toBe(false);
    expect(isMinimumErrorHeldWhileTyping({ errorType: undefined, fieldTouched: false, submitCount: 0 })).toBe(false);
  });

  it("drives the price field's message, invalid state and red border together", () => {
    const section = read("components/investcalc/property-details-section.tsx");
    expect(section).toContain("aria-invalid={!!purchasePriceError}");
    expect(section).toContain("message={purchasePriceError?.message}");
    expect(section).not.toContain("aria-invalid={!!errors.purchasePrice}");
    expect(section).not.toContain("message={errors.purchasePrice?.message}");
    // The schema still carries the minimum: only the timing changed.
    expect(read("lib/investcalc-schema.ts")).toContain('"Purchase price must be at least $10,000"');
  });
});

describe("dialogs keep the close button's column clear on phones (P2-59, P2-77)", () => {
  it("reserves it in the primitive's header, on both sides so a centred title stays centred", () => {
    const dialog = read("components/ui/dialog.tsx");
    expect(dialog).toContain("'flex flex-col gap-2 text-center max-sm:px-10 sm:text-left'");
    // The close button is still the 44px control at top-4 right-4 the reserve is sized for.
    expect(dialog).toContain("absolute top-4 right-4");
  });

  it("stacks the PDF dialog's plan link under its copy below sm", () => {
    const pdf = read("components/investcalc/pdf-purchase-dialog.tsx");
    expect(pdf).toMatch(/className="group relative flex flex-col items-start gap-3 [^"]* sm:flex-row sm:justify-between"/);
  });
});

describe("result rows, hints and links (P2-61, P2-68, P2-155)", () => {
  it("lets a Go deeper summary take two lines instead of truncating its caveat", () => {
    const row = read("components/investcalc/drill-row.tsx");
    const summary = row.slice(row.indexOf("{summary ? ("), row.indexOf("<ChevronDown"));
    expect(summary).toContain("line-clamp-2");
    expect(summary).not.toMatch(/\btruncate\b/);
  });

  it("sets the '(all % of rent)' hint in full muted ink", () => {
    const expenses = read("components/investcalc/operating-expenses-section.tsx");
    const hint = expenses.slice(expenses.indexOf("(all % of rent)") - 120, expenses.indexOf("(all % of rent)"));
    expect(hint).toContain('className="text-xs text-muted-foreground self-center"');
    expect(hint).not.toContain("text-muted-foreground/");
  });

  it("gives both locked-state links a 44px target", () => {
    const compare = read("components/investcalc/mortgage-scenario-compare.tsx");
    const teaser = compare.slice(compare.indexOf("if (!isPro) {"), compare.indexOf("if (!open) {"));
    expect(teaser).toContain('className="inline-flex min-h-11 items-center justify-center');
    expect(teaser).not.toMatch(/className="[^"]*\bh-8\b/);
    const gate = read("components/investcalc/pro-inline-gate.tsx");
    expect(gate).toContain('className="group mt-4 inline-flex min-h-11 items-center gap-1.5');
  });
});

describe("focus follows the surface that replaced the pressed button (P2-69)", () => {
  it("moves into the edit banner on Edit assumptions and back to the results on Done editing", () => {
    const page = read("components/investcalc/investcalc-page.tsx");
    const edit = page.slice(page.indexOf("onEditAssumptions={() => {"), page.indexOf("onReviewVerificationInput="));
    expect(edit).toContain('[data-editing-assumptions-banner="true"]');
    expect(edit).toContain("?.focus({ preventScroll: true });");
    expect(page).toMatch(/data-editing-assumptions-banner="true"\s+tabIndex=\{-1\}/);
    const done = page.slice(page.indexOf("const handleBackToResult = useCallback"), page.indexOf("const handleInputTabClick"));
    expect(done).toContain(`.querySelector<HTMLElement>("[data-analysis-results='true']")`);
    expect(done).toContain("?.focus({ preventScroll: true });");
  });

  it("moves into the financing comparison when it opens and back to its trigger when it closes", () => {
    const compare = read("components/investcalc/mortgage-scenario-compare.tsx");
    expect(compare).toContain("if (open) panelRef.current?.focus({ preventScroll: true });");
    expect(compare).toContain("else triggerRef.current?.focus();");
    expect(compare).toContain("ref={triggerRef}");
    expect(compare).toMatch(/ref=\{panelRef\}[\s\S]{0,160}tabIndex=\{-1\}/);
    // Both buttons go through the function that arms the focus move.
    expect(compare.split("changeOpen(")).toHaveLength(3);
    expect(compare).not.toMatch(/onClick=\{\(\) => setOpen\(/);
  });
});

describe("reduced motion reaches the charts and the last two scripted scrolls (P2-70)", () => {
  const chartFiles = [
    "components/investcalc/ten-year-projections/charts.tsx",
    "components/investcalc/tax-strategy/charts.tsx",
    "components/investcalc/exit-scenarios/charts.tsx",
  ];

  it.each(chartFiles)("tells every Bar, Line and Area in %s whether to animate", (file) => {
    const source = read(file);
    const marks = source.match(/<(?:Bar|Line|Area)[\s\n]/g) ?? [];
    expect(marks.length).toBeGreaterThan(0);
    expect(source.match(/isAnimationActive=\{animate\}/g) ?? []).toHaveLength(marks.length);
    expect(source).toContain("const animate = !usePrefersReducedMotion();");
  });

  it("leaves no literal smooth scroll in the analyzer components", () => {
    for (const file of [
      "components/investcalc/compare-deals-client.tsx",
      "components/investcalc/strategy-outcome-card.tsx",
    ]) {
      const source = read(file);
      expect(source, file).not.toMatch(/behavior:\s*["']smooth["']/);
      expect(source, file).toContain("behavior: scrollBehavior()");
    }
  });
});

describe("accessible names on the result and the sample button (P2-73)", () => {
  it("gives each labelled result container a group role", () => {
    const summary = read("components/investcalc/focused-decision-summary.tsx");
    for (const label of [
      "First-year investment snapshot",
      "Primary result actions",
      "Secondary first-year metrics",
      "Secondary result actions",
    ]) {
      expect(summary, label).toMatch(new RegExp(`role="group"\\s+aria-label="${label}"`));
    }
  });

  it("names the sample button by its visible text", () => {
    const page = read("components/investcalc/investcalc-page.tsx");
    const button = page.slice(
      page.indexOf("onClick={handleTrySampleDeal}\n              //"),
      page.indexOf("Preview a sample Pro report"),
    );
    expect(button).toContain("Try a sample rental");
    expect(button).not.toContain("aria-label=");
  });
});

describe("guidance hints open on a tap (P2-76)", () => {
  it("controls the expense guidance tooltips with the tap hook", () => {
    const expenses = read("components/investcalc/operating-expenses-section.tsx");
    const help = expenses.slice(expenses.indexOf("function FieldHelpTooltip"), expenses.indexOf("function FieldLabel"));
    expect(help).toContain("const tip = useTapTooltip();");
    expect(help).toContain("open={tip.open} onOpenChange={tip.onOpenChange}");
    expect(help).toContain("{...tip.triggerProps}");
    const interest = expenses.slice(expenses.indexOf('htmlFor="include-interest-deduction"'));
    expect(interest).toContain("{...interestHelp.triggerProps}");
    // No uncontrolled tooltip is left in the file.
    expect(expenses).not.toMatch(/<Tooltip delayDuration=\{150\}>/);
  });

  it("stops Radix's close-on-click and toggles from the state at pointerdown", () => {
    const hook = read("components/investcalc/use-tap-tooltip.ts");
    expect(hook).toContain("event.preventDefault();");
    expect(hook).toContain("openAtPointerDown.current = open;");
    expect(hook).toContain("setOpen(!openAtPointerDown.current);");
  });

  it("makes a summary card's label hint a focusable control", () => {
    const grid = read("components/investcalc/analysis-panels/shared/summary-card-grid.tsx");
    expect(grid).toContain('role="button"');
    expect(grid).toContain("tabIndex={0}");
    expect(grid).toContain("{...tip.triggerProps}");
    expect(grid).toContain("{...tip.keyboardProps}");
  });
});

describe("the confidence card points to nothing that is not there (P2-27)", () => {
  it("says which assumptions are outside the score without naming strategy panels", () => {
    const card = read("components/investcalc/input-confidence-card.tsx");
    expect(card).not.toMatch(/strategy\s+panels/);
    expect(card).toMatch(/flip assumptions are outside this score\./);
    expect(card).toContain("flip assumptions are outside this base score.`}");
  });
});

describe("wide result tables say they scroll (P2-153)", () => {
  it("passes the cue and the pinned first column on all three tables", () => {
    const projections = read("components/investcalc/ten-year-projections/table.tsx");
    expect(projections).toMatch(/<ScrollX\s+label="Table"\s+cue\s+stickyFirstColumn\s+className="overflow-x-auto rounded-2xl border border-border bg-card"/);
    const amortization = read("components/investcalc/loan-amortization-view.tsx");
    expect(amortization).toMatch(/<ScrollX\s+label="Table"\s+cue\s+stickyFirstColumn/);
    const confidence = read("components/investcalc/input-confidence-card.tsx");
    expect(confidence.match(/<ScrollX label="Input confidence table" cue stickyFirstColumn /g)).toHaveLength(2);
  });
});

describe("the cash-flow strip keeps a four-digit figure inside its card (P2-154)", () => {
  it("sizes the three figures off the card's own width", () => {
    const dashboard = read("components/investcalc/analysis-dashboard.tsx");
    const strip = dashboard.slice(
      dashboard.indexOf("function CashFlowOverTimeStrip"),
      dashboard.indexOf("// NetCashFlowCard was deleted"),
    );
    expect(strip).toContain('className="@container rounded-2xl border border-border bg-card p-4 sm:p-5"');
    expect(strip).toContain("@max-[14.5rem]:grid-cols-1");
    expect(strip).toContain("@max-[21rem]:text-sm");
    expect(strip).toContain("@max-[21rem]:px-1.5");
    expect(strip).toContain("[overflow-wrap:anywhere]");
    expect(strip).not.toContain("min-[280px]:grid-cols-3");
  });
});

describe("toasts stay off the phone header and the cookie banner (P2-157)", () => {
  it("starts the viewport under the header on phones", () => {
    const toast = read("components/ui/toast.tsx");
    expect(toast).toContain("'fixed top-14 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-5");
    expect(toast).not.toContain("fixed top-0 z-[100]");
  });

  it("lifts it above the cookie banner from sm while the banner is up", () => {
    const toaster = read("components/ui/toaster.tsx");
    expect(toaster).toContain("const cookieBannerOpen = useCookieBannerOpen()");
    expect(toaster).toContain("<ToastViewport className={cookieBannerOpen ? 'sm:bottom-24' : undefined} />");
  });
});
