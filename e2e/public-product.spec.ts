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
    .poll(() => decisionDisclosure.evaluate((element) => element.hasAttribute("open")))
    .toBe(false);
  await decisionDetails.focus();
  await page.keyboard.press("Enter");
  await expect
    .poll(() => decisionDisclosure.evaluate((element) => element.hasAttribute("open")))
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
