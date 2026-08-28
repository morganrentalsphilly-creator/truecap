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

test("mobile investor can set criteria, calculate once, and start a fresh analysis from either shell control", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard/new", { waitUntil: "domcontentloaded" });
  await acceptCookiesIfShown(page);

  const form = page.locator('form[data-calc-form="true"]');
  await expect(form).toBeVisible({ timeout: 20_000 });
  await expect(form).toHaveAttribute("data-calculator-ready", "true", {
    timeout: 20_000,
  });

  // Enter a complete first-pass deal directly. This intentionally does not
  // click an address suggestion or invoke address autofill: a typed listing
  // must remain a supported, one-pass underwriting path.
  const address = form.getByLabel("Property Address", { exact: true });
  await address.fill("2560 Collins St, Philadelphia, PA 19125, USA");
  await form.getByLabel("Price to analyze", { exact: true }).fill("215000");
  await form.getByLabel("Bedrooms (optional)", { exact: true }).fill("3");
  await form
    .getByLabel("Expected gross monthly rent", { exact: true })
    .fill("2500");

  // Establish debt financing explicitly so this regression is independent of
  // the test account's saved defaults (an all-cash default correctly disables
  // DSCR as a criterion).
  await page
    .getByRole("button", { name: /down.*interest/i })
    .click();
  await form.getByLabel("Down Payment %", { exact: true }).fill("20");
  await form.getByLabel("Interest Rate %", { exact: true }).fill("6.5");

  const criteria = page.getByRole("region", {
    name: "Offer Ceiling criteria",
  });
  await expect(criteria).toBeVisible({ timeout: 20_000 });
  await expect(criteria).toContainText(/cash flow|DSCR/i);
  await criteria.getByText("Change criteria", { exact: true }).click();

  const cashFlowCriterion = criteria.getByLabel("Min cash flow ($/mo)", {
    exact: true,
  });
  const dscrCriterion = criteria.getByLabel("Min DSCR", { exact: true });
  await expect(cashFlowCriterion).toBeEditable();
  await expect(dscrCriterion).toBeEditable();
  await cashFlowCriterion.fill("100");
  await expect(criteria).toContainText("cash flow ≥ $100/mo");
  await expectNoHorizontalOverflow(page);

  // The mobile sticky action intentionally mirrors this CTA once the
  // canonical in-form button has scrolled out of view. Target the stable
  // in-form control so the regression proves the one-click calculation path
  // without becoming ambiguous when both controls are mounted in the DOM.
  const analyze = form.locator('button[data-inform-submit="true"]');
  await expect(analyze).toHaveAccessibleName(
    "Analyze deal & calculate ceiling",
  );
  await expect(analyze).toBeEnabled();
  await analyze.click();

  const summary = page.locator(
    "section[aria-labelledby='decision-summary-title']",
  );
  await expect(summary).toBeVisible({ timeout: 30_000 });
  await expect(
    summary.getByText("Offer Ceiling", { exact: true }),
  ).toBeVisible();
  await expect(summary.getByText("Model DSCR", { exact: true })).toBeVisible();
  await expect(summary).toContainText("cash flow ≥ $100/mo");
  await expect(
    summary.getByRole("button", { name: "Edit assumptions", exact: true }),
  ).toBeVisible();
  await expect(summary.getByText(/set targets first/i)).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  // Spreadsheet-parity loop: changing one assumption keeps the decision
  // feedback visible and clearly unsaved. An incomplete edit must retain the
  // last complete metrics with an explicit stale label, never a blank screen.
  await summary
    .getByRole("button", { name: "Edit assumptions", exact: true })
    .click();
  const liveEditReadout = page.locator('[data-edit-live-readout="true"]');
  await expect(liveEditReadout).toBeVisible();
  await expect(liveEditReadout).toContainText("Live · unsaved");
  const cashFlowReadout = liveEditReadout
    .locator("div")
    .filter({ hasText: /^Cash flow/ })
    .first();
  const originalCashFlow = await cashFlowReadout.textContent();
  await form
    .getByLabel("Expected gross monthly rent", { exact: true })
    .fill("2700");
  await expect.poll(() => cashFlowReadout.textContent()).not.toBe(originalCashFlow);
  await form
    .getByLabel("Expected gross monthly rent", { exact: true })
    .fill("");
  await expect(liveEditReadout).toContainText(
    "Last complete result · fix the highlighted input",
  );
  await form
    .getByLabel("Expected gross monthly rent", { exact: true })
    .fill("2500");
  await expect(liveEditReadout).toContainText("Live · unsaved");
  await page.getByRole("button", { name: "Done editing", exact: true }).click();
  await expect(summary).toBeVisible();

  // On the already-mounted /dashboard/new route, the compact header control
  // must reset the calculator rather than becoming a same-route no-op.
  const headerNewAnalysis = page
    .locator("header")
    .getByRole("link", { name: "New analysis", exact: true });
  await expect(headerNewAnalysis).toBeVisible();
  const headerDialogPromise = page.waitForEvent("dialog");
  const headerClickPromise = headerNewAnalysis.click();
  const headerDialog = await headerDialogPromise;
  expect(headerDialog.message()).toContain("Start a new analysis?");
  await headerDialog.accept();
  await headerClickPromise;
  await expect(form).toBeVisible();
  await expect(address).toHaveValue("");

  // The equivalent link in the mobile drawer must close the drawer and issue
  // the same guarded reset even though the pathname does not change.
  await address.fill("123 Mobile Regression Ave, Philadelphia, PA 19125");
  await page
    .getByRole("button", { name: "Open navigation menu", exact: true })
    .click();
  const drawer = page.getByRole("dialog", { name: "Dashboard navigation" });
  await expect(drawer).toBeVisible();
  const drawerNewAnalysis = drawer
    .getByRole("navigation", { name: "Dashboard (mobile)" })
    .getByRole("link", { name: "New Analysis", exact: true });
  await expect(drawerNewAnalysis).toBeVisible();
  const drawerDialogPromise = page.waitForEvent("dialog");
  const drawerClickPromise = drawerNewAnalysis.click();
  const drawerDialog = await drawerDialogPromise;
  expect(drawerDialog.message()).toContain("Start a new analysis?");
  await drawerDialog.accept();
  await drawerClickPromise;
  await expect(drawer).toBeHidden();
  await expect(address).toHaveValue("");
  await expectNoHorizontalOverflow(page);

  // Cross-route shell navigation remounts the analyzer, so it cannot rely on
  // the same-route reset event above. Leave a real autosaved draft behind,
  // move to My Deals, and prove ?fresh=1 wins over that stale draft exactly
  // once and is removed before a future save or refresh can repeat it.
  await address.fill("909 Cross Route Regression Ave, Philadelphia, PA 19125");
  await form.getByLabel("Price to analyze", { exact: true }).fill("225000");
  await form
    .getByLabel("Expected gross monthly rent", { exact: true })
    .fill("2400");
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.localStorage.getItem("truecap_calc_form_draft_v1"),
      ),
    )
    .not.toBeNull();

  await page.goto("/dashboard/saved-analyses", {
    waitUntil: "domcontentloaded",
  });
  const crossRouteNewAnalysis = page
    .locator("header")
    .getByRole("link", { name: "New analysis", exact: true });
  await expect(crossRouteNewAnalysis).toBeVisible();
  await crossRouteNewAnalysis.click();
  await expect(page).toHaveURL((url) =>
    url.pathname === "/dashboard/new" && !url.searchParams.has("fresh"),
  );
  const remountedForm = page.locator('form[data-calc-form="true"]');
  await expect(remountedForm).toHaveAttribute("data-calculator-ready", "true", {
    timeout: 20_000,
  });
  await expect(
    remountedForm.getByLabel("Property Address", { exact: true }),
  ).toHaveValue("");
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.localStorage.getItem("truecap_calc_form_draft_v1"),
      ),
    )
    .toBeNull();
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

    // Mobile repeated-use safety: selection exposes the high-frequency
    // Compare/Clear actions without putting Archive/Delete one tap away.
    await page.goto("/dashboard/saved-analyses", {
      waitUntil: "domcontentloaded",
    });
    const addressLine = address.split(",")[0] ?? address;
    await page.getByLabel("Search your deals by address").fill(addressLine);
    const selectedDeal = page
      .getByLabel(`Select analysis ${addressLine}`, { exact: true })
      .filter({ visible: true })
      .first();
    await selectedDeal.check();
    const selectedActions = page.getByRole("region", {
      name: "Selected deal actions",
    });
    await expect(selectedActions).toBeVisible();
    for (const name of ["Compare", "Clear", "Manage selected deals"]) {
      const action = selectedActions.getByRole("button", {
        name,
        exact: true,
      });
      await expect(action).toBeVisible();
      const box = await action.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    await expect(
      selectedActions.getByRole("button", { name: /archive|delete/i }),
    ).toHaveCount(0);
    await selectedActions
      .getByRole("button", { name: "Manage selected deals", exact: true })
      .click();
    await expect(
      page.getByRole("menuitem", { name: "Archive selected", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: "Delete selected", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await selectedActions
      .getByRole("button", { name: "Clear", exact: true })
      .click();
    await expect(selectedActions).toBeHidden();
    await expect(selectedDeal).not.toBeChecked();

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
        // Compare labels intentionally keep the property and scenario together
        // so sibling scenarios are distinguishable ("Address · Scenario").
        .getByText(scenarioName, { exact: false })
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/Tied values share the same shading; no hidden tie-breaker/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "As saved", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Per $100k purchase price",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Review assumption matrix", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Near-term score", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Long-term score", { exact: true })).toHaveCount(0);
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
