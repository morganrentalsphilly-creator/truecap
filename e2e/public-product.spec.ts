import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { SAMPLE_DEAL_FIXTURE } from "../lib/sample-deal";
import { EMBEDDABLE_CALCULATORS } from "../lib/calculator-registry";

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

test("every advertised embed and attribution destination is reachable", async ({
  page,
  request,
}) => {
  for (const calculator of EMBEDDABLE_CALCULATORS) {
    const response = await page.goto(`/embed/${calculator.slug}`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status(), calculator.slug).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      calculator.title,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );

    const cta = page.getByRole("link", {
      name: "Underwrite a full property in TrueCap",
    });
    await expect(cta).toHaveAttribute("href", /utm_source=embed/);
    const href = await cta.getAttribute("href");
    expect(href).not.toBeNull();
    const attribution = new URL(href!);
    expect(attribution.pathname).toBe(`/tools/${calculator.slug}`);
    expect(Object.fromEntries(attribution.searchParams)).toEqual({
      utm_source: "embed",
      utm_medium: "referral",
      utm_campaign: calculator.slug,
    });
    // The rendered href must remain the literal public attribution URL above,
    // while reachability is checked against the Playwright target. This keeps
    // local/preview verification off the live site and still proves the exact
    // destination path is served by the candidate build.
    expect(
      (
        await request.get(`${attribution.pathname}${attribution.search}`)
      ).status(),
    ).toBe(200);
  }
});

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

