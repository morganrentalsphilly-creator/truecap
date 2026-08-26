import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { resolveAuthenticatedE2EEnvironment } from "./support/auth-environment";
import {
  acceptCookiesIfShown,
  deleteRegressionDealsByAddress,
  expectNoHorizontalOverflow,
  saveUniqueSampleDeal,
} from "./support/product-flows";

const authEnvironment = resolveAuthenticatedE2EEnvironment(process.env);
const authSkipReason = authEnvironment.enabled
  ? "Authenticated browser environment is available."
  : authEnvironment.reason;

test.beforeEach(() => {
  test.skip(!authEnvironment.enabled, authSkipReason);
});

test("shortlist preview repairs mixed pasted rows, ranks them, and survives refresh", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/dashboard/triage", { waitUntil: "domcontentloaded" });
  await acceptCookiesIfShown(page);
  await expect(
    page.getByRole("heading", { level: 1, name: "Screen a shortlist" }),
  ).toBeVisible();

  const expensiveAddress = "101 E2E Expensive Ave, Philadelphia, PA 19140";
  const missingRentAddress = "202 E2E Cashflow Ave, Philadelphia, PA 19140";
  const middleAddress = "303 E2E Middle Ave, Philadelphia, PA 19140";
  const mixedPaste = [
    `${expensiveAddress}\t350000\t1800\t3`,
    `${missingRentAddress} | 145000 | | 3`,
    `${middleAddress}, 250000, 2000, 4`,
  ].join("\n");

  await page.getByLabel("Listings to screen").fill(mixedPaste);
  await page.getByRole("button", { name: "Review listings" }).click();

  const review = page.getByRole("region", {
    name: "Review before screening",
  });
  await expect(review).toBeVisible();
  await expect(review.getByText("2 included", { exact: true })).toBeVisible();
  await expect(
    review
      .getByText(
        "Rent is missing; this row will need rent before it can be underwritten.",
        { exact: true },
      )
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(
    review
      .getByText(/Assumption location: Philadelphia, PA · PA tax assumptions/)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();

  const previewTable = review.getByRole("table", {
    name: "Editable listing preview",
  });
  const previewRows = previewTable.locator("tbody tr");
  await expect(previewRows).toHaveCount(3);
  await previewRows.nth(1).getByLabel("Monthly rent").fill("2200");
  await expect(review.getByText("3 included", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Screen 3 deals", exact: true }),
  ).toBeEnabled();

  await page
    .getByRole("button", { name: "Screen 3 deals", exact: true })
    .click();
  await expect(
    page.getByText("Screened 3 listings", { exact: false }),
  ).toBeVisible({
    timeout: 40_000,
  });
  await page.getByRole("button", { name: "Cash flow", exact: true }).click();

  const resultTable = page
    .getByRole("columnheader", { name: "Screening result" })
    .locator("xpath=ancestor::table");
  await expect(resultTable.locator("tbody tr").first()).toContainText(
    missingRentAddress,
  );
  await expect(
    resultTable.getByRole("columnheader", { name: "DSCR" }),
  ).toBeVisible();
  await expect(
    resultTable.getByRole("columnheader", { name: "Offer Ceiling" }),
  ).toBeVisible();
  await expect(
    resultTable.getByRole("columnheader", { name: "Fastest path" }),
  ).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Screened 3 listings", { exact: false }),
  ).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page
      .getByText(expensiveAddress, { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(
    page
      .getByText(missingRentAddress, { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(
    page
      .getByText(middleAddress, { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
});

test("saved deal moves through dashboard, durable scenario workspace, comparison, document validation, and PDF export", async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  const runKey = `${Date.now().toString(36)}-${testInfo.workerIndex}-${testInfo.retry}`;
  const address = `E2E Power ${runKey} Ave, Philadelphia, PA 19140`;
  const scenarioName = `E2E downside ${runKey}`;
  const scenarioNote = `Verify roof scope for ${runKey}.`;
  const queuedScenarioNote = `Confirm sewer scope for ${runKey}.`;
  let baseDealId: string | null = null;
  let notesRoutePattern: string | null = null;
  const notesSaveGate = { release: null as (() => void) | null };

  try {
    await page.setViewportSize({ width: 390, height: 844 });
    baseDealId = await saveUniqueSampleDeal(page, address);

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: /Welcome back/ }),
    ).toBeVisible();
    await expect(
      page
        .getByText(address, { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto(`/dashboard/saved-analyses/${baseDealId}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", { level: 1, name: address }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const documents = page.getByRole("region", { name: "Deal documents" });
    await expect(documents).toBeVisible({ timeout: 20_000 });
    const documentInput = documents.locator('input[type="file"]');
    await expect(documentInput).toHaveAttribute("accept", /\.pdf/);
    await expect(documentInput).not.toHaveAttribute("accept", /\.exe/);
    await documentInput.setInputFiles({
      name: `too-large-${runKey}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
    });
    await expect(
      page.getByText("File too large", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Max 10 MB per file.", { exact: true }),
    ).toBeVisible();

    const scenarios = page
      .getByRole("heading", { level: 2, name: "Scenarios" })
      .locator("xpath=ancestor::section");
    await scenarios
      .getByRole("button", { name: "Add a scenario", exact: true })
      .click();
    await scenarios.getByLabel("Scenario name").fill(scenarioName);
    await scenarios
      .getByRole("button", { name: "Add scenario", exact: true })
      .click();
    await expect(
      page.getByText("Scenario created", { exact: true }),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      scenarios.getByText(scenarioName, { exact: true }),
    ).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page
        .getByText(scenarioName, { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 20_000 });
    const scenarioWorkspaceLink = page.getByRole("link", {
      name: `Open ${scenarioName} workspace`,
    });
    const scenarioHref = await scenarioWorkspaceLink.getAttribute("href");
    expect(scenarioHref).toMatch(
      /^\/dashboard\/saved-analyses\/[0-9a-f-]{36}$/i,
    );
    expect(scenarioHref).not.toBe(`/dashboard/saved-analyses/${baseDealId}`);
    const scenarioPath = new URL(scenarioHref!, page.url()).pathname;
    await Promise.all([
      page.waitForURL((url) => url.pathname === scenarioPath, {
        timeout: 30_000,
        waitUntil: "domcontentloaded",
      }),
      scenarioWorkspaceLink.click(),
    ]);

    const notes = page.getByRole("textbox", {
      name: "Deal notes",
      exact: true,
    });
    await expect(notes).toBeEditable({ timeout: 20_000 });

    notesRoutePattern = `**${scenarioPath}`;
    const firstNotesSaveGate = new Promise<void>((resolve) => {
      notesSaveGate.release = resolve;
    });
    let firstNotesSaveDelayed = false;
    await page.route(notesRoutePattern, async (route) => {
      const request = route.request();
      if (
        !firstNotesSaveDelayed &&
        request.method() === "POST" &&
        request.postData()?.includes(scenarioNote)
      ) {
        firstNotesSaveDelayed = true;
        await firstNotesSaveGate;
      }
      await route.continue();
    });

    const firstNotesSaveRequest = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname === scenarioPath &&
        request.method() === "POST" &&
        Boolean(request.postData()?.includes(scenarioNote)),
      { timeout: 20_000 },
    );
    await notes.fill(scenarioNote);
    await notes.blur();
    await firstNotesSaveRequest;
    await expect(page.getByText("Saving…", { exact: true })).toBeVisible();

    const queuedNotesSaveRequest = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname === scenarioPath &&
        request.method() === "POST" &&
        Boolean(request.postData()?.includes(queuedScenarioNote)),
      { timeout: 20_000 },
    );
    await notes.fill(queuedScenarioNote);
    await notes.blur();
    notesSaveGate.release?.();
    notesSaveGate.release = null;
    await queuedNotesSaveRequest;
    await expect(page.getByText("Saved just now", { exact: true })).toBeVisible(
      {
        timeout: 20_000,
      },
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("textbox", { name: "Deal notes", exact: true }),
    ).toHaveValue(queuedScenarioNote, { timeout: 20_000 });
    await page.unroute(notesRoutePattern);
    notesRoutePattern = null;

    await page
      .getByRole("button", { name: "Compare scenarios", exact: true })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/compare(?:[?#]|$)/, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { level: 1, name: "Compare Deals" }),
    ).toBeVisible();
    await expect(
      page
        .getByText(scenarioName, { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Tied values share the highlight; no hidden tie-breaker/),
    ).toBeVisible();
    await expect(
      page.getByText(/Near-term lead count uses exactly four/),
    ).toBeVisible();
    await expect(
      page.getByText("Disclosed metric-lead counts", { exact: true }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto(`/?savedDeal=${baseDealId}`, {
      waitUntil: "domcontentloaded",
    });
    const decision = page.locator("#decision-summary-title");
    await expect(decision).toBeVisible({ timeout: 30_000 });
    await page.getByText("More actions", { exact: true }).click();
    const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
    await page.getByRole("button", { name: "Export PDF", exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    const downloadedPdf = await readFile(await download.path());
    expect(downloadedPdf.byteLength).toBeGreaterThan(1_000);
    expect(downloadedPdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    await expect(page.getByText("PDF generated", { exact: true })).toBeVisible({
      timeout: 20_000,
    });
  } finally {
    notesSaveGate.release?.();
    if (notesRoutePattern) {
      await page.unroute(notesRoutePattern).catch(() => undefined);
    }
    if (baseDealId) {
      await deleteRegressionDealsByAddress(page, address);
    }
  }
});
