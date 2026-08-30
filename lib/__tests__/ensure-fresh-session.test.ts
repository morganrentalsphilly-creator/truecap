import type { SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  ensureFreshSession,
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

    await expect(getFreshSessionUserId(supabase)).resolves.toBe("user-a");
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

    await expect(getFreshSessionUserId(supabase)).resolves.toBe("user-a");
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

    await expect(getFreshSessionUserId(supabase)).resolves.toBeNull();
    await expect(ensureFreshSession(supabase)).resolves.toBe(false);
  });

  it("fails closed when an absent session cannot be refreshed", async () => {
    const supabase = clientWithAuth({
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      refreshSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: new Error("refresh rejected"),
      }),
      getUser: vi.fn(),
    });

    await expect(getFreshSessionUserId(supabase)).resolves.toBeNull();
  });

  it("derives the avatar owner path only after verifying the current account", () => {
    const profile = readFileSync(
      join(process.cwd(), "components/profile/profile-form.tsx"),
      "utf8",
    );
    const verify = profile.indexOf(
      "const freshUserId = await getFreshSessionUserId(supabase)",
    );
    const accountGuard = profile.indexOf("if (freshUserId !== userId)", verify);
    const derivePath = profile.indexOf(
      "const path = `${freshUserId}/avatar-${Date.now()}.webp`",
      accountGuard,
    );

    expect(verify).toBeGreaterThan(-1);
    expect(accountGuard).toBeGreaterThan(verify);
    expect(derivePath).toBeGreaterThan(accountGuard);
    expect(profile).not.toContain("const path = `${userId}/avatar-");
  });
});