test("mobile hero leads with the decision outcome and keeps empty submissions at the field", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const hero = page.locator(".truecap-marketing-shell");
  await expect(
    hero.getByRole("heading", {
      level: 1,
      name: "Know your walk-away price before you make the offer.",
    }),
  ).toBeVisible();
  await expect(
    hero.getByText(
      "No account or card. Your first complete Offer Ceiling is included.",
      { exact: true },
    ),
  ).toBeVisible();

  const form = hero.locator('form[data-hero-address-form=""]');
  const address = form.getByLabel("Property address", { exact: true });
  await expect(address).toHaveAttribute("aria-required", "true");
  // Two distinct no-address paths, deliberately. The BUTTON runs the sample in
  // place (the journey the authenticated guest specs drive); the LINK is the
  // only internal link to /sample-decision-memo, which is in the sitemap and
  // would otherwise be orphaned.
  await expect(
    hero.getByRole("button", { name: "View a sample decision →", exact: true }),
  ).toHaveCount(1);
  await expect(
    hero.getByRole("link", { name: "Read the written memo", exact: true }),
  ).toHaveCount(1);

  const scrollBefore = await page.evaluate(() => window.scrollY);
  await form
    .getByRole("button", { name: "Analyze a deal free", exact: true })
    .click();
  await expect(
    form.getByRole("alert").filter({
      hasText: "Enter a property address to analyze this deal.",
    }),
  ).toBeVisible();
  await expect(address).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBe(scrollBefore);

  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("homepage sample preview keeps its reading order at zoom-sensitive widths", async ({
  page,
}) => {
  for (const width of [195, 640, 768, 1023]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const card = page.locator('[data-hero-sample-card=""]');
    const property = page.locator('[data-hero-sample-property=""]');
    const status = page.locator('[data-hero-sample-status=""]');
    const offer = page.locator('[data-hero-sample-offer=""]');
    for (const element of [card, property, status, offer]) {
      await expect(element).toBeVisible();
      await expectContainedInViewport(page, element, 100);
    }

    const propertyBox = await property.boundingBox();
    const statusBox = await status.boundingBox();
    expect(propertyBox).not.toBeNull();
    expect(statusBox).not.toBeNull();
    expect(propertyBox!.y + propertyBox!.height).toBeLessThanOrEqual(
      statusBox!.y + 1,
    );

    const textOverflow = await property.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(textOverflow.scrollWidth).toBeLessThanOrEqual(
      textOverflow.clientWidth + 1,
    );
  }
});

test("the marketing prompt yields while the investor is using the calculator", async ({
  page,
}) => {
  await page.setViewportSize({ width: 643, height: 732 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const rejectCookies = page.getByRole("button", {
    name: "Reject",
    exact: true,
  });
  await expect(rejectCookies).toBeVisible();
  await rejectCookies.click();

  const conversionBar = page.locator("[data-conversion-bar-root]");
  await page.evaluate(() => window.scrollTo(0, 900));
  await expect(conversionBar).toBeVisible();

  const calculator = page.locator('form[data-calc-form="true"]');
  await calculator.scrollIntoViewIfNeeded();
  await expect(calculator).toBeVisible();
  await expect(conversionBar).toBeHidden();
});

test("tablet investors keep one reachable analysis action below the desktop cockpit", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 800 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForCalculatorReady(page);

  const form = page.locator('form[data-calc-form="true"]');
  const inFormAction = page.locator('[data-inform-submit="true"]');
  const stickyAction = page.locator('[data-sticky-calc-bar=""]');

  for (const width of [768, 1023]) {
    await page.setViewportSize({ width, height: 800 });
    await page.evaluate(() => window.scrollTo(0, 0));

    // Stop just before the in-form action enters the viewport. This is the
    // long tablet-form gap where the fixed action must remain available.
    await page.evaluate(() => {
      const submit = document.querySelector('[data-inform-submit="true"]');
      if (!(submit instanceof HTMLElement)) {
        throw new Error("Missing in-form analysis action");
      }
      const submitTop = submit.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.max(601, submitTop - window.innerHeight - 80));
    });

    await expect(form).toBeInViewport();
    await expect(inFormAction).not.toBeInViewport();
    await expect(stickyAction).toBeVisible();
    await expectMinimumTouchTarget(stickyAction.getByRole("button"));

    // The observer retires the fixed action as soon as its in-form equivalent
    // is visible, so extending it to tablets never produces duplicate CTAs.
    await inFormAction.scrollIntoViewIfNeeded();
    await expect(inFormAction).toBeVisible();
    await expect(stickyAction).toBeHidden();
  }
});

test("desktop investors can run from the live preview without hunting below the form", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForCalculatorReady(page);

  const form = page.locator('form[data-calc-form="true"]');
  const desktopAction = page.locator('[data-desktop-run-action="true"]');
  const inFormAction = page.locator('[data-inform-submit="true"]');

  // A form taller than the viewport has no single "in view" position, so
  // scrollIntoViewIfNeeded() may align its bottom and immediately retire the
  // cockpit action. Pin the start of the underwriting form below the sticky
  // header to exercise the actual desktop entry state deterministically.
  await form.evaluate((element) => {
    const top = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.max(0, top - 96));
  });

  await expect(desktopAction).toBeVisible();
  await expectMinimumTouchTarget(desktopAction);
  await expect(desktopAction).toHaveAccessibleName(/analy|sample/i);

  // A first-visit consent banner must not trick the cockpit into retiring
  // while the canonical action is geometrically intersecting but covered.
  const cookieConsent = page.getByRole("dialog", { name: "Cookie consent" });
  await expect(cookieConsent).toBeVisible();
  await inFormAction.evaluate((element) => {
    const banner = document.querySelector<HTMLElement>(
      '[role="dialog"][aria-label="Cookie consent"]',
    );
    if (!banner) throw new Error("Missing cookie consent banner");
    const submitTop = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, submitTop - banner.getBoundingClientRect().top - 8);
  });
  await expect(inFormAction).toBeVisible();
  await expect(desktopAction).toBeVisible();

  // Once the obstruction is gone and the canonical CTA is comfortably in
  // view, the duplicate cockpit action retires.
  await cookieConsent
    .getByRole("button", { name: "Reject", exact: true })
    .click();
  await inFormAction.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  await expect(desktopAction).toBeHidden();
});

