import { describe, expect, it } from "vitest";
import { resolveAuthenticatedE2EEnvironment } from "../../e2e/support/auth-environment";

const isolatedLocalEnvironment = {
  PLAYWRIGHT_AUTH_EMAIL: "internal@example.test",
  PLAYWRIGHT_AUTH_PASSWORD: "test-only-password",
  PLAYWRIGHT_AUTH_TEST_ENVIRONMENT: "isolated",
  E2E_SUPABASE_URL: "http://127.0.0.1:54321",
  E2E_SUPABASE_ANON_KEY: "test-anon-key",
};

describe("authenticated Playwright environment", () => {
  it("skips only when the complete credential pair is unavailable", () => {
    expect(resolveAuthenticatedE2EEnvironment({})).toMatchObject({
      enabled: false,
      reason: expect.stringContaining("not both configured"),
    });
    expect(() =>
      resolveAuthenticatedE2EEnvironment({ PLAYWRIGHT_AUTH_EMAIL: "internal@example.test" })
    ).toThrow(/partially configured/i);
  });

  it("fails closed when a release run requires authenticated coverage", () => {
    expect(() =>
      resolveAuthenticatedE2EEnvironment({ PLAYWRIGHT_REQUIRE_AUTH: "true" })
    ).toThrow(/required for this release run/i);
    expect(() =>
      resolveAuthenticatedE2EEnvironment({
        PLAYWRIGHT_REQUIRE_AUTH: "true",
        PLAYWRIGHT_AUTH_EMAIL: "internal@example.test",
      })
    ).toThrow(/partially configured/i);
  });

  it("enables isolated local authentication with a disposable Supabase project", () => {
    expect(resolveAuthenticatedE2EEnvironment(isolatedLocalEnvironment)).toEqual({
      enabled: true,
      email: "internal@example.test",
      password: "test-only-password",
      baseUrl: "http://127.0.0.1:3100",
    });
  });

  it("fails loudly instead of silently targeting production or a partial environment", () => {
    expect(() =>
      resolveAuthenticatedE2EEnvironment({
        ...isolatedLocalEnvironment,
        PLAYWRIGHT_BASE_URL: "https://usetruecap.com",
      })
    ).toThrow(/blocked against TrueCap production/i);

    expect(() =>
      resolveAuthenticatedE2EEnvironment({
        PLAYWRIGHT_AUTH_EMAIL: "internal@example.test",
        PLAYWRIGHT_AUTH_PASSWORD: "test-only-password",
      })
    ).toThrow(/PLAYWRIGHT_AUTH_TEST_ENVIRONMENT=isolated/);

    expect(() =>
      resolveAuthenticatedE2EEnvironment({
        ...isolatedLocalEnvironment,
        E2E_SUPABASE_URL: undefined,
      })
    ).toThrow(/E2E_SUPABASE_URL/);
  });
});
