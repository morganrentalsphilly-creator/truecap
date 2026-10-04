/**
 * Memo capture (docs/funnel-leaks-plan.md Phase A): the pure pieces — flag
 * parsing, the signed memo link, the summary composition, the email body's
 * escaping, and Turnstile's rollout states.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { buildMemoEmail } from "@/lib/email/memo-email";
import { isFunnelFlagOn } from "@/lib/funnel-flags";
import { investmentFormSchema } from "@/lib/investcalc-schema";
import { calculateMaxAllowableOffer } from "@/lib/max-allowable-offer";
import { buildMemoPath, isMemoLinkExpired, readMemoToken } from "@/lib/memo-lead";
import { buildMemoSummary, findMemoBreaker, memoMetricLines } from "@/lib/memo-summary";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import { buildSensitivityReport } from "@/lib/sensitivity-analysis";
import { verifyTurnstileToken } from "@/lib/turnstile";

const values = investmentFormSchema.parse(SAMPLE_DEAL_FIXTURE.values);
const LEAD_ID = "3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a6b";

describe("funnel flags", () => {
  it("is on only for the literal value 'on'", () => {
    expect(isFunnelFlagOn("FUNNEL_MEMO_CAPTURE", { FUNNEL_MEMO_CAPTURE: "on" })).toBe(true);
    expect(isFunnelFlagOn("FUNNEL_MEMO_CAPTURE", { FUNNEL_MEMO_CAPTURE: " ON " })).toBe(true);
    for (const value of [undefined, "", "off", "true", "1"]) {
      expect(isFunnelFlagOn("FUNNEL_MEMO_CAPTURE", { FUNNEL_MEMO_CAPTURE: value })).toBe(false);
    }
  });
});

describe("memo link token", () => {
  beforeEach(() => {
    process.env.SHARE_LINK_SECRET = "test-share-link-secret-abc123-0123456789";
  });
  afterEach(() => {
    delete process.env.SHARE_LINK_SECRET;
  });

  it("round-trips the lead id and rejects tampering", () => {
    const path = buildMemoPath(LEAD_ID);
    expect(path).toMatch(/^\/memo\/[A-Za-z0-9_-]+$/);
    const token = path!.slice("/memo/".length);
    expect(readMemoToken(token)).toBe(LEAD_ID);
    expect(readMemoToken(`${token.slice(0, -2)}xx`)).toBeNull();
    expect(readMemoToken("")).toBeNull();
  });

  it("fails safe without the signing secret", () => {
    delete process.env.SHARE_LINK_SECRET;
    expect(buildMemoPath(LEAD_ID)).toBeNull();
  });

  it("expires 180 days after the last request", () => {
    const requested = "2026-01-01T00:00:00.000Z";
    expect(isMemoLinkExpired(requested, new Date("2026-06-29T00:00:00.000Z"))).toBe(false);
    expect(isMemoLinkExpired(requested, new Date("2026-07-01T00:00:00.000Z"))).toBe(true);
    expect(isMemoLinkExpired("not a date")).toBe(true);
  });
});

describe("memo summary", () => {
  it("quotes exactly what the engines compute", () => {
    const analysis = calculateAnalysis(values);
    const summary = buildMemoSummary(values, {
      maoTarget: SAMPLE_DEAL_FIXTURE.maoTarget,
      includeOfferCeiling: true,
    });
    expect(summary.monthlyCashFlow).toBe(analysis.netCashFlow);
    expect(summary.capRatePct).toBe(analysis.capRate);
    expect(summary.dscr).toBe(analysis.dscr);
    expect(summary.offerCeiling?.maxPrice).toBe(
      calculateMaxAllowableOffer(values, SAMPLE_DEAL_FIXTURE.maoTarget)?.maxPrice,
    );
  });

  it("omits the Offer Ceiling when the caller is not entitled to it", () => {
    const summary = buildMemoSummary(values, { includeOfferCeiling: false });
    expect(summary.offerCeiling).toBeNull();
    expect(memoMetricLines(summary).map((l) => l.label)).not.toContain("Offer Ceiling");
  });

  it("names the preset downside that costs the most cash flow", () => {
    const breaker = findMemoBreaker(values);
    expect(breaker).not.toBeNull();
    const base = calculateAnalysis(values).netCashFlow;
    const worst = Math.min(
      ...buildSensitivityReport(values)!.map(
        (row) => row.scenarios.find((s) => s.name === "Stress")!.result.netCashFlow - base,
      ),
    );
    expect(breaker!.monthlyCashFlowChange).toBe(worst);
    expect(breaker!.monthlyCashFlowChange).toBeLessThan(0);
  });

  it("reports DSCR as not applicable on a cash purchase", () => {
    const cash = investmentFormSchema.parse({ ...SAMPLE_DEAL_FIXTURE.values, downPaymentPct: 100 });
    const summary = buildMemoSummary(cash, { includeOfferCeiling: false });
    expect(summary.dscr).toBeNull();
    expect(summary.breaker?.axis).not.toBe("interestRate");
  });
});

describe("memo email", () => {
  const summary = buildMemoSummary(values, { includeOfferCeiling: true });
  const build = (address: string) =>
    buildMemoEmail({
      summary,
      address,
      memoUrl: "https://usetruecap.com/memo/abc?utm_source=lifecycle",
      unsubscribeUrl: "https://usetruecap.com/email/unsubscribe?token=t",
      postalAddress: "123 Example St, Philadelphia, PA 19103",
    });

  it("carries the same numbers in text and HTML, one CTA, and the footer", () => {
    const { subject, text, html } = build("12 Main St, Philadelphia, PA");
    expect(subject.length).toBeLessThan(50);
    for (const line of memoMetricLines(summary)) {
      expect(text).toContain(`${line.label}: ${line.value}`);
      expect(html).toContain(line.label);
    }
    expect(text).toContain("https://usetruecap.com/memo/abc");
    expect(html.match(/href="https:\/\/usetruecap\.com\/memo\//g)).toHaveLength(1);
    expect(text).toContain("Unsubscribe: https://usetruecap.com/email/unsubscribe?token=t");
    expect(text).toContain("123 Example St");
    expect(html).toContain("123 Example St");
  });

  it("never lets address text become markup", () => {
    const { html, text } = build(`<img src=x onerror=alert(1)> "quoted" St`);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("onerror=alert(1)>");
    expect(text).not.toContain("<img");
  });
});

describe("Turnstile verification", () => {
  const fetchReturning = (body: unknown, ok = true) =>
    vi.fn(async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

  it("ignores the auth forms' widget, whose secret Supabase holds", async () => {
    expect(
      await verifyTurnstileToken("t", "1.2.3.4", {
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: "auth-site",
        TURNSTILE_SECRET_KEY: "auth-secret",
      }),
    ).toBe("not_configured");
  });

  it("is skipped only when captcha is not configured at all", async () => {
    expect(await verifyTurnstileToken("t", "1.2.3.4", {})).toBe("not_configured");
    expect(
      await verifyTurnstileToken("t", "1.2.3.4", { NEXT_PUBLIC_MEMO_TURNSTILE_SITE_KEY: "site" }),
    ).toBe("misconfigured");
  });

  it("requires a token Cloudflare accepts once the secret is set", async () => {
    const env = {
      MEMO_TURNSTILE_SECRET_KEY: "secret",
      NEXT_PUBLIC_MEMO_TURNSTILE_SITE_KEY: "site",
    };
    expect(await verifyTurnstileToken(undefined, "1.2.3.4", env)).toBe("failed");
    expect(await verifyTurnstileToken("t", "1.2.3.4", env, fetchReturning({ success: true }))).toBe("ok");
    expect(await verifyTurnstileToken("t", "1.2.3.4", env, fetchReturning({ success: false }))).toBe("failed");
    // A wrong secret is HTTP 400 with a JSON body: a rejection, not an outage.
    expect(
      await verifyTurnstileToken(
        "t",
        "1.2.3.4",
        env,
        fetchReturning({ success: false, "error-codes": ["invalid-input-secret"] }, false),
      ),
    ).toBe("failed");
    const noBody = vi.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error("not json");
      },
    })) as unknown as typeof fetch;
    expect(await verifyTurnstileToken("t", "1.2.3.4", env, noBody)).toBe("unavailable");
    const throwing = vi.fn(async () => {
      throw new Error("network");
    }) as unknown as typeof fetch;
    expect(await verifyTurnstileToken("t", "1.2.3.4", env, throwing)).toBe("unavailable");
  });
});