test("a second listing can never inherit the first property's price and rent", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForCalculatorReady(page);

  const form = page.locator('form[data-calc-form="true"]');
  await form.scrollIntoViewIfNeeded();
  const address = form.getByLabel("Property Address", { exact: true });
  const price = form.getByLabel("Price to analyze", { exact: true });
  const rent = form.getByLabel("Expected gross monthly rent", { exact: true });
  await address.fill("2560 Collins St, Philadelphia, PA 19125, USA");
  await price.fill("215000");
  await rent.fill("1550");

  const listingUrl =
    "https://www.zillow.com/homedetails/909-New-Deal-St-Philadelphia-PA-19140/123456_zpid/";
  const openListingInput = form.getByRole("button", {
    name: "Use a listing link to fill the address",
    exact: true,
  });
  await openListingInput.click();
  await form
    .getByLabel("Paste a listing link", { exact: true })
    .fill(listingUrl);
  const firstDialogPromise = page.waitForEvent("dialog");
  const firstSubmitPromise = form
    .getByRole("button", { name: "Use address from link", exact: true })
    .click();
  const firstDialog = await firstDialogPromise;
  expect(firstDialog.message()).toContain(
    "clear the previous property’s price",
  );
  await firstDialog.dismiss();
  await firstSubmitPromise;
  await expect(address).toHaveValue(
    "2560 Collins St, Philadelphia, PA 19125, USA",
  );
  await expect(price).toHaveValue("215,000");
  await expect(rent).toHaveValue("1,550");

  await openListingInput.click();
  await form
    .getByLabel("Paste a listing link", { exact: true })
    .fill(listingUrl);
  const secondDialogPromise = page.waitForEvent("dialog");
  const secondSubmitPromise = form
    .getByRole("button", { name: "Use address from link", exact: true })
    .click();
  const secondDialog = await secondDialogPromise;
  await secondDialog.accept();
  await secondSubmitPromise;
  await expect(address).toHaveValue(/909 New Deal St Philadelphia PA 19140/i);
  await expect(price).not.toHaveValue("215,000");
  await expect(rent).not.toHaveValue("1,550");
});

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

