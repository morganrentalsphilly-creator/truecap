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
    expect(action).toContain("session.metadata?.claim_id !== initial.row.id");
    expect(action).toContain('session.payment_status !== "paid"');
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
    expect(client).toContain("maxOfferTargetSource: checkoutMaoTargetSource");
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

  it("stores the new claim secret and deal draft in sessionStorage, never localStorage", () => {
    const checkoutStart = client.slice(client.indexOf("const handleBuyOneTimePdf"));
    const returnHandler = checkoutStart.slice(0, checkoutStart.indexOf("const handleNewAnalysis"));
    expect(returnHandler).toContain("window.sessionStorage.setItem");
    expect(returnHandler).not.toContain("window.localStorage.setItem");
    expect(returnHandler).toContain("oneTimePdfClaimSecretKey(result.claim.id)");
    expect(returnHandler).toContain("parseOneTimePdfClaimSecret(secretRaw)");
    expect(client.match(/parseOneTimePdfClaimSecret\(/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("leaves Pro credit dormant but preserves an auditable future ledger", () => {
    expect(migration).toContain("pro_credit_status text not null default 'not_configured'");
    expect(migration).toContain("pro_credit_amount_cents");
    expect(migration).toContain("pro_credit_eligible_until");
    expect(migration).toContain("pro_credit_applied_at");
    expect(migration).toContain("pro_credit_reference");
    expect(action).toContain('pro_credit_status: "not_configured"');
  });

  it("discloses the browser-bound one-deal delivery limits before checkout", () => {
    expect(purchaseDialog).toContain("one PDF");
    expect(purchaseDialog).toContain("exact analysis inputs");
    expect(purchaseDialog).toContain("same browser tab within 30 days");
    expect(purchaseDialog).toContain("retry for 24 hours");
    expect(purchaseDialog).toContain("does not create an account or cloud copy");
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
