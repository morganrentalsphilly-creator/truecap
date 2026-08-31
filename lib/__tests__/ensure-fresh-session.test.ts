import type { SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  ensureFreshSession,
  getFreshSessionUser,
  getFreshSessionUserId,
} from "@/lib/supabase/ensure-fresh-session";

function clientWithAuth(auth: Record<string, unknown>): SupabaseClient {
  return { auth } as unknown as SupabaseClient;
}

function session(userId: string, expiresInSeconds: number) {
  return {
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    token_type: "bearer",
    expires_in: expiresInSeconds,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    user: { id: userId },
  };
}

describe("fresh browser Supabase session", () => {
  it("server-verifies the current user before returning an owner path id", async () => {
    const current = session("user-a", 3_600);
    const refreshSession = vi.fn();
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-a" } },
      error: null,
    });
    const supabase = clientWithAuth({
      getSession: vi.fn().mockResolvedValue({ data: { session: current }, error: null }),
      refreshSession,
      getUser,
    });

    await expect(getFreshSessionUser(supabase)).resolves.toEqual({
      ok: true,
      userId: "user-a",
    });
    expect(refreshSession).not.toHaveBeenCalled();
    expect(getUser).toHaveBeenCalledOnce();
  });

  it("refreshes an expiring token and uses the refreshed verified identity", async () => {
    const expiring = session("user-a", 10);
    const refreshed = session("user-a", 3_600);
    const refreshSession = vi.fn().mockResolvedValue({
      data: { session: refreshed },
      error: null,
    });
    const supabase = clientWithAuth({
      getSession: vi.fn().mockResolvedValue({ data: { session: expiring }, error: null }),
      refreshSession,
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-a" } },
        error: null,
      }),
    });

    await expect(getFreshSessionUser(supabase)).resolves.toEqual({
      ok: true,
      userId: "user-a",
    });
    expect(refreshSession).toHaveBeenCalledOnce();
  });

  it("fails closed when browser session identity and verified user differ", async () => {
    const current = session("stale-user", 3_600);
    const supabase = clientWithAuth({
      getSession: vi.fn().mockResolvedValue({ data: { session: current }, error: null }),
      refreshSession: vi.fn(),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "current-user" } },
        error: null,
      }),
    });

    await expect(getFreshSessionUser(supabase)).resolves.toEqual({
      ok: false,
      reason: "identity_mismatch",
    });
  });

  it("classifies a clean no-session refresh as signed out", async () => {
    const supabase = clientWithAuth({
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      refreshSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn(),
    });

    await expect(getFreshSessionUser(supabase)).resolves.toEqual({
      ok: false,
      reason: "signed_out",
    });
  });

  it("classifies Supabase's explicit missing-session error as signed out", async () => {
    const supabase = clientWithAuth({
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: { name: "AuthSessionMissingError", message: "Auth session missing!" },
      }),
      refreshSession: vi.fn(),
      getUser: vi.fn(),
    });

    await expect(getFreshSessionUser(supabase)).resolves.toEqual({
      ok: false,
      reason: "signed_out",
    });
  });

  it("returns a telemetry-safe unavailable result for getSession failures", async () => {
    const supabase = clientWithAuth({
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: {
          name: "AuthRetryableFetchError",
          code: "request_timeout",
          status: 503,
          message: "Failed to fetch https://project.invalid/auth?token=customer-secret",
        },
      }),
      refreshSession: vi.fn(),
      getUser: vi.fn(),
    });

    const result = await getFreshSessionUser(supabase);
    expect(result).toMatchObject({
      ok: false,
      reason: "unavailable",
      error: {
        name: "FreshSessionVerificationError",
        step: "get-session",
        upstreamName: "AuthRetryableFetchError",
        upstreamCode: "request_timeout",
        upstreamStatus: 503,
      },
    });
    if (result.ok || result.reason !== "unavailable") throw new Error("Expected unavailable");
    expect(result.error.message).not.toMatch(/customer-secret|project\.invalid|failed to fetch/i);
  });

  it("does not misreport a transient refresh failure as a sign-out", async () => {
    const expiring = session("user-a", 10);
    const supabase = clientWithAuth({
      getSession: vi.fn().mockResolvedValue({ data: { session: expiring }, error: null }),
      refreshSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: { name: "AuthRetryableFetchError", status: 502, message: "Load failed" },
      }),
      getUser: vi.fn(),
    });

    await expect(getFreshSessionUser(supabase)).resolves.toMatchObject({
      ok: false,
      reason: "unavailable",
      error: { step: "refresh-session", upstreamStatus: 502 },
    });
  });

  it("does not misreport a transient server verification failure as a sign-out", async () => {
    const current = session("user-a", 3_600);
    const supabase = clientWithAuth({
      getSession: vi.fn().mockResolvedValue({ data: { session: current }, error: null }),
      refreshSession: vi.fn(),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { name: "AuthRetryableFetchError", status: 503, message: "NetworkError" },
      }),
    });

    await expect(getFreshSessionUser(supabase)).resolves.toMatchObject({
      ok: false,
      reason: "unavailable",
      error: { step: "get-user", upstreamStatus: 503 },
    });
  });

  it("sanitizes exceptions thrown by the auth client", async () => {
    const supabase = clientWithAuth({
      getSession: vi.fn().mockRejectedValue(
        new Error("Failed to fetch https://project.invalid/auth?token=customer-secret"),
      ),
      refreshSession: vi.fn(),
      getUser: vi.fn(),
    });

    const result = await getFreshSessionUser(supabase);
    expect(result).toMatchObject({
      ok: false,
      reason: "unavailable",
      error: { step: "get-session", upstreamName: "Error" },
    });
    if (result.ok || result.reason !== "unavailable") throw new Error("Expected unavailable");
    expect(JSON.stringify(result.error)).not.toMatch(/customer-secret|project\.invalid/i);
  });

  it("keeps compatibility wrappers fail-closed", async () => {
    const current = session("stale-user", 3_600);
    const supabase = clientWithAuth({
      getSession: vi.fn().mockResolvedValue({ data: { session: current }, error: null }),
      refreshSession: vi.fn(),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "current-user" } },
        error: null,
      }),
    });

    await expect(getFreshSessionUserId(supabase)).resolves.toBeNull();
    await expect(ensureFreshSession(supabase)).resolves.toBe(false);
  });

  it("derives the avatar owner path only after verifying the current account", () => {
    const profile = readFileSync(
      join(process.cwd(), "components/profile/profile-form.tsx"),
      "utf8",
    );
    const verify = profile.indexOf(
      "const freshSession = await getFreshSessionUser(supabase)",
    );
    const successId = profile.indexOf("const freshUserId = freshSession.userId", verify);
    const accountGuard = profile.indexOf("if (freshUserId !== userId)", successId);
    const derivePath = profile.indexOf(
      "const path = `${freshUserId}/avatar-${Date.now()}.webp`",
      accountGuard,
    );

    expect(verify).toBeGreaterThan(-1);
    expect(successId).toBeGreaterThan(verify);
    expect(accountGuard).toBeGreaterThan(successId);
    expect(derivePath).toBeGreaterThan(accountGuard);
    expect(profile).not.toContain("const path = `${userId}/avatar-");
  });
});
