import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { resolveAuthenticatedE2EEnvironment } from "./support/auth-environment";
import { SAMPLE_DEAL_VALUES } from "../lib/sample-deal";
import { recomputeSavedDealVerdict, toRecomputedSavedAnalysisSnapshot } from "../lib/recompute-saved-deal-verdict";
import { acceptCookiesIfShown, expectNoHorizontalOverflow } from "./support/product-flows";

const auth = resolveAuthenticatedE2EEnvironment(process.env);
test("Agent Pro saves separate client matches, preserves history, exports a PDF, and enforces tenant isolation", async ({ page }) => {
  test.setTimeout(180_000);
  test.skip(!auth.enabled, auth.enabled ? "" : auth.reason);
  if (!auth.enabled) return;
  const url = process.env.E2E_SUPABASE_URL!;
  // Never create synthetic users or subscriptions outside disposable CI.
  expect(process.env.PLAYWRIGHT_AUTH_TEST_ENVIRONMENT).toBe("isolated");
  expect(new URL(url).origin).toBe("http://127.0.0.1:54321");
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const password = auth.password;
  const email = `agent-readiness-${randomUUID()}@usetruecap.invalid`;
  const otherEmail = `other-readiness-${randomUUID()}@usetruecap.invalid`;
  const owner = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  const other = await admin.auth.admin.createUser({ email: otherEmail, password, email_confirm: true });
  expect(owner.error).toBeNull(); expect(other.error).toBeNull();
  const userId = owner.data.user!.id;
  const otherId = other.data.user!.id;
  try {
    const plan = await admin.from("plans").select("id").eq("slug", "agent_pro_monthly").single();
    expect(plan.error).toBeNull();
    const subscription = await admin.from("subscriptions").insert({ user_id: userId, plan_id: plan.data!.id, status: "active", current_period_start: new Date().toISOString(), current_period_end: new Date(Date.now()+86_400_000).toISOString() });
    expect(subscription.error).toBeNull();
    const dealId = randomUUID();
    const values = { ...SAMPLE_DEAL_VALUES, address: "Fixture readiness property, Philadelphia, PA 19140" };
    const verdict = recomputeSavedDealVerdict(values)!;
    const deal = await admin.from("saved_analyses").insert({ id: dealId, user_id: userId, title: values.address, form_snapshot: values, result_snapshot: toRecomputedSavedAnalysisSnapshot(verdict), property_type: values.propertyType, purchase_price: values.purchasePrice, net_cash_flow_monthly: verdict.netCashFlowMonthly, coc_return_pct: verdict.cocReturnPct, methodology_version: verdict.analysisResult.methodologyVersion });
    expect(deal.error).toBeNull();
    await page.context().clearCookies();
    await page.goto("/auth/login?next=/dashboard/clients");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/clients$/, { timeout: 30_000 });
    await acceptCookiesIfShown(page);
    await page.getByRole("button", { name: "Add client", exact: true }).first().click();
    await page.getByLabel("Name", { exact: true }).fill("Fixture client A");
    await page.getByLabel("Private notes (optional)").fill("Private note must never appear in reports");
    await page.getByLabel("How should this client be screened?").selectOption("cash");
    await page.getByRole("button", { name: "Add client", exact: true }).last().click();
    await expect(page.getByText("Fixture client A", { exact: true })).toBeVisible();
    const roster = await admin.from("agent_clients").select("*").eq("agent_user_id", userId).single();
    expect(roster.error).toBeNull(); expect(roster.data!.financing_assumptions).toEqual({ kind: "cash" });
    const clientId = roster.data!.id;
    const clientB = await admin.from("agent_clients").insert({ agent_user_id: userId, name: "Fixture client B", financing_assumptions: { kind: "amortizing", downPaymentPct: 25, interestRate: 8, loanTermYears: 30, pmiAnnualRatePct: 0 } }).select("id").single();
    expect(clientB.error).toBeNull();
    const boxes = await admin.from("user_buy_boxes").insert([
      { user_id: userId, client_id: clientId, name: "Cash criteria", min_cash_flow_monthly: 200, min_cap_rate_pct: 6, is_active: true, is_default: true },
      { user_id: userId, client_id: clientB.data!.id, name: "Financed criteria", min_cash_flow_monthly: 500, min_dscr: 1.25, is_active: true, is_default: false },
    ]);
    expect(boxes.error).toBeNull();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/dashboard/saved-analyses/${dealId}`);
    const screen = page.getByRole("region", { name: "Which clients could this fit?" });
    await screen.getByRole("button", { name: "Screen my clients" }).click();
    await expect(screen.getByRole("button", { name: "Refresh screening", exact: true })).toBeEnabled();
    await expect(screen.getByText("Client assumption: cash purchase", { exact: true })).toBeVisible();
    await expect(screen.getByRole("button", { name: "Save client match" })).toHaveCount(2);
    const cashScreen = screen.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Fixture client A · Cash criteria", exact: true }) });
    const financedScreen = screen.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Fixture client B · Financed criteria", exact: true }) });
    await cashScreen.getByRole("button", { name: "Save client match" }).click();
    await expect(screen.getByRole("button", { name: "Export client PDF" })).toHaveCount(1);
    await financedScreen.getByRole("button", { name: "Save client match" }).click();
    await expect(screen.getByRole("button", { name: "Export client PDF" })).toHaveCount(2);
    await expectNoHorizontalOverflow(page);
    const matches = await admin.from("agent_deal_matches").select("*").eq("user_id", userId).order("id");
    expect(matches.error).toBeNull(); expect(matches.data).toHaveLength(2);
    expect(new Set(matches.data!.map(match => match.saved_analysis_id)).size).toBe(1);
    expect(JSON.stringify(matches.data)).not.toContain("Private note must never");
    const original = JSON.stringify(matches.data);
    const revisedClient = await admin.from("agent_clients").update({ financing_assumptions: { kind: "amortizing", downPaymentPct: 10, interestRate: 9, loanTermYears: 20, pmiAnnualRatePct: 1 } }).eq("id", clientId).select("id").single();
    expect(revisedClient.error).toBeNull();
    await cashScreen.getByRole("button", { name: "Save client match" }).click();
    await expect(screen.getByText(/criteria changed/)).toBeVisible();
    const unchanged = await admin.from("agent_deal_matches").select("*").eq("user_id", userId).order("id");
    expect(JSON.stringify(unchanged.data)).toBe(original);
    const savedCashMatch = screen.getByRole("listitem").filter({ has: page.getByText("Fixture client A · Cash criteria", { exact: true }) }).filter({ has: page.getByRole("button", { name: "Export client PDF" }) });
    const downloadPromise = page.waitForEvent("download");
    await savedCashMatch.getByRole("button", { name: "Export client PDF" }).click();
    const download = await downloadPromise;
    const bytes = await readFile((await download.path())!);
    expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
    await savedCashMatch.getByRole("button", { name: "Prepare client link" }).click();
    await screen.getByRole("button", { name: "Client report", exact: true }).click();
    const sharing = page.getByRole("dialog");
    await sharing.getByRole("radio", { name: /Hide the exact address/ }).check();
    await sharing.getByRole("button", { name: "Create secure link" }).click();
    const linkInput = sharing.getByRole("textbox", { name: "Shareable URL" });
    await expect(linkInput).toHaveValue(/\/s\//);
    const shareUrl = await linkInput.inputValue();
    const shareRows = await admin.from("public_shares").select("snapshot").eq("owner_id", userId);
    expect(shareRows.error).toBeNull(); expect(shareRows.data).toHaveLength(1);
    expect(shareRows.data![0].snapshot.values.downPaymentPct).toBe(100);
    expect(JSON.stringify(shareRows.data)).not.toMatch(/Private note must never|Fixture client [AB]/);
    const recipient = await page.context().browser()!.newContext();
    try {
      const recipientPage = await recipient.newPage();
      await recipientPage.goto(shareUrl);
      await expect(recipientPage.getByRole("heading", { name: "Rental analysis", exact: true })).toBeVisible();
      await sharing.getByRole("button", { name: "Revoke this link", exact: true }).click();
      await sharing.getByRole("button", { name: "Yes, revoke link", exact: true }).first().click();
      // The first revoke button disappears when confirmation opens, before
      // the mutation finishes. Wait for the confirmed result, not that button.
      await expect(page.getByText("Link revoked", { exact: true })).toBeVisible();
      await expect(sharing.getByRole("button", { name: "Revoke this link", exact: true })).toHaveCount(0);
      const revoked = await admin.from("public_shares").select("revoked_at").eq("owner_id", userId).single();
      expect(revoked.error).toBeNull(); expect(revoked.data!.revoked_at).not.toBeNull();
      // Next.js can stream a not-found page with HTTP 200. Assert the actual
      // recipient experience and that the report is no longer rendered.
      await recipientPage.reload();
      await expect(recipientPage.getByRole("heading", { name: "This share link isn't available", exact: true })).toBeVisible();
      await expect(recipientPage.getByRole("heading", { name: "Rental analysis", exact: true })).toHaveCount(0);
    } finally { await recipient.close(); }
    await page.keyboard.press("Escape");
    const evidence = page.getByRole("region", { name: "Review rental comparables" });
    await evidence.getByText("Add a comparable reference", { exact: true }).click();
    await evidence.getByLabel("Comparable address", { exact: true }).fill("Fixture comparable 1");
    await evidence.getByLabel("Source or document reference").fill("Agent-reviewed lease");
    await evidence.getByLabel("Comparable monthly rent ($)").fill("2100");
    await evidence.getByLabel("Monthly rent adjustment ($)").fill("100");
    await evidence.getByLabel("Adjustment reasons and differences").fill("Subject includes utilities; comparable excludes utilities.");
    await evidence.getByRole("button", { name: "Save comparable reference" }).click();
    await expect(evidence.getByText("Fixture comparable 1", { exact: true })).toBeVisible();
    await evidence.getByRole("button", { name: "Archive reference" }).click();
    await evidence.getByLabel("Show archived references").check();
    await evidence.getByRole("button", { name: "Restore reference" }).click();
    await expect(evidence.getByText("Fixture comparable 1", { exact: true })).toBeVisible();
    const stranger = createClient(url, process.env.E2E_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    expect((await stranger.auth.signInWithPassword({ email: otherEmail, password })).error).toBeNull();
    const hidden = await stranger.from("agent_deal_matches").select("id").eq("user_id", userId);
    expect(hidden.error).toBeNull(); expect(hidden.data).toEqual([]);
    const hiddenEvidence = await stranger.from("deal_rent_evidence").select("id").eq("user_id", userId);
    expect(hiddenEvidence.error).toBeNull(); expect(hiddenEvidence.data).toEqual([]);
    const forged = await stranger.from("agent_deal_matches").insert({ user_id: otherId, saved_analysis_id: dealId, snapshot: {}, source_fingerprint: "a".repeat(64) });
    expect(forged.error).not.toBeNull();
    // The database also rejects cross-owner references in a trusted writer.
    const foreignClient = await admin.from("agent_clients").insert({ agent_user_id: otherId, name: "Other tenant" }).select("id").single();
    const wrongOwner = await admin.from("agent_deal_matches").insert({ user_id: userId, saved_analysis_id: dealId, client_id: foreignClient.data!.id, snapshot: {}, source_fingerprint: "b".repeat(64) });
    expect(wrongOwner.error?.code).toBe("42501");
  } finally {
    await admin.auth.admin.deleteUser(userId);
    await admin.auth.admin.deleteUser(otherId);
  }
});
