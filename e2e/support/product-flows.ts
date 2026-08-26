import { expect, type Page } from "@playwright/test";

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
  await form.getByLabel("Property Address").fill(address);
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
  await expect(page.getByText("Deal saved", { exact: true })).toBeVisible({
    timeout: 30_000,
  });

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
  const bulkActions = page.getByRole("region", { name: "Bulk actions" });
  await bulkActions
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(
    page.getByText(
      new RegExp(`^Deleted ${selected} deal${selected === 1 ? "" : "s"}$`),
    ),
  ).toBeVisible({ timeout: 30_000 });
  return selected;
}
