import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  buildAnalysisPdfObjectPath,
  PDF_CACHE_VERSION,
} from "@/lib/pdf-export-constants";
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
  let uploadedDocumentName: string | null = null;
  let notesRoutePattern: string | null = null;
  let storageProbeClient: SupabaseClient | null = null;
  const storageProbeObjects: Array<{ bucket: string; path: string }> = [];
  const notesSaveGate = { release: null as (() => void) | null };

  try {
    await page.setViewportSize({ width: 390, height: 844 });
    baseDealId = await saveUniqueSampleDeal(page, address);

    if (!authEnvironment.enabled) {
      throw new Error("The isolated authenticated environment is required.");
    }
    const storageUrl = process.env.E2E_SUPABASE_URL?.trim();
    const storageAnonKey = process.env.E2E_SUPABASE_ANON_KEY?.trim();
    if (!storageUrl || !storageAnonKey) {
      throw new Error("The isolated Supabase Storage environment is required.");
    }
    storageProbeClient = createClient(storageUrl, storageAnonKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    const { data: probeAuth, error: probeAuthError } =
      await storageProbeClient.auth.signInWithPassword({
        email: authEnvironment.email,
        password: authEnvironment.password,
      });
    expect(probeAuthError).toBeNull();
    const probeOwnerId = probeAuth.user?.id;
    expect(probeOwnerId).toBeTruthy();
    if (!probeOwnerId) throw new Error("The Storage probe user was not returned.");

    // Exercise the byte-limit boundary at Storage itself. The UI has an early
    // guard too, but a hostile client can bypass an input element entirely.
    const oversizedObjectPath = `${probeOwnerId}/${baseDealId}/oversized-${runKey}.pdf`;
    storageProbeObjects.push({
      bucket: "deal-documents",
      path: oversizedObjectPath,
    });
    const { error: oversizedStorageError } = await storageProbeClient.storage
      .from("deal-documents")
      .upload(oversizedObjectPath, Buffer.alloc(10 * 1024 * 1024 + 1), {
        contentType: "application/pdf",
        upsert: false,
    });
    expect(oversizedStorageError).not.toBeNull();
    expect(oversizedStorageError?.message).toMatch(
      /maximum allowed size|payload too large|entity too large/i,
    );

    // The PDF cache uses upsert:true. Uploading the exact same authorized key
    // twice proves both the INSERT and UPDATE RLS probes work with the Storage
    // service's transient metadata shape.
    const pdfCachePath = buildAnalysisPdfObjectPath(
      probeOwnerId,
      baseDealId,
      PDF_CACHE_VERSION,
      "a".repeat(32),
      "b".repeat(64),
    );
    storageProbeObjects.push({ bucket: "analysis-pdfs", path: pdfCachePath });
    for (const marker of ["initial", "replacement"]) {
      const { error } = await storageProbeClient.storage
        .from("analysis-pdfs")
        .upload(
          pdfCachePath,
          Buffer.from(`%PDF-1.4\n% TrueCap ${marker} cache policy probe\n`),
          { contentType: "application/pdf", upsert: true },
        );
      expect(error, `${marker} analysis PDF cache upload`).toBeNull();
    }
    const { data: cachedPdf, error: cachedPdfError } =
      await storageProbeClient.storage.from("analysis-pdfs").download(pdfCachePath);
    expect(cachedPdfError).toBeNull();
    expect(cachedPdf).not.toBeNull();
    if (!cachedPdf) throw new Error("The cached PDF probe was not returned.");
    await expect(cachedPdf.text()).resolves.toContain("replacement cache policy probe");
    const { error: removeCachedPdfError } = await storageProbeClient.storage
      .from("analysis-pdfs")
      .remove([pdfCachePath]);
    expect(removeCachedPdfError).toBeNull();
    const cachedPdfIndex = storageProbeObjects.findIndex(
      (object) => object.path === pdfCachePath,
    );
    if (cachedPdfIndex >= 0) storageProbeObjects.splice(cachedPdfIndex, 1);

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

    // `accept` is only a browser hint, so prove the private bucket itself
    // rejects a disallowed MIME type before testing the valid lifecycle.
    const blockedDocumentName = `blocked-${runKey}.exe`;
    await documentInput.setInputFiles({
      name: blockedDocumentName,
      mimeType: "application/x-msdownload",
      buffer: Buffer.from("not an allowed deal document"),
    });
    await expect(
      page.getByText("Upload failed", { exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      documents.getByText(blockedDocumentName, { exact: true }),
    ).toHaveCount(0);

    // The old regression stopped at the client-side size check, so CI never
    // reached Storage RLS and stayed green while every real upload failed in
    // production. Exercise the complete private-object lifecycle with a small
    // valid PDF: upload, list, signed download, confirm-gated delete.
    const validDocumentName = `e2e-deal-document-${runKey}.pdf`;
    // Track before the upload starts: if Storage succeeds but the following
    // toast/list assertion fails, finally still attempts object cleanup.
    uploadedDocumentName = validDocumentName;
    await documentInput.setInputFiles({
      name: validDocumentName,
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n% TrueCap authenticated storage regression\n"),
    });
    await expect(
      page.getByText("Document uploaded", { exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      documents.getByText(validDocumentName, { exact: true }),
    ).toBeVisible();

    const signedDocumentResponsePromise = page.context().waitForEvent("response", {
      predicate: (response) => {
        const url = new URL(response.url());
        return (
          response.request().method() === "GET" &&
          url.pathname.includes("/storage/v1/object/sign/deal-documents/") &&
          decodeURIComponent(url.pathname).endsWith(`/${validDocumentName}`)
        );
      },
      timeout: 20_000,
    });
    const documentPopupPromise = page.waitForEvent("popup", { timeout: 20_000 });
    await documents
      .getByRole("button", { name: `Download ${validDocumentName}`, exact: true })
      .click();
    const [documentPopup, signedDocumentResponse] = await Promise.all([
      documentPopupPromise,
      signedDocumentResponsePromise,
    ]);
    expect(signedDocumentResponse.ok()).toBe(true);
    expect(signedDocumentResponse.headers()["content-type"]).toContain(
      "application/pdf",
    );
    await documentPopup.close();

    await documents
      .getByRole("button", { name: `Delete ${validDocumentName}`, exact: true })
      .click();
    const deleteDocumentPopover = page
      .getByText("Delete this document?", { exact: true })
      .locator("xpath=ancestor::*[@data-radix-popper-content-wrapper]");
    await expect(deleteDocumentPopover).toBeVisible();
    await deleteDocumentPopover
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(
      page.getByText("Document deleted", { exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      documents.getByText(validDocumentName, { exact: true }),
    ).toHaveCount(0);
    uploadedDocumentName = null;

    const commentBody = `E2E seller update ${runKey}`;
    const commentLog = page.getByRole("region", { name: "Deal comments" });
    await expect(commentLog).toBeVisible();
    await commentLog.getByLabel("Add a deal comment").fill(commentBody);
    await commentLog
      .getByRole("button", { name: "Add comment", exact: true })
      .click();
    await expect(
      commentLog.getByText(commentBody, { exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    await commentLog
      .getByRole("button", { name: "Delete comment", exact: true })
      .click();
    const deleteCommentPopover = page
      .getByText("Delete this comment?", { exact: true })
      .locator("xpath=ancestor::*[@data-radix-popper-content-wrapper]");
    await expect(deleteCommentPopover).toBeVisible();
    await deleteCommentPopover
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(
      commentLog.getByText(commentBody, { exact: true }),
    ).toHaveCount(0);

    const scenarios = page
      .getByRole("heading", { level: 2, name: "Scenarios" })
      .locator("xpath=ancestor::section");
    await scenarios
      .getByRole("button", { name: "Add a scenario", exact: true })
      .click();
    await scenarios.getByLabel("Scenario name").fill(scenarioName);
    await scenarios
      .getByLabel("Strategy (optional)")
      .selectOption("house_hack");
    await expect(
      scenarios.getByText(/Sets down payment to 3\.5%.*choose House Hack/i),
    ).toBeVisible();
    await scenarios
      .getByRole("button", { name: "Add scenario", exact: true })
      .click();
    await expect(
      page.getByText("Scenario created", { exact: true }),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByText(
        "The copy is ready. Open its workspace, edit assumptions, and choose House hack to complete the visible strategy setup.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      scenarios.getByText(scenarioName, { exact: true }),
    ).toBeVisible();
    await expect(
      scenarios.getByText("House hack", { exact: true }),
    ).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page
        .getByText(scenarioName, { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page
        .getByText("House hack", { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
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

    await expect(
      page
        .getByText("House hack", { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(
        "Independent House hack starting copy — open it to verify and complete the strategy inputs.",
        { exact: true },
      ),
    ).toBeVisible();

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
    if (storageProbeClient) {
      for (const object of storageProbeObjects.reverse()) {
        await storageProbeClient.storage
          .from(object.bucket)
          .remove([object.path])
          .catch(() => undefined);
      }
      // The probe shares the seeded user's credentials with the browser. A
      // default (global) sign-out revokes the browser session too, which turns
      // successful cleanup into an authentication failure for this test and
      // every retry that reuses the saved state. Only discard this client's
      // in-memory session.
      await storageProbeClient.auth
        .signOut({ scope: "local" })
        .catch(() => undefined);
    }
    if (baseDealId && uploadedDocumentName) {
      // Best-effort object cleanup if an assertion between upload and the
      // tested delete failed. Deleting the deal row does not cascade into
      // Supabase Storage.
      await page
        .goto(`/dashboard/saved-analyses/${baseDealId}`, {
          waitUntil: "domcontentloaded",
        })
        .then(async () => {
          const documents = page.getByRole("region", { name: "Deal documents" });
          const deleteButton = documents.getByRole("button", {
            name: `Delete ${uploadedDocumentName}`,
            exact: true,
          });
          const objectIsListed = await deleteButton
            .waitFor({ state: "visible", timeout: 20_000 })
            .then(() => true)
            .catch(() => false);
          if (objectIsListed) {
            await deleteButton.click();
            const popover = page
              .getByText("Delete this document?", { exact: true })
              .locator("xpath=ancestor::*[@data-radix-popper-content-wrapper]");
            await popover
              .getByRole("button", { name: "Delete", exact: true })
              .click();
            await page
              .getByText("Document deleted", { exact: true })
              .waitFor({ state: "visible", timeout: 30_000 });
            uploadedDocumentName = null;
          }
        })
        .catch(() => undefined);
    }
    if (baseDealId) {
      await deleteRegressionDealsByAddress(page, address);
    }
  }
});
