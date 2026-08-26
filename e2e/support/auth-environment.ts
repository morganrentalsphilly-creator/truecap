type Environment = Record<string, string | undefined>;

export type AuthenticatedE2EEnvironment =
  | {
      enabled: false;
      reason: string;
    }
  | {
      enabled: true;
      email: string;
      password: string;
      baseUrl: string;
    };

const PRODUCTION_HOSTS = new Set([
  "usetruecap.com",
  "www.usetruecap.com",
  "pay.usetruecap.com",
]);

/**
 * Authenticated browser tests create and delete saved analyses and share
 * links. They therefore run only against an explicitly isolated environment.
 * Missing credentials are a legitimate, visible skip; an unsafe or partially
 * configured target is a hard configuration error instead of a silent skip.
 */
export function resolveAuthenticatedE2EEnvironment(
  environment: Environment
): AuthenticatedE2EEnvironment {
  const email = environment.PLAYWRIGHT_AUTH_EMAIL?.trim();
  const password = environment.PLAYWRIGHT_AUTH_PASSWORD;

  if (Boolean(email) !== Boolean(password)) {
    throw new Error(
      "Authenticated browser test credentials are only partially configured. Set both PLAYWRIGHT_AUTH_EMAIL and PLAYWRIGHT_AUTH_PASSWORD, or neither for a non-release public-only run."
    );
  }

  if (!email || !password) {
    if (environment.PLAYWRIGHT_REQUIRE_AUTH === "true") {
      throw new Error(
        "Authenticated browser regressions are required for this release run. Configure PLAYWRIGHT_AUTH_EMAIL and PLAYWRIGHT_AUTH_PASSWORD for the disposable test account."
      );
    }
    return {
      enabled: false,
      reason:
        "Authenticated workflows skipped: PLAYWRIGHT_AUTH_EMAIL and PLAYWRIGHT_AUTH_PASSWORD are not both configured.",
    };
  }

  if (environment.PLAYWRIGHT_AUTH_TEST_ENVIRONMENT !== "isolated") {
    throw new Error(
      "Authenticated browser tests mutate data. Set PLAYWRIGHT_AUTH_TEST_ENVIRONMENT=isolated only for a disposable test Supabase project."
    );
  }

  const baseUrl =
    environment.PLAYWRIGHT_BASE_URL?.trim() || "http://127.0.0.1:3100";
  let parsedBaseUrl: URL;
  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch {
    throw new Error("PLAYWRIGHT_BASE_URL must be an absolute http(s) URL.");
  }

  if (!/^https?:$/.test(parsedBaseUrl.protocol)) {
    throw new Error("PLAYWRIGHT_BASE_URL must use http or https.");
  }
  if (PRODUCTION_HOSTS.has(parsedBaseUrl.hostname.toLowerCase())) {
    throw new Error(
      "Authenticated browser tests are blocked against TrueCap production because they create test deals and share links."
    );
  }

  const runsLocalServer = !environment.PLAYWRIGHT_BASE_URL?.trim();
  if (
    runsLocalServer &&
    (!environment.E2E_SUPABASE_URL?.trim() ||
      !environment.E2E_SUPABASE_ANON_KEY?.trim())
  ) {
    throw new Error(
      "Local authenticated browser tests require E2E_SUPABASE_URL and E2E_SUPABASE_ANON_KEY for an isolated test project."
    );
  }

  return { enabled: true, email, password, baseUrl };
}
