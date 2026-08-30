import { expect, test, type Browser, type Page } from "@playwright/test";
import { SAMPLE_DEAL_FIXTURE } from "../lib/sample-deal";
import { resolveAuthenticatedE2EEnvironment } from "./support/auth-environment";
import {
  acceptCookiesIfShown,
  deleteRegressionDealsByAddress,
  replaceSampleAddressForRegression,
} from "./support/product-flows";

const authEnvironment = resolveAuthenticatedE2EEnvironment(process.env);
const authStatePath = "playwright/.auth/internal-test-user.json";
const authSkipReason = authEnvironment.enabled
  ? "Authenticated browser environment is available."
  : authEnvironment.reason;

test.beforeEach(() => {
  test.skip(!authEnvironment.enabled, authSkipReason);
});

async function openSampleDecision(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await acceptCookiesIfShown(page);
  const sampleButton = page
    .getByRole("button", {
      name: /view a sample decision|see a sample deal/i,
    })
    .first();
  await expect(sampleButton).toBeEnabled({ timeout: 20_000 });
  await sampleButton.click();
  await expect(page.locator("#decision-summary-title")).toBeVisible({
    timeout: 20_000,
  });
}

async function signInFromCurrentPage(page: Page) {
  if (!authEnvironment.enabled)
    throw new Error("Authentication is unavailable.");
  await expect(
    page.getByRole("heading", { level: 1, name: "Welcome back" }),
  ).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill(authEnvironment.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(authEnvironment.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

async function assertFocusedDecision(page: Page, address: string) {
  const summary = page.locator(
    "section[aria-labelledby='decision-summary-title']",
  );
  await expect(summary).toBeVisible({ timeout: 30_000 });
  await expect(summary.getByText(address, { exact: true })).toBeVisible();
}

async function newGuestPage(
  browser: Browser,
): Promise<{ page: Page; close: () => Promise<void> }> {
  // This spec runs inside the authenticated project, whose default context
  // carries the seeded user's storage state. `browser.newContext()` inherits
  // those project options, so an allegedly "guest" page can otherwise save
  // immediately as the test user and never exercise the sign-up handoff.
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  return { page, close: () => context.close() };
}

async function makeSampleAddressUnique(page: Page): Promise<string> {
  const address = `E2E ${Date.now()} Regression Ave, Philadelphia, PA 19140`;
  await page.getByText("More actions", { exact: true }).click();
  await page
    .getByRole("button", { name: "Edit assumptions", exact: true })
    .click();
  const form = page.locator('form[data-calc-form="true"]');
  await replaceSampleAddressForRegression(page, address);
  // The submit copy is deliberately role-aware (guest, no-property, and Pro
  // users see different truthful labels). Target the stable semantic action
  // instead of coupling this regression to one entitlement's marketing copy.
  const submit = form.locator('button[data-inform-submit="true"]');
  await expect(submit).toBeEnabled();
  await submit.click();
  await assertFocusedDecision(page, address);
  return address;
}

test("guest Save survives sign-in, saves automatically, and reopens from its durable URL", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const guest = await newGuestPage(browser);
  let savedAddress: string | null = null;
  try {
    await openSampleDecision(guest.page);
    savedAddress = await makeSampleAddressUnique(guest.page);
    await guest.page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(guest.page).toHaveURL(
      /\/auth\/sign-up\?next=%2F|\/auth\/sign-up\?next=\//,
    );
    await guest.page
      .getByRole("link", { name: "Sign in", exact: true })
      .click();
    await signInFromCurrentPage(guest.page);

    await expect(
      guest.page.getByText("Deal saved automatically", { exact: true }),
    ).toBeVisible({
      timeout: 40_000,
    });
    await expect(guest.page).toHaveURL(/[?&]savedDeal=[0-9a-f-]{36}(?:&|$)/i);
    const durableUrl = guest.page.url();

    await guest.page.reload({ waitUntil: "domcontentloaded" });
    await assertFocusedDecision(guest.page, savedAddress);
    await expect(guest.page).toHaveURL(durableUrl);

    const secondDevice = await browser.newContext({
      storageState: authStatePath,
    });
    try {
      const secondPage = await secondDevice.newPage();
      await secondPage.goto(durableUrl, { waitUntil: "domcontentloaded" });
      await assertFocusedDecision(secondPage, savedAddress);
      await expect(secondPage).toHaveURL(durableUrl);
    } finally {
      await secondDevice.close();
    }
  } finally {
    try {
      if (
        savedAddress &&
        /[?&]savedDeal=[0-9a-f-]{36}(?:&|$)/i.test(guest.page.url())
      ) {
        await deleteRegressionDealsByAddress(guest.page, savedAddress);
      }
    } finally {
      await guest.close();
    }
  }
});

test("guest Share returns from sign-in to the same result and reopens disclosure choices", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const guest = await newGuestPage(browser);
  try {
    await openSampleDecision(guest.page);
    const resultSummary = guest.page.locator(
      "section[aria-labelledby='decision-summary-title']",
    );
    await resultSummary.getByText("More actions", { exact: true }).click();
    await resultSummary
      .getByRole("button", { name: "Share", exact: true })
      .click();
    const shareDialog = guest.page.getByRole("dialog", {
      name: "Share this analysis",
    });
    await expect(shareDialog).toBeVisible();
    await shareDialog
      .getByRole("link", { name: "Sign in", exact: true })
      .click();

    await signInFromCurrentPage(guest.page);
    await assertFocusedDecision(guest.page, SAMPLE_DEAL_FIXTURE.values.address);

    const resumedDialog = guest.page.getByRole("dialog", {
      name: "Share this analysis",
    });
    await expect(resumedDialog).toBeVisible({ timeout: 30_000 });
    await expect(
      resumedDialog.getByText("Choose what to disclose", { exact: false }),
    ).toBeVisible();
    await expect(
      resumedDialog.getByRole("button", { name: "Create secure link" }),
    ).toBeVisible();
  } finally {
    await guest.close();
  }
});
