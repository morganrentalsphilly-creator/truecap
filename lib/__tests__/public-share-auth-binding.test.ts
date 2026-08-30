import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  mintPublicShare: vi.fn(),
  resolvePublicShare: vi.fn(),
  captureServerEvent: vi.fn(),
  saveDealAction: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  })),
}));
vi.mock("@/lib/public-share", () => ({
  mintPublicShare: mocks.mintPublicShare,
  resolvePublicShare: mocks.resolvePublicShare,
}));
vi.mock("@/app/actions/saved-analyses", () => ({
  saveDealAction: mocks.saveDealAction,
}));
vi.mock("@/lib/ip-rate-limit", () => ({
  createIpRateLimit: vi.fn(() => ({ isOverLimit: vi.fn(() => false) })),
  getRequestIp: vi.fn(async () => "127.0.0.1"),
}));
vi.mock("@/lib/posthog-server", () => ({
  captureServerEvent: mocks.captureServerEvent,
}));
vi.mock("@/lib/site-url", () => ({ getSiteUrl: () => "https://usetruecap.com" }));

import {
  createPublicShareAction,
  listPublicSharesAction,
  revokePublicShareAction,
} from "@/app/actions/public-shares";
import { defaultValues } from "@/lib/investcalc-schema";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function deferredUserRead() {
  let resolve!: (value: {
    data: { user: { id: string } | null };
    error: null;
  }) => void;
  const promise = new Promise<{
    data: { user: { id: string } | null };
    error: null;
  }>((done) => {
    resolve = done;
  });
  mocks.getUser.mockReturnValueOnce(promise);
  return resolve;
}

describe("public-share exact auth binding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not mint account-A inputs when deferred auth resolves as account B", async () => {
    const resolveUser = deferredUserRead();
    const pending = createPublicShareAction({
      expectedUserId: USER_A,
      values: {
        ...defaultValues,
        address: "123 Account A Street, Philadelphia, PA",
        purchasePrice: 250_000,
        monthlyRent: 2_500,
      },
      addressVisibility: "hidden",
    });

    resolveUser({ data: { user: { id: USER_B } }, error: null });

    await expect(pending).resolves.toMatchObject({
      ok: false,
      code: "SESSION_CHANGED",
    });
    expect(mocks.mintPublicShare).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("does not return account-B rows to a deferred account-A list request", async () => {
    const resolveUser = deferredUserRead();
    const pending = listPublicSharesAction({
      offset: 0,
      expectedUserId: USER_A,
    });

    resolveUser({ data: { user: { id: USER_B } }, error: null });

    await expect(pending).resolves.toMatchObject({
      ok: false,
      code: "SESSION_CHANGED",
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("does not revoke under a different authenticated owner", async () => {
    const resolveUser = deferredUserRead();
    const pending = revokePublicShareAction({
      id: "11111111-1111-4111-8111-111111111111",
      dealId: null,
      expectedUserId: USER_A,
    });

    resolveUser({ data: { user: { id: USER_B } }, error: null });

    await expect(pending).resolves.toMatchObject({
      ok: false,
      code: "SESSION_CHANGED",
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