test("release-gated specialist strategies stay dark at 200% mobile zoom", async ({
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
  await expectContainedInViewport(page, chooser, 80);

  // The unfinished BRRRR and flip models must not be discoverable or
  // materializable through the public analyzer. Keep exercising a released
  // advanced option so this also protects the zoom-sensitive chooser layout.
  await expect(
    chooser.getByRole("button", {
      name: /BRRRR Buy, rehab, rent, refi/i,
    }),
  ).toHaveCount(0);
  await expect(
    chooser.getByRole("button", {
      name: /Fix & Flip Rehab and resell/i,
    }),
  ).toHaveCount(0);

  const shortTerm = chooser.getByRole("button", {
    name: /Short-term Rental Nightly \/ STR/i,
  });
  await expectContainedInViewport(page, shortTerm, 80);
  await expectMinimumTouchTarget(shortTerm);
  await shortTerm.click();
  const confirmation = chooser.getByRole("region", {
    name: "Switch to Short-term Rental?",
  });
  const keepAssumptions = confirmation.getByRole("button", {
    name: /Keep my assumptions/i,
  });
  await expectContainedInViewport(page, keepAssumptions, 80);
  await expectMinimumTouchTarget(keepAssumptions);
  await keepAssumptions.click();

  const warning = page.getByRole("note");
  await expect(warning).toContainText("Short-term Rental mode");
  await expect(warning).toContainText("Verify independently");
  await expectContainedInViewport(page, warning, 80);
  await expectNoHorizontalOverflow(page);
});

test("a restored dark-strategy draft falls back safely to Buy & Hold", async ({
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
    page.getByRole("heading", {
      level: 2,
      name: "Underwrite a Buy & Hold Rental",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Draft restored from this browser"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Change analysis type. Current: Buy & Hold",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("note").filter({ hasText: "BRRRR mode" }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Property Address", { exact: true }),
  ).toHaveValue(SAMPLE_DEAL_FIXTURE.values.address);
  await expect(
    page.locator('button[data-inform-submit="true"]'),
  ).toHaveAccessibleName(/Calculate my Offer Ceiling/i);

  await page
    .getByRole("button", {
      name: "Change analysis type. Current: Buy & Hold",
    })
    .click();
  const chooser = page.getByRole("region", { name: "Choose analysis type" });
  await expect(
    chooser.getByRole("button", {
      name: /BRRRR Buy, rehab, rent, refi/i,
    }),
  ).toHaveCount(0);
  await expect(
    chooser.getByRole("button", { name: /Fix & Flip Rehab and resell/i }),
  ).toHaveCount(0);
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

  await expect(
    page.getByLabel("Property Address", { exact: true }),
  ).toHaveValue("");
  await expect(page.getByText("Draft restored from this browser")).toHaveCount(
    0,
  );
  const freshDealAction = page.locator('button[data-inform-submit="true"]');
  await expect(freshDealAction).toBeVisible();
  await expect(freshDealAction).toHaveAccessibleName(
    "Analyze deal & calculate ceiling",
  );
  await expect(
    page.getByRole("button", {
      name: "Try a synthetic sample rental and preview a sample Pro report",
      exact: true,
    }),
  ).toBeVisible();
});

test("released operating tax and insurance modes cannot strand an invalid hidden value", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForCalculatorReady(page);

  await page
    .getByRole("button", {
      // Property tax is labeled a PRELIMINARY FALLBACK with a "verify locally"
      // badge — released underwriting never auto-fills a parcel bill.
      name: /Taxes 1\.1% preliminary fallback verify locally/i,
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

  // Property tax and insurance remain released operating-expense inputs. The
  // separate income-tax deduction model is dark-launched, so this regression
  // must not require (or accidentally re-expose) its retired public control.
  await expect(
    page.getByRole("switch", {
      name: "Include interest deduction in estimated tax savings",
    }),
  ).toHaveCount(0);
});

test("anonymous sample reaches the decision-first result with one click", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const acceptCookies = page.getByRole("button", { name: /accept all/i });
  await expect(acceptCookies).toBeVisible();
  await acceptCookies.click();
  const sampleButton = page.getByRole("button", {
    name: "Try a synthetic sample rental and preview a sample Pro report",
    exact: true,
  });
  await expect(sampleButton).toBeEnabled({ timeout: 20_000 });
  await sampleButton.click();

  const decision = page.locator("#decision-summary-title");
  await expect(decision).toBeVisible({ timeout: 20_000 });
  const summary = page.locator(
    "section[aria-labelledby='decision-summary-title']",
  );
  await expect(
    summary.getByText(SAMPLE_DEAL_FIXTURE.display.shortAddress, {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    summary.getByText("Offer Ceiling", { exact: true }),
  ).toBeVisible();
  await expect(summary.getByText(/cash flow after reserve/i)).toBeVisible();
  await expect(summary.getByText("Model DSCR", { exact: true })).toBeVisible();
  const tuneTargets = summary.getByRole("button", { name: /tune criteria/i });
  const save = summary.getByRole("button", { name: /^save/i });
  const nextDeal = summary.getByRole("button", {
    name: "Next deal · keep assumptions",
    exact: true,
  });
  for (const action of [tuneTargets, save, nextDeal]) {
    await expect(action).toBeVisible();
    await expectMinimumTouchTarget(action);
  }
  expect(
    await nextDeal.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
    "The long next-deal label must wrap inside its mobile button",
  ).toBe(true);
  await expect(summary.locator('[data-result-next-action=""]')).toBeVisible();
  await expect(page.locator("[data-marketing-mobile-nav]")).toBeHidden();
  const primaryActions = summary.locator(
    '[aria-label="Primary result actions"]',
  );
  const primaryActionsBox = await primaryActions.boundingBox();
  expect(primaryActionsBox).not.toBeNull();
  expect(primaryActionsBox!.y + primaryActionsBox!.height).toBeLessThanOrEqual(
    844,
  );

  // Tuning stays anchored to the action that opened it. The first editable
  // criterion receives focus, and Apply/Cancel remain reachable while the
  // longer phone editor scrolls.
  await tuneTargets.click();
  const criteriaEditor = summary.locator('[data-offer-criteria-editor=""]');
  await expect(criteriaEditor).toBeVisible();
  const firstCriterion = criteriaEditor
    .locator("input:not([disabled])")
    .first();
  await expect(firstCriterion).toBeFocused();
  const criteriaActions = criteriaEditor.locator(
    '[data-offer-criteria-actions=""]',
  );
  await expect(criteriaActions).toBeVisible();
  const cancelCriteria = criteriaActions.getByRole("button", {
    name: "Cancel",
  });
  await expectMinimumTouchTarget(cancelCriteria);
  await expectNoHorizontalOverflow(page);
  await cancelCriteria.click();
  await expect(criteriaEditor).toBeHidden();

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

  const moreActions = summary
    .locator("summary")
    .filter({ hasText: "More actions" });
  await moreActions.click();
  const share = summary.getByRole("button", { name: /^share/i });
  await expect(share).toBeVisible();
  await expectMinimumTouchTarget(share);

  // The public report gate is a real modal: keyboard focus must enter it,
  // remain inside while tabbing, and return to the exact trigger on Escape.
  const exportPdf = summary.getByRole("button", {
    name: "Export PDF",
    exact: true,
  });
  await exportPdf.click();
  const reportDialog = page.getByRole("dialog", {
    name: "PDF reports are included with Pro",
  });
  await expect(reportDialog).toBeVisible();
  await expect
    .poll(() =>
      reportDialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    )
    .toBe(true);
  for (let step = 0; step < 4; step += 1) {
    await page.keyboard.press("Tab");
    expect(
      await reportDialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(reportDialog).toBeHidden();
  await expect(exportPdf).toBeFocused();

  await expectNoSeriousAccessibilityViolations(page);
  await expectNoHorizontalOverflow(page);
});

test("one real anonymous deal receives an exact decision and bound PDF, then a second deal fails closed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForCalculatorReady(page);

  const runDeal = async (input: {
    address: string;
    price: string;
    rent: string;
  }) => {
    const form = page.locator('form[data-calc-form="true"]');
    await form
      .getByLabel("Property Address", { exact: true })
      .fill(input.address);
    await form
      .getByLabel("Price to analyze", { exact: true })
      .fill(input.price);
    await form
      .getByLabel("Expected gross monthly rent", { exact: true })
      .fill(input.rent);
    await form
      .getByRole("button", {
        name: "Analyze deal & calculate ceiling",
        exact: true,
      })
      .last()
      .click();
    const summary = page.locator(
      "section[aria-labelledby='decision-summary-title']",
    );
    await expect(summary).toBeVisible({ timeout: 20_000 });
    return summary;
  };

  const first = await runDeal({
    address: "100 Grant Test Ave, Columbus, OH 43215",
    price: "250000",
    rent: "2400",
  });
  await expect(first.getByText("Offer Ceiling", { exact: true })).toBeVisible();
  await expect(
    first.getByText("Assumption status", { exact: true }),
  ).toBeAttached();
  await expect(first.locator("[data-result-next-action='']")).toBeVisible();
  const ceilingDetails = first
    .locator("summary")
    .filter({ hasText: "How this ceiling was calculated" });
  await ceilingDetails.click();
  await expect(first.getByText(/Exact ceiling/)).toBeVisible();
  await expect(first.getByText(/^Binding:/)).toBeVisible();
  await expect(first.getByText(/^Screening range:/)).toBeVisible();

  const goDeeper = page
    .locator("details")
    .filter({ hasText: "Go deeper" })
    .first();
  if (!(await goDeeper.evaluate((element) => element.hasAttribute("open")))) {
    await goDeeper.locator("summary").first().click();
  }
  const grantedStressTest = page.locator("[data-drill-row='stress-test']");
  await expect(grantedStressTest).toBeVisible();
  await expect(grantedStressTest.getByText("PRO", { exact: true })).toHaveCount(
    0,
  );
  await grantedStressTest.getByRole("button", { name: /Stress Test/ }).click();
  await expect(
    grantedStressTest.getByText("Sensitivity analysis", { exact: true }),
  ).toBeVisible();

  await first.locator("summary").filter({ hasText: "More actions" }).click();
  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await first.getByRole("button", { name: "Export PDF", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/Investment-Report-\d+\.pdf$/);
  const downloadPath = await download.path();
  expect(
    downloadPath,
    "the browser must receive a real PDF artifact",
  ).not.toBeNull();
  const pdfBytes = readFileSync(downloadPath!);
  expect(pdfBytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  expect(pdfBytes.length).toBeGreaterThan(5_000);

  // Ordinary edit-in-place must revoke browser presentation access before
  // the debounced live recompute. The server cookie remains bound to deal 1,
  // but deal 2's client-computed sensitivity and unsaved-PDF affordance must
  // fail closed without requiring another explicit Run.
  await first.getByRole("button", { name: "Edit assumptions" }).click();
  const editForm = page.locator('form[data-calc-form="true"]');
  await editForm.getByLabel("Price to analyze", { exact: true }).fill("255000");
  await page.getByRole("button", { name: "Done editing" }).click();
  await expect(first).toBeVisible();
  await expect(first.getByText("Asking $255,000", { exact: true })).toBeVisible(
    { timeout: 20_000 },
  );
  await first.locator("summary").filter({ hasText: "More actions" }).click();
  await expect(
    first.getByRole("button", { name: "Export PDF", exact: true }),
  ).toHaveAttribute("title", "PDF reports are included with TrueCap Pro.");
  await first
    .locator("summary")
    .filter({ hasText: "How this ceiling was calculated" })
    .click();
  await expect(first.getByText(/Coarse range preview/)).toBeVisible({
    timeout: 20_000,
  });
  await expect(first.getByText(/Exact ceiling/)).toHaveCount(0);

  const changedGoDeeper = page
    .locator("details")
    .filter({ hasText: "Go deeper" })
    .first();
  if (
    !(await changedGoDeeper.evaluate((element) => element.hasAttribute("open")))
  ) {
    await changedGoDeeper.locator("summary").first().click();
  }
  const changedStressTest = page.locator("[data-drill-row='stress-test']");
  await expect(changedStressTest).toBeVisible();
  await expect(
    changedStressTest.getByText("PRO", { exact: true }),
  ).toBeVisible();
  await changedStressTest.getByRole("button", { name: /Stress Test/ }).click();
  await expect(
    changedStressTest.getByText("Sensitivity analysis", { exact: true }),
  ).toBeVisible();
  await expect(
    changedStressTest.getByText("Rent ±10% scenarios"),
  ).toBeVisible();

  const nextDeal = first.getByRole("button", {
    name: "Next deal · keep assumptions",
    exact: true,
  });
  page.once("dialog", (dialog) => dialog.accept());
  await nextDeal.click();
  const second = await runDeal({
    address: "200 Second Test St, Columbus, OH 43215",
    price: "275000",
    rent: "2450",
  });
  await expect(
    page.getByText("No-signup decision used", { exact: true }),
  ).toBeVisible();
  await second.locator("summary").filter({ hasText: "More actions" }).click();
  await second.getByRole("button", { name: "Export PDF", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "PDF reports are included with Pro" }),
  ).toBeVisible();
});

test("next deal confirms the reset, clears property facts, and keeps reusable assumptions", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForCalculatorReady(page);

  const acceptCookies = page.getByRole("button", { name: /accept all/i });
  if (await acceptCookies.isVisible()) await acceptCookies.click();

  await page
    .getByRole("button", {
      name: "Try a synthetic sample rental and preview a sample Pro report",
      exact: true,
    })
    .click();
  const nextDeal = page.getByRole("button", {
    name: "Next deal · keep assumptions",
    exact: true,
  });
  await expect(nextDeal).toBeVisible({ timeout: 20_000 });

  let confirmationMessage = "";
  page.once("dialog", async (dialog) => {
    confirmationMessage = dialog.message();
    await dialog.accept();
  });
  await nextDeal.click();

  expect(confirmationMessage).toContain("Analyze another property?");
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Buy & Hold Underwriting",
    }),
  ).toBeVisible();
  const address = page.getByLabel("Property Address", { exact: true });
  await expect(address).toHaveValue("");
  await expect(address).toBeFocused();
  await expect(
    page.getByLabel("Price to analyze", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByLabel("Expected gross monthly rent", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("button", {
      name: /20% down · 6\.6% interest · 30 years/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Reusable assumptions kept", { exact: true }),
  ).toBeVisible();

  // The synthetic sample is a disposable preview, not the visitor's one
  // no-signup decision. Prove that the same browser can still claim its first
  // exact Offer Ceiling after leaving the sample while the reusable financing
  // assumptions remain intact.
  await address.fill("300 Sample Follow-up Ave, Columbus, OH 43215");
  await page.getByLabel("Price to analyze", { exact: true }).fill("250000");
  await page
    .getByLabel("Expected gross monthly rent", { exact: true })
    .fill("2400");
  await page
    .locator('form[data-calc-form="true"]')
    .getByRole("button", {
      name: "Analyze deal & calculate ceiling",
      exact: true,
    })
    .last()
    .click();
  const firstRealDecision = page.locator(
    "section[aria-labelledby='decision-summary-title']",
  );
  await expect(firstRealDecision).toBeVisible({ timeout: 20_000 });
  const ceilingDetails = firstRealDecision
    .locator("summary")
    .filter({ hasText: "How this ceiling was calculated" });
  await ceilingDetails.click();
  await expect(firstRealDecision.getByText(/Exact ceiling/)).toBeVisible();
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
