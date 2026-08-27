import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { SAMPLE_DEAL_FIXTURE } from "../lib/sample-deal";

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1280, height: 900 },
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.documentWidth).toBeLessThanOrEqual(
    overflow.viewportWidth + 1,
  );
}

async function expectNoSeriousAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter(
    (violation) =>
      violation.impact === "critical" || violation.impact === "serious",
  );
  expect(blocking).toEqual([]);
}

async function expectMinimumTouchTarget(locator: Locator, minimum = 44) {
  const box = await locator.boundingBox();
  expect(
    box,
    "The meaningful control must have a rendered hit area",
  ).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(minimum);
  expect(box!.height).toBeGreaterThanOrEqual(minimum);
}

async function expectContainedInViewport(
  page: Page,
  locator: Locator,
  minimumUsableWidth = 100,
) {
  const box = await locator.boundingBox();
  expect(box, "The control must have a rendered box").not.toBeNull();
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth + 1);
  expect(box!.width).toBeGreaterThanOrEqual(minimumUsableWidth);
}

async function waitForCalculatorReady(page: Page) {
  await expect(
    page.locator('form[data-calc-form="true"][data-calculator-ready="true"]'),
  ).toBeAttached({ timeout: 20_000 });
}

for (const viewport of VIEWPORTS) {
  test(`homepage is usable without horizontal overflow at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.evaluate(() => {
      document.body.style.zoom = "2";
    });
    await expectNoHorizontalOverflow(page);
  });
}

test("calculator inputs reflow at a 195 CSS-pixel effective viewport", async ({
  page,
}) => {
  // A 390px-wide viewport at 200% browser zoom has roughly 195 CSS pixels
  // available. Bounding-box checks catch clipped controls even when a global
  // overflow rule keeps document.scrollWidth from reporting the clipping.
  await page.setViewportSize({ width: 195, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForCalculatorReady(page);

  const address = page.getByLabel("Property Address", { exact: true });
  const price = page.getByLabel("Price to analyze", { exact: true });
  const bedrooms = page.getByLabel("Bedrooms (optional)", { exact: true });
  const rent = page.getByLabel("Expected gross monthly rent", { exact: true });
  for (const field of [address, price, bedrooms, rent]) {
    await expect(field).toBeVisible();
    await expectContainedInViewport(page, field);
    await expectMinimumTouchTarget(field);
  }

  await price.fill("215000");
  await rent.fill("1550");
  const livePreview = page.locator("[data-live-verdict]");
  await expect(livePreview).toBeVisible();
  await expectContainedInViewport(page, livePreview, 80);
  await expectNoHorizontalOverflow(page);

  const listingLink = page.getByRole("button", {
    name: "Use a listing link to fill the address",
  });
  await expectContainedInViewport(page, listingLink, 44);
  await expectMinimumTouchTarget(listingLink);

  // The assumptions chip must open BOTH disclosure layers and land keyboard
  // focus on the exact editable field, rather than scrolling to a collapsed
  // Operating Expenses card.
  const vacancyChip = page.getByRole("button", {
    name: /Vacancy 5% of rent TrueCap default/i,
  });
  await vacancyChip.click();
  const downPaymentInput = page.getByLabel("Down Payment %", { exact: true });
  await expect(downPaymentInput).toBeVisible();
  await expectContainedInViewport(page, downPaymentInput, 80);
  await expectMinimumTouchTarget(downPaymentInput);

  const vacancyInput = page.getByLabel("Vacancy %", { exact: true });
  await expect(vacancyInput).toBeVisible();
  await expect(vacancyInput).toBeFocused();
  await expectContainedInViewport(page, vacancyInput, 80);
  await expectMinimumTouchTarget(vacancyInput);
  await expect(
    page.getByRole("button", { name: "Vacancy % guidance", exact: true }),
  ).toBeVisible();
});

test("a hidden expense validation error reopens both panels and focuses the field", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForCalculatorReady(page);

  const addressInput = page.getByLabel("Property Address", { exact: true });
  await addressInput.fill(SAMPLE_DEAL_FIXTURE.values.address);
  await expect(addressInput).toHaveValue(SAMPLE_DEAL_FIXTURE.values.address);
  await page.getByLabel("Price to analyze", { exact: true }).fill("215000");
  await page
    .getByLabel("Expected gross monthly rent", { exact: true })
    .fill("1550");

  await page
    .getByRole("button", { name: /Vacancy 5% of rent TrueCap default/i })
    .click();
  const vacancyInput = page.getByLabel("Vacancy %", { exact: true });
  await vacancyInput.fill("51");
  await page
    .locator("#step-expenses")
    .getByRole("button", { name: "Hide Advanced Options", exact: true })
    .click();
  await page.getByRole("button", { name: "Hide details", exact: true }).click();
  await expect(vacancyInput).toBeHidden();

  await page.locator("form[data-calc-form='true']").evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
  });

  await expect(vacancyInput).toBeVisible();
  await expect(vacancyInput).toBeFocused();
  await expect(page.locator("#vacancyPct-error")).toBeVisible();
});

test("specialist strategy framing stays visible and usable at 200% mobile zoom", async ({
  page,
}) => {
  await page.setViewportSize({ width: 195, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForCalculatorReady(page);

  const changeType = page.getByRole("button", {
    name: "Change analysis type. Current: Buy & Hold",
  });
  await expectContainedInViewport(page, changeType, 44);
  await expectMinimumTouchTarget(changeType);
  await changeType.click();

  const chooser = page.getByRole("region", { name: "Choose analysis type" });
  const brrrr = chooser.getByRole("button", {
    name: /BRRRR Buy, rehab, rent, refi/i,
  });
  await expectContainedInViewport(page, brrrr, 80);
  await expectMinimumTouchTarget(brrrr);
  await brrrr.click();

  const warning = page.getByRole("note");
  await expect(warning).toContainText("BRRRR mode");
  await expect(warning).toContainText("Verify independently");
  await expectContainedInViewport(page, warning, 80);
  await expect(
    page.locator('button[data-inform-submit="true"]'),
  ).toHaveAccessibleName(/Screen rental baseline free/i);
});

test("a restored advanced-strategy draft keeps its analysis identity", async ({
  page,
}) => {
  await page.addInitScript(
    ({ values }) => {
      window.localStorage.setItem(
        "truecap_calc_form_draft_v1",
        JSON.stringify({
          ...values,
          __truecapAnalyzerStrategyKey: "brrrr",
        }),
      );
    },
    { values: SAMPLE_DEAL_FIXTURE.values },
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForCalculatorReady(page);

  await expect(
    page.getByRole("heading", { level: 2, name: "BRRRR Underwriting" }),
  ).toBeVisible();
  await expect(
    page.getByText("Draft restored from this browser"),
  ).toBeVisible();
  await expect(page.getByRole("note")).toContainText("BRRRR mode");
  await expect(
    page.locator('button[data-inform-submit="true"]'),
  ).toHaveAccessibleName(/Screen rental baseline free/i);
});

test("a legacy synthetic sample draft cannot replace the investor's next deal", async ({
  page,
}) => {
  await page.addInitScript(
    ({ values }) => {
      const legacyValues = { ...values } as Record<string, unknown>;
      // The v1 synthetic fixture predates the pinned audit date. This exact
      // hidden-field drift caused the whole-form equality guard to miss the
      // disposable demo during the production smoke test.
      delete legacyValues.analysisDate;
      window.localStorage.setItem(
        "truecap_calc_form_draft_v1",
        JSON.stringify({
          ...legacyValues,
          __truecapAnalyzerStrategyKey: "buy-hold",
        }),
      );
    },
    { values: SAMPLE_DEAL_FIXTURE.values },
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForCalculatorReady(page);

  await expect(page.getByLabel("Property Address", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    page.getByText("Draft restored from this browser"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Try a sample deal", exact: true }),
  ).toBeVisible();
});

test("switching tax and insurance modes cannot strand an invalid hidden value", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForCalculatorReady(page);

  await page
    .getByRole("button", {
      name: /Taxes 1\.1% of price\/year TrueCap default/i,
    })
    .click();

  const taxModes = page.getByRole("group", { name: "Property tax input mode" });
  await taxModes.getByRole("button", { name: "Annual $", exact: true }).click();
  const annualTax = page.getByLabel("Property Tax (Annual $)", { exact: true });
  await annualTax.fill("1000001");
  await taxModes.getByRole("button", { name: "Annual %", exact: true }).click();
  await taxModes.getByRole("button", { name: "Annual $", exact: true }).click();
  await expect(annualTax).toHaveValue("");

  const insuranceModes = page.getByRole("group", {
    name: "Insurance input mode",
  });
  await insuranceModes
    .getByRole("button", { name: "Monthly $", exact: true })
    .click();
  const monthlyInsurance = page.getByLabel("Insurance (Monthly $)", {
    exact: true,
  });
  await monthlyInsurance.fill("1000001");
  await insuranceModes
    .getByRole("button", { name: "Annual %", exact: true })
    .click();
  await insuranceModes
    .getByRole("button", { name: "Monthly $", exact: true })
    .click();
  await expect(monthlyInsurance).toHaveValue("");

  const deductionSwitch = page.getByRole("switch", {
    name: "Include interest deduction in estimated tax savings",
  });
  await expectMinimumTouchTarget(deductionSwitch);
});

test("anonymous sample reaches the decision-first result with one click", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const acceptCookies = page.getByRole("button", { name: /accept all/i });
  if (await acceptCookies.isVisible()) await acceptCookies.click();
  const sampleButton = page.getByRole("button", {
    name: /view a sample decision/i,
  });
  await expect(sampleButton).toBeEnabled({ timeout: 20_000 });
  await sampleButton.click();

  const decision = page.locator("#decision-summary-title");
  await expect(decision).toBeVisible({ timeout: 20_000 });
  const summary = page.locator(
    "section[aria-labelledby='decision-summary-title']",
  );
  await expect(
    summary.getByText(SAMPLE_DEAL_FIXTURE.values.address, { exact: true }),
  ).toBeVisible();
  await expect(
    summary.getByText("Offer Ceiling", { exact: true }),
  ).toBeVisible();
  await expect(summary.getByText(/cash flow after reserve/i)).toBeVisible();
  await expect(summary.getByText("Model DSCR", { exact: true })).toBeVisible();
  const tuneTargets = summary.getByRole("button", { name: /tune targets/i });
  const save = summary.getByRole("button", { name: /^save/i });
  const share = summary.getByRole("button", { name: /^share/i });
  for (const action of [tuneTargets, save, share]) {
    await expect(action).toBeVisible();
    await expectMinimumTouchTarget(action);
  }

  // Move away and back with the keyboard so this proves a real focus-visible
  // state rather than only checking that JavaScript can call element.focus().
  await save.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(save).toBeFocused();
  const focusStyle = await save.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      focusVisible: element.matches(":focus-visible"),
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      boxShadow: style.boxShadow,
    };
  });
  expect(focusStyle.focusVisible).toBe(true);
  expect(
    (focusStyle.outlineStyle !== "none" && focusStyle.outlineWidth >= 2) ||
      focusStyle.boxShadow !== "none",
  ).toBe(true);

  const decisionDetails = page
    .locator("summary")
    .filter({ hasText: "Decision context and key numbers" });
  const decisionDisclosure = decisionDetails.locator("..");
  await expect(decisionDetails).toBeVisible();
  await expect
    .poll(() =>
      decisionDisclosure.evaluate((element) => element.hasAttribute("open")),
    )
    .toBe(false);
  await decisionDetails.focus();
  await page.keyboard.press("Enter");
  await expect
    .poll(() =>
      decisionDisclosure.evaluate((element) => element.hasAttribute("open")),
    )
    .toBe(true);

  await expectNoSeriousAccessibilityViolations(page);
  await expectNoHorizontalOverflow(page);
});

test("public homepage and pricing have no serious WCAG 2.1 AA violations", async ({
  page,
}) => {
  for (const path of ["/", "/pricing"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoSeriousAccessibilityViolations(page);
  }
});

test("a deep protected destination survives the login handoff", async ({
  page,
}) => {
  const next = "/dashboard/compare?ids=deal-a,deal-b";
  await page.goto(`/auth/login?next=${encodeURIComponent(next)}`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page).toHaveURL(new RegExp(`next=${encodeURIComponent(next)}`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Welcome back" }),
  ).toBeVisible();
});
