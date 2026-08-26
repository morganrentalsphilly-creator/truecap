import { describe, expect, it } from "vitest";
import { resolveLocalSeedEnvironment } from "../../e2e/support/seed-local-user.mjs";

const valid = {
  PLAYWRIGHT_AUTH_TEST_ENVIRONMENT: "isolated",
  E2E_SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SERVICE_ROLE_KEY: "local-service-role-key",
  PLAYWRIGHT_AUTH_EMAIL: "internal-e2e@usetruecap.invalid",
  PLAYWRIGHT_AUTH_PASSWORD: "A-generated-local-password-123",
};

describe("local authenticated E2E seed guard", () => {
  it("accepts only the disposable loopback project", () => {
    expect(resolveLocalSeedEnvironment(valid)).toEqual({
      url: "http://127.0.0.1:54321",
      serviceRoleKey: "local-service-role-key",
      email: "internal-e2e@usetruecap.invalid",
      password: "A-generated-local-password-123",
    });
  });

  it.each([
    { E2E_SUPABASE_URL: "https://cpfbtvblaufrnxsrvmnm.supabase.co" },
    { E2E_SUPABASE_URL: "http://127.0.0.1:54322" },
    { E2E_SUPABASE_URL: "http://example.test:54321" },
    { PLAYWRIGHT_AUTH_TEST_ENVIRONMENT: "production" },
    { PLAYWRIGHT_AUTH_EMAIL: "person@example.com" },
    { PLAYWRIGHT_AUTH_PASSWORD: "too-short" },
  ])("rejects unsafe seed configuration %#", (override) => {
    expect(() =>
      resolveLocalSeedEnvironment({ ...valid, ...override }),
    ).toThrow();
  });
});
