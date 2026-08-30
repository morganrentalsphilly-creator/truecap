import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  getEntitlementsForUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  })),
}));

vi.mock("@/lib/entitlements", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/entitlements")>()),
  getEntitlementsForUser: mocks.getEntitlementsForUser,
}));

import { upsertAgentClientAction } from "@/app/actions/agent-clients";
import { setRateAlertEmailsAction } from "@/app/actions/email-preferences";
import { getPropertyCompsAction } from "@/app/actions/property-comps";
import { askDealQuestionAction } from "@/app/actions/deal-qa";
import { defaultValues } from "@/lib/investcalc-schema";
import { consumeProductEvaluationUsageAction } from "@/app/actions/product-evaluation";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

describe("account-global mutation identity binding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: USER_B, email: "b@example.test" } },
      error: null,
    });
    mocks.getEntitlementsForUser.mockResolvedValue({
      features: ["client_buy_box"],
    });
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("does not copy account A client PII into B when a deferred create crosses an account switch", async () => {
    await expect(
      upsertAgentClientAction(
        {
          name: "Account A client",
          email: "client-a@example.test",
          phone: "215-555-0101",
          notes: null,
          isArchived: false,
        },
        USER_A,
      ),
    ).resolves.toMatchObject({ ok: false, code: "SESSION_CHANGED" });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("does not apply account A's email-consent click to B", async () => {
    await expect(
      setRateAlertEmailsAction(true, USER_A),
    ).resolves.toMatchObject({ ok: false, code: "SESSION_CHANGED" });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("does not spend account B's comps allowance on account A's stale query", async () => {
    await expect(
      getPropertyCompsAction({
        address: "123 Account A St, Philadelphia, PA",
        propertyType: "single-family",
        expectedUserId: USER_A,
      }),
    ).resolves.toMatchObject({ ok: false, code: "SESSION_CHANGED" });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("does not spend B's AI allowance or send A's stale underwriting to the provider", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      askDealQuestionAction(
        {
          question: "What is the biggest risk?",
          values: {
            ...defaultValues,
            propertyType: "single-family",
            address: "123 Account A St, Philadelphia, PA",
            purchasePrice: 250_000,
            monthlyRent: 2_500,
            units: [],
          },
        },
        USER_A,
      ),
    ).resolves.toMatchObject({ ok: false, code: "SESSION_CHANGED" });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("does not debit B's evaluation ledger for A's stale deal", async () => {
    await expect(
      consumeProductEvaluationUsageAction(
        {
          kind: "deal",
          values: {
            ...defaultValues,
            propertyType: "single-family",
            address: "123 Account A St, Philadelphia, PA",
            purchasePrice: 250_000,
            monthlyRent: 2_500,
            units: [],
          },
        },
        USER_A,
      ),
    ).resolves.toMatchObject({ ok: false, code: "SESSION_CHANGED" });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
