import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ONE_TIME_PDF_RETURN_KEY,
  oneTimePdfReturnBootstrapScript,
} from "@/lib/one-time-pdf-return";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const migration = read(
  "supabase/migrations/20260815150000_one_time_pdf_purchase_claims.sql"
);
const reportBindingMigration = read(
  "supabase/migrations/20260823180000_bind_one_time_pdf_report_target.sql"
);
const action = read("app/actions/one-time-pdf.ts");
const generatorAction = read("app/actions/generate-report-pdf.ts");
const currentAccessGuard = read("lib/stripe/decision-pack-access.ts");
const client = read("components/investcalc/investcalc-page.tsx");
const layout = read("app/layout.tsx");
const sentryClient = read("instrumentation-client.ts");
const sentryServer = read("sentry.server.config.ts");
const sentryEdge = read("sentry.edge.config.ts");
const googleMeasurement = read(
  "components/analytics/google-measurement.tsx"
);
const purchaseDialog = read("components/investcalc/pdf-purchase-dialog.tsx");

describe("one-time PDF security contract", () => {
  it("never puts a Stripe Checkout Session id or claim secret in the return URL", () => {
    expect(action).toContain("success_url: `${siteUrl}/?pdf_claim=");
    expect(action).not.toContain("pdf_purchase={CHECKOUT_SESSION_ID}");
    expect(action).not.toMatch(/success_url:[^\n]+claimSecret/);
  });

  it("binds redemption to a secret, exact deal, optional user, and an atomic consume", () => {
    expect(action).toContain("claim_secret_hash: claimSecretHash");
    expect(action).toContain("deal_fingerprint: dealFingerprint");
    expect(action).toContain("report_fingerprint: reportFingerprint");
    expect(action).toContain("user_id: userId");
    expect(action).toContain('.gt("expires_at", consumedAt)');
    expect(action).toContain('.is("consumed_at", null)');
    expect(action).toContain("retrieveDecisionPackStripeAccess(");
    expect(currentAccessGuard).toContain(
      "session.metadata?.claim_id !== expectedClaimId"
    );
    expect(currentAccessGuard).toContain('session.payment_status !== "paid"');
    expect(currentAccessGuard).toContain("charge.amount_refunded > 0");
    expect(currentAccessGuard).toContain('dispute.status === "lost"');
  });

  it("binds the purchased report target/source and keeps recovery to 24 hours", () => {
    expect(action).toContain("fingerprintOneTimePdfReportBinding(");
    expect(action).toContain("maxOfferTargetSource");
    expect(action).toContain("report_fingerprint: reportFingerprint");
    expect(reportBindingMigration).toContain(
      "old.report_fingerprint is not null"
    );
    expect(reportBindingMigration).toContain(
      "one-time PDF report binding is immutable"
    );
    expect(reportBindingMigration).toContain("interval '24 hours'");
    expect(client).not.toContain("checkoutMaoTarget");
    expect(client).not.toContain("createOneTimePdfCheckoutAction");
    expect(client).toContain("const restoredDraft = parseOneTimePdfDraft(draftRaw)");
    expect(client).toContain("maxOfferTarget: restoredMaoTarget");
    expect(client).toContain("maxOfferTargetSource: restoredMaoTargetSource");
  });

  it("restores pre-binding drafts through the same default resolver at every gate", () => {
    expect(client).toContain("parseOneTimePdfDraft(draftRaw)");
    expect(action).toContain("allowLegacyDefault: true");
    expect(generatorAction).toContain("allowLegacyDefault: true");
    expect(action).toContain("resolveLegacyCompatibleOneTimePdfReportBinding");
    expect(generatorAction).toContain(
      "resolveLegacyCompatibleOneTimePdfReportBinding"
    );
    expect(action).toContain("report_fingerprint: reportFingerprint");
    expect(generatorAction).toContain(
      "data.report_fingerprint === reportFingerprint"
    );
  });

  it("keeps the ledger server-only under RLS with no end-user policy", () => {
    expect(migration).toContain(
      "alter table public.one_time_pdf_purchase_claims enable row level security"
    );
    expect(migration).toContain(
      "alter table public.one_time_pdf_purchase_claims force row level security"
    );
    expect(migration).toContain(
      "revoke all on table public.one_time_pdf_purchase_claims from public, anon, authenticated"
    );
    expect(migration).toContain("to service_role");
    expect(migration).not.toMatch(/create policy/i);
    expect(migration).toContain("checkout_session_id text not null unique");
    expect(migration).toContain(
      "create or replace function public.enforce_one_time_pdf_purchase_claim_integrity()"
    );
    expect(migration).toContain("one-time PDF checkout binding is immutable");
    expect(migration).toContain("purchase amount is immutable once recorded");
    expect(migration).toContain("credit amount is immutable once recorded");
    expect(migration).toContain(
      "grant select, insert, update on table public.one_time_pdf_purchase_claims to service_role"
    );
    expect(migration).not.toContain(
      "grant select, insert, update, delete on table public.one_time_pdf_purchase_claims"
    );
  });

  it("moves the return marker before GTM and discards legacy bearer ids", () => {
    const bootstrap = oneTimePdfReturnBootstrapScript();
    expect(bootstrap).toContain(ONE_TIME_PDF_RETURN_KEY);
    expect(bootstrap).toContain("searchParams.delete('pdf_purchase')");
    expect(bootstrap).not.toContain("legacySessionId");
    expect(layout.indexOf("one-time-pdf-return-bootstrap")).toBeLessThan(
      layout.indexOf("<GoogleMeasurement />")
    );
    expect(googleMeasurement).toContain('id="gtm-loader"');
    expect(googleMeasurement).toContain(
      "shouldKeepThirdPartyTelemetryDisabled"
    );
    expect(googleMeasurement).toContain('referrerPolicy="no-referrer"');
    expect(client).toContain('returnState.kind === "legacy"');
    expect(client).toContain("cannot be auto-redeemed safely");
  });

  it("scrubs raw request URLs and breadcrumbs at every Sentry runtime", () => {
    for (const config of [sentryClient, sentryServer, sentryEdge]) {
      expect(config).toContain("scrubSentryEventSensitiveData(event)");
      expect(config).toContain("scrubSentryBreadcrumbUrl");
      expect(config).toContain("beforeBreadcrumb");
      expect(config).toContain("beforeSendTransaction");
      expect(config).toContain("beforeSendSpan");
    }
  });

  it("reads existing paid-claim secrets and drafts only from same-tab sessionStorage", () => {
    const returnStart = client.indexOf("Return-from-Stripe handler");
    const returnEnd = client.indexOf("const handleNewAnalysis", returnStart);
    expect(returnStart).toBeGreaterThanOrEqual(0);
    expect(returnEnd).toBeGreaterThan(returnStart);
    const returnHandler = client.slice(returnStart, returnEnd);

    expect(client).not.toContain("createOneTimePdfCheckoutAction");
    expect(client).not.toContain("handleBuyOneTimePdf");
    expect(returnHandler).toContain("window.sessionStorage.getItem(");
    expect(returnHandler).toContain("oneTimePdfClaimSecretKey(returnState.claimId)");
    expect(returnHandler).toContain("window.sessionStorage.getItem(ONE_TIME_PDF_DRAFT_KEY)");
    expect(returnHandler).not.toContain("window.localStorage.getItem");
    expect(returnHandler).toContain("parseOneTimePdfClaimSecret(secretRaw)");
    expect(returnHandler).toContain("parseOneTimePdfDraft(draftRaw)");
    expect(returnHandler).toContain("verifyOneTimePdfPaymentAction({");
  });

  it("leaves Pro credit dormant but preserves an auditable future ledger", () => {
    expect(migration).toContain("pro_credit_status text not null default 'not_configured'");
    expect(migration).toContain("pro_credit_amount_cents");
    expect(migration).toContain("pro_credit_eligible_until");
    expect(migration).toContain("pro_credit_applied_at");
    expect(migration).toContain("pro_credit_reference");
    expect(action).toContain('pro_credit_status: "not_configured"');
  });

  it("discloses the shutdown while preserving existing paid-claim support", () => {
    expect(purchaseDialog).toContain("One-time report purchases are");
    expect(purchaseDialog).toContain("temporarily unavailable");
    expect(purchaseDialog).toContain("Existing paid claims and recovery remain supported");
    expect(purchaseDialog).toContain("new purchases only");
    expect(purchaseDialog).not.toContain("onBuyOneTime");
    expect(purchaseDialog).not.toContain("Buy the Deal Decision Pack");
    expect(purchaseDialog).toContain('href="/terms"');
    expect(purchaseDialog).toContain("Terms");
    expect(purchaseDialog).toContain("hello@usetruecap.com");
  });

  it("retains the bound claim after generation so the advertised recovery works", () => {
    const successStart = client.indexOf("downloadPdfFromBase64(pdfResult.pdfBase64");
    const successEnd = client.indexOf('trackConversion("pdf_exported")', successStart);
    const success = client.slice(successStart, successEnd);
    expect(success).toContain("24-hour recovery path");
    expect(success).not.toContain("oneTimePdfUnlockedRef.current = false");
    expect(success).not.toContain("oneTimePdfRedemptionRef.current = null");
    expect(success).not.toContain("removeItem(ONE_TIME_PDF_RETURN_KEY)");
    expect(success).not.toContain("oneTimePdfClaimSecretKey(redemption.claimId)");
  });
});
