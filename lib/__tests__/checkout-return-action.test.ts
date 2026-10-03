import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieGet: vi.fn(), cookieSet: vi.fn(), user: vi.fn(), retrieve: vi.fn(), complete: vi.fn(), sentry: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookieGet, set: mocks.cookieSet }) }));
vi.mock("@sentry/nextjs", () => ({ captureException: mocks.sentry, captureMessage: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: async () => ({
  auth: { getUser: mocks.user },
  from: () => {
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { stripe_price_id: "price_current_pro" }, error: null }) };
    return query;
  },
}) }));
vi.mock("@/lib/stripe/client", () => ({ getStripe: () => ({ checkout: { sessions: { retrieve: mocks.retrieve } } }) }));
vi.mock("@/lib/stripe/subscription-checkout-intent", () => ({ completeSubscriptionCheckoutIntentFromWebhook: mocks.complete }));
import { verifyCheckoutReturnAction } from "@/app/actions/billing";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("STRIPE_PRICE_PRO_MONTHLY", "price_current_pro");
  mocks.cookieGet.mockReturnValue({ value: "cs_test_return123" });
  mocks.user.mockResolvedValue({ data: { user: { id: "user-123" } } });
  mocks.retrieve.mockResolvedValue({
    mode: "subscription", status: "complete", payment_status: "paid", subscription: "sub_paid",
    client_reference_id: "user-123", metadata: { user_id: "user-123", plan_slug: "pro_monthly" },
    line_items: { data: [{ price: { id: "price_current_pro", unit_amount: 2999, currency: "usd" } }] },
    created: Math.floor(Date.now() / 1000) - 60,
  });
  mocks.complete.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("authenticated checkout cookie verification", () => {
  it("verifies an empty browser request using the cookie, returns the bound ID, then expires it", async () => {
    expect(await verifyCheckoutReturnAction({})).toEqual({
      ok: true, checkoutSessionId: "cs_test_return123", purchasedPlanSlug: "pro_monthly", conversionValue: 29.99,
    });
    expect(mocks.retrieve).toHaveBeenCalledWith("cs_test_return123", { expand: ["line_items"] });
    expect(mocks.complete).toHaveBeenCalledTimes(1);
    expect(mocks.cookieSet).toHaveBeenCalledWith("tc_checkout_return", "", expect.objectContaining({ httpOnly: true, maxAge: 0 }));
  });

  it("reports what the Session charged (amount_total), not the list price, as the conversion value", async () => {
    const session = await mocks.retrieve();
    // A coupon purchase: the Price still lists 2999, the buyer paid 2099.
    mocks.retrieve.mockResolvedValue({ ...session, amount_total: 2099 });
    expect(await verifyCheckoutReturnAction({})).toEqual({
      ok: true, checkoutSessionId: "cs_test_return123", purchasedPlanSlug: "pro_monthly", conversionValue: 20.99,
    });
  });

  it("reports a zero total as zero instead of falling back to the list price", async () => {
    const session = await mocks.retrieve();
    mocks.retrieve.mockResolvedValue({ ...session, amount_total: 0, payment_status: "no_payment_required" });
    expect(await verifyCheckoutReturnAction({})).toMatchObject({ ok: true, conversionValue: 0 });
  });

  it.each([null, undefined, -1, 20.5])("falls back to the list price when amount_total is %j", async (amountTotal) => {
    const session = await mocks.retrieve();
    mocks.retrieve.mockResolvedValue({ ...session, amount_total: amountTotal });
    expect(await verifyCheckoutReturnAction({})).toMatchObject({ ok: true, conversionValue: 29.99 });
  });

  it("returns nothing but the bound id, the plan and the value to the browser", async () => {
    const session = await mocks.retrieve();
    mocks.retrieve.mockResolvedValue({ ...session, amount_total: 2999, customer: "cus_private", subscription: "sub_private" });
    const result = await verifyCheckoutReturnAction({});
    expect(Object.keys(result).sort()).toEqual(["checkoutSessionId", "conversionValue", "ok", "purchasedPlanSlug"]);
    expect(JSON.stringify(result)).not.toMatch(/cus_private|sub_private/);
  });

  it("does not retrieve or clear a cookie when the visitor is signed out", async () => {
    mocks.user.mockResolvedValue({ data: { user: null } });
    expect(await verifyCheckoutReturnAction({})).toMatchObject({ ok: false, code: "SIGN_IN_REQUIRED" });
    expect(mocks.retrieve).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it("rejects a different user's session without completing the intent", async () => {
    const session = await mocks.retrieve();
    mocks.retrieve.mockResolvedValue({ ...session, client_reference_id: "other-user" });
    expect(await verifyCheckoutReturnAction({})).toMatchObject({ ok: false, code: "INVALID_RETURN" });
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it("rejects a completed Session whose delayed payment has not settled", async () => {
    const session = await mocks.retrieve();
    mocks.retrieve.mockResolvedValue({ ...session, payment_status: "unpaid" });
    expect(await verifyCheckoutReturnAction({})).toMatchObject({ ok: false, code: "INVALID_RETURN" });
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it("still returns ok when intent closure loses the race to the webhook (best-effort, reported)", async () => {
    mocks.complete.mockRejectedValue(new Error("checkout-intent completion failed: no-row"));
    expect(await verifyCheckoutReturnAction({})).toEqual({
      ok: true, checkoutSessionId: "cs_test_return123", purchasedPlanSlug: "pro_monthly", conversionValue: 29.99,
    });
    expect(mocks.complete).toHaveBeenCalledTimes(1);
    expect(mocks.sentry).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ tags: expect.objectContaining({ feature: "billing-checkout-return", stage: "intent-closure" }) }),
    );
    // The verified return is consumed exactly as on the happy path.
    expect(mocks.cookieSet).toHaveBeenCalledWith("tc_checkout_return", "", expect.objectContaining({ httpOnly: true, maxAge: 0 }));
  });

  it("keeps the cookie for retry after Stripe fails", async () => {
    mocks.retrieve.mockRejectedValue(new Error("unavailable"));
    expect(await verifyCheckoutReturnAction({})).toMatchObject({ ok: false, code: "SERVER_ERROR" });
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it.each([undefined, { value: "invalid" }])("fails closed on a missing or malformed cookie", async (cookie) => {
    mocks.cookieGet.mockReturnValue(cookie);
    expect(await verifyCheckoutReturnAction({})).toMatchObject({ ok: false, code: "INVALID_RETURN" });
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });
});
