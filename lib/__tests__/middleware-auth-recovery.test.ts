import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Middleware runs on every non-static route (proxy.ts matcher), so anything
 * that escapes updateSession 500s the whole site — marketing pages included.
 *
 * Note on the production "Invalid Refresh Token" cluster: that error does NOT
 * reach this code. @supabase/auth-js catches it internally, returns
 * { user: null, error }, and clears the dead cookie itself. These tests
 * therefore pin the case that DOES escape — auth-js rethrows non-AuthError
 * failures — and pin that a healthy session is never disturbed.
 */

const getUser = vi.fn();
const setAllSpy = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    config: {
      cookies: {
        getAll: () => { name: string; value: string }[];
        setAll: (cookies: { name: string; value: string; options?: unknown }[]) => void;
      };
    }
  ) => {
    // Exercise the real cookie plumbing the way @supabase/ssr would.
    config.cookies.getAll();
    setAllSpy.mockImplementation(config.cookies.setAll);
    return { auth: { getUser } };
  },
}));

// Static import is safe with vi.mock's hoisting, and avoids top-level await
// (not permitted by this tsconfig's module target).
import { updateSession } from "@/lib/supabase/middleware";

function requestWithAuthCookies() {
  const request = new NextRequest("https://usetruecap.com/dashboard");
  request.cookies.set("sb-cpfbtvblaufrnxsrvmnm-auth-token.0", "token-part-0");
  request.cookies.set("sb-cpfbtvblaufrnxsrvmnm-auth-token.1", "token-part-1");
  request.cookies.set("unrelated-preference", "keep-me");
  return request;
}

/** Cookie names this response instructs the browser to drop. */
function clearedCookieNames(response: {
  cookies: { getAll: () => { name: string; value: string }[] };
}) {
  return response.cookies
    .getAll()
    .filter((cookie) => cookie.value === "")
    .map((cookie) => cookie.name)
    .sort();
}

beforeEach(() => {
  getUser.mockReset();
  setAllSpy.mockReset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://cpfbtvblaufrnxsrvmnm.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
});

describe("middleware never lets a session failure take down the site", () => {
  it("returns a response instead of throwing when getUser rejects", async () => {
    // The class auth-js genuinely rethrows (non-AuthError, e.g. a broken
    // fetch polyfill). Unhandled, this 500s every route behind the matcher.
    getUser.mockRejectedValue(new Error("fetch failed"));
    await expect(updateSession(requestWithAuthCookies())).resolves.toBeDefined();
  });

  it("does not sign out a healthy session when the auth server is unreachable", async () => {
    getUser.mockRejectedValue(
      Object.assign(new Error("service unavailable"), { __isAuthError: true, status: 503 })
    );
    const response = await updateSession(requestWithAuthCookies());
    expect(clearedCookieNames(response)).toEqual([]);
  });

  it("leaves cookies untouched on the happy path", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const response = await updateSession(requestWithAuthCookies());
    expect(clearedCookieNames(response)).toEqual([]);
  });

  it("marks the session cookie Secure in production, everywhere it is written", async () => {
    // @supabase/ssr's defaults omit `secure`, so the 400-day session cookie
    // was eligible to be sent over plain http. Every factory that mints,
    // refreshes, or clears the cookie must pass the shared policy — the one
    // that MINTS it (app/auth/callback) matters most.
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const factories = [
      "lib/supabase/middleware.ts",
      "lib/supabase/server.ts",
      "lib/supabase/client.ts",
      "app/auth/callback/route.ts",
      "app/auth/sign-out/route.ts",
    ];
    for (const factory of factories) {
      const source = readFileSync(join(process.cwd(), factory), "utf8");
      expect(source, `${factory} must apply the shared cookie policy`).toContain(
        "cookieOptions: SUPABASE_COOKIE_OPTIONS"
      );
    }
    const policy = readFileSync(
      join(process.cwd(), "lib/supabase/cookie-options.ts"),
      "utf8"
    );
    expect(policy).toContain('secure: process.env.NODE_ENV === "production"');
    // httpOnly must stay at the library default — the browser client reads
    // this cookie via document.cookie, so forcing it would break sign-in.
    expect(policy).not.toContain("httpOnly: true");
  });

  it("propagates cookie writes the auth library makes (its own stale-token cleanup)", async () => {
    // Real auth-js clears a dead token via setAll() rather than by throwing.
    // That path must reach the outgoing response, or the browser keeps
    // replaying the dead token forever.
    getUser.mockImplementation(async () => {
      setAllSpy([
        {
          name: "sb-cpfbtvblaufrnxsrvmnm-auth-token.0",
          value: "",
          options: { path: "/", maxAge: 0 },
        },
      ]);
      return { data: { user: null }, error: { message: "Invalid Refresh Token" } };
    });
    const response = await updateSession(requestWithAuthCookies());
    expect(clearedCookieNames(response)).toContain(
      "sb-cpfbtvblaufrnxsrvmnm-auth-token.0"
    );
  });
});
