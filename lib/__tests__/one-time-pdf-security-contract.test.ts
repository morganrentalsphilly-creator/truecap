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
const action = read("app/actions/one-time-pdf.ts");
const client = read("components/investcalc/investcalc-page.tsx");
const layout = read("app/layout.tsx");
const sentryClient = read("instrumentation-client.ts");
const sentryServer = read("sentry.server.config.ts");
const sentryEdge = read("sentry.edge.config.ts");

describe("one-time PDF security contract", () => {
  it("never puts a Stripe Checkout Session id or claim secret in the return URL", () => {
    expect(action).toContain("success_url: `${siteUrl}/?pdf_claim=");
    expect(action).not.toContain("pdf_purchase={CHECKOUT_SESSION_ID}");
    expect(action).not.toMatch(/success_url:[^\n]+claimSecret/);
  });

  it("binds redemption to a secret, exact deal, optional user, and an atomic consume", () => {
    expect(action).toContain("claim_secret_hash: claimSecretHash");
    expect(action).toContain("deal_fingerprint: dealFingerprint");
    expect(action).toContain("user_id: userId");
    expect(action).toContain('.gt("expires_at", consumedAt)');
    expect(action).toContain('.is("consumed_at", null)');
    expect(action).toContain("session.metadata?.claim_id !== initial.row.id");
    expect(action).toContain('session.payment_status !== "paid"');
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
      layout.indexOf("gtm-loader")
    );
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
  });

  it("leaves Pro credit dormant but preserves an auditable future ledger", () => {
    expect(migration).toContain("pro_credit_status text not null default 'not_configured'");
    expect(migration).toContain("pro_credit_amount_cents");
    expect(migration).toContain("pro_credit_eligible_until");
    expect(migration).toContain("pro_credit_applied_at");
    expect(migration).toContain("pro_credit_reference");
    expect(action).toContain('pro_credit_status: "not_configured"');
  });
});
