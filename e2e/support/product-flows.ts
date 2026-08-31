import { expect, type Page } from "@playwright/test";
import { SAMPLE_DEAL_FIXTURE } from "../../lib/sample-deal";

export async function acceptCookiesIfShown(page: Page): Promise<void> {
  const acceptCookies = page.getByRole("button", { name: /accept all/i });
  try {
    await acceptCookies.waitFor({ state: "visible", timeout: 1_500 });
    await acceptCookies.click();
  } catch {
    // Returning visitors and isolated contexts with prior consent have no
    // banner. A missing optional control must not fail the product flow.
  }
}

export async function dismissNotifications(page: Page): Promise<void> {
  const closeNotification = page.getByRole("button", {
    name: "Close notification",
  });
  for (let index = 0; index < 5; index += 1) {
    try {
      // Toasts can finish their exit animation between a visibility check and
      // the click. Use one short, atomic action so an optional disappearing
      // notification can never consume the test's full timeout.
      await closeNotification.first().click({ timeout: 1_000 });
    } catch {
      return;
    }
  }
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(
    dimensions.viewportWidth + 1,
  );
}

export async function openSampleDecision(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await acceptCookiesIfShown(page);

  const sampleButton = page
    .getByRole("button", {
      name: /view a sample decision|see a sample deal|try a synthetic sample rental/i,
    })
    .first();
  await expect(sampleButton).toBeEnabled({ timeout: 20_000 });
  await sampleButton.click();
  await expect(page.locator("#decision-summary-title")).toBeVisible({
    timeout: 20_000,
  });
}

/**
 * Turn the synthetic sample into a unique regression deal through the same
 * safety flow a user sees. Changing a property deliberately clears the old
 * property's price, rent, beds, and physical facts; this helper accepts that
 * warning and then explicitly re-enters the fixture values so the surrounding
 * test can focus on save/share/workspace continuity.
 */
export async function replaceSampleAddressForRegression(
  page: Page,
  address: string,
): Promise<void> {
  const form = page.locator('form[data-calc-form="true"]');
  const addressInput = form.getByLabel("Property Address");
  let addressChangeMessage = "";
  page.once("dialog", async (dialog) => {
    addressChangeMessage = dialog.message();
    await dialog.accept();
  });
  await addressInput.fill(address);
  await addressInput.press("Tab");
  expect(addressChangeMessage).toContain("Use this new property?");

  const price = form.getByLabel("Price to analyze");
  const rent = form.getByLabel("Expected gross monthly rent");
  await expect(price).toHaveValue("");
  await expect(rent).toHaveValue("");
  await price.fill(String(SAMPLE_DEAL_FIXTURE.values.purchasePrice));
  await form
    .getByLabel("Bedrooms (optional)")
    .fill(String(SAMPLE_DEAL_FIXTURE.values.bedrooms));
  await rent.fill(String(SAMPLE_DEAL_FIXTURE.values.monthlyRent));
}

export async function saveUniqueSampleDeal(
  page: Page,
  address: string,
): Promise<string> {
  await openSampleDecision(page);
  // Intentionally let the authenticated account-scoped Buy Box lookup finish
  // while the sample preview is active. Editing after that exact ordering
  // regresses if the parent resets readiness without starting a new lookup.
  await page.waitForLoadState("networkidle");
  await page.getByText("More actions", { exact: true }).click();
  await page
    .getByRole("button", { name: "Edit assumptions", exact: true })
    .click();

  const form = page.locator('form[data-calc-form="true"]');
  await replaceSampleAddressForRegression(page, address);
  const submit = form.locator('button[data-inform-submit="true"]');
  await expect(submit).toBeEnabled();
  await submit.click();

  const summary = page.locator(
    "section[aria-labelledby='decision-summary-title']",
  );
  await expect(summary.getByText(address, { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  const save = summary.getByRole("button", { name: "Save", exact: true });
  await expect(save).toBeEnabled({ timeout: 20_000 });
  await save.click();
  await expect(page).toHaveURL(/[?&]savedDeal=[0-9a-f-]{36}(?:&|$)/i, {
    timeout: 30_000,
  });
  // The savedDeal URL transition can rerender the result boundary and discard
  // transient feedback. Verify the persisted state instead of racing a toast.
  await expect(
    summary.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  const savedDealId = new URL(page.url()).searchParams.get("savedDeal");
  if (!savedDealId)
    throw new Error("Saved deal URL did not include savedDeal.");
  return savedDealId;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function deleteRegressionDealsByAddress(
  page: Page,
  address: string,
): Promise<number> {
  await page.goto("/dashboard/saved-analyses", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { level: 1, name: "My Deals" }),
  ).toBeVisible();

  const addressLine = address.split(",")[0] ?? address;
  await page.getByLabel("Search your deals by address").fill(addressLine);
  const candidates = page.getByLabel(
    new RegExp(`^Select analysis ${escapeRegExp(addressLine)}$`),
  );
  const candidateCount = await candidates.count();
  let selected = 0;
  for (let index = 0; index < candidateCount; index += 1) {
    const checkbox = candidates.nth(index);
    if (!(await checkbox.isVisible())) continue;
    await checkbox.check();
    selected += 1;
  }
  if (selected === 0) return 0;

  page.once("dialog", (dialog) => dialog.accept());
  const selectedActions = page.getByRole("region", {
    name: "Selected deal actions",
  });
  await selectedActions
    .getByRole("button", { name: "Manage selected deals", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Delete selected", exact: true })
    .click();
  await expect(
    page.getByText(
      new RegExp(`^Deleted ${selected} deal${selected === 1 ? "" : "s"}$`),
    ),
  ).toBeVisible({ timeout: 30_000 });
  return selected;
}
