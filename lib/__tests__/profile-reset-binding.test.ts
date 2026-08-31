import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));

vi.mock("@/lib/site-url", () => ({
  getSiteUrl: () => "https://truecap.test",
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mocks.getUser,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
    },
  })),
}));

import { requestPasswordResetAction } from "@/app/actions/auth";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("profile password-reset account binding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
  });

  it("rejects before sending when a deferred server identity check resolves as account B", async () => {
    let resolveUser!: (value: {
      data: { user: { id: string; email: string } };
      error: null;
    }) => void;
    mocks.getUser.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUser = resolve;
      }),
    );

    const pending = requestPasswordResetAction({
      email: "owner-a@example.com",
      profileBinding: {
        expectedUserId: USER_A,
        expectedEmail: "owner-a@example.com",
      },
    });
    resolveUser({
      data: { user: { id: USER_B, email: "owner-b@example.com" } },
      error: null,
    });

    await expect(pending).resolves.toEqual({
      ok: false,
      code: "SESSION_CHANGED",
      message:
        "Your signed-in account changed. Refresh this page before requesting a reset link.",
    });
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("preserves the anonymous forgot-password path without requiring a session", async () => {
    await expect(
      requestPasswordResetAction({ email: "Anyone@Example.com" }),
    ).resolves.toEqual({ ok: true });

    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "anyone@example.com",
      {
        redirectTo:
          "https://truecap.test/auth/callback?next=/auth/update-password",
      },
    );
  });

  it("rejects a bound target that is not the verified user's normalized email", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: USER_A, email: "current@example.com" } },
      error: null,
    });

    await expect(
      requestPasswordResetAction({
        email: "stale@example.com",
        profileBinding: {
          expectedUserId: USER_A,
          expectedEmail: "stale@example.com",
        },
      }),
    ).resolves.toMatchObject({ ok: false, code: "SESSION_CHANGED" });
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("allows a bound profile reset only for the exact verified normalized email", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: USER_A, email: "Owner-A@Example.com" } },
      error: null,
    });

    await expect(
      requestPasswordResetAction({
        email: "owner-a@example.com",
        profileBinding: {
          expectedUserId: USER_A,
          expectedEmail: "OWNER-A@EXAMPLE.COM",
        },
      }),
    ).resolves.toEqual({ ok: true });
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledOnce();
  });
});
