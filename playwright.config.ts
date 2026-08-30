import { defineConfig, devices } from "@playwright/test";
import { resolveAuthenticatedE2EEnvironment } from "./e2e/support/auth-environment";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const localBaseUrl = "http://127.0.0.1:3100";
const authEnvironment = resolveAuthenticatedE2EEnvironment(process.env);
const authStatePath = "playwright/.auth/internal-test-user.json";
const authenticatedSpecPattern = /authenticated-.*\.spec\.ts/;
const visualSpecPattern = /visual-.*\.spec\.ts/;
const captureVisuals = process.env.PLAYWRIGHT_CAPTURE_VISUALS === "true";
const useProductionServer =
  process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER === "true";

const publicProject = {
  name: "public-chromium",
  testIgnore: [/auth\.setup\.ts/, authenticatedSpecPattern, visualSpecPattern],
  use: { ...devices["Desktop Chrome"] },
};

const authenticatedProject = {
  name: "authenticated-chromium",
  testMatch: authenticatedSpecPattern,
  dependencies: authEnvironment.enabled ? ["auth-setup"] : [],
  use: {
    ...devices["Desktop Chrome"],
    ...(authEnvironment.enabled ? { storageState: authStatePath } : {}),
  },
};

const visualUse = {
  ...devices["Desktop Chrome"],
  trace: "off" as const,
  screenshot: "off" as const,
  video: "off" as const,
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // Authenticated workflows intentionally share one disposable Pro account.
  // Serial CI execution prevents cross-test writes and retries from racing
  // one another while still exercising the complete production build.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: externalBaseUrl ?? localBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    contextOptions: { reducedMotion: "reduce" },
  },
  projects: [
    publicProject,
    ...(authEnvironment.enabled
      ? [
          {
            name: "auth-setup",
            testMatch: /auth\.setup\.ts/,
            use: { ...devices["Desktop Chrome"] },
          },
        ]
      : []),
    authenticatedProject,
    ...(captureVisuals
      ? [
          {
            name: "visual-public",
            testMatch: /visual-public\.spec\.ts/,
            use: visualUse,
          },
          {
            name: "visual-authenticated",
            testMatch: /visual-authenticated\.spec\.ts/,
            dependencies: authEnvironment.enabled ? ["auth-setup"] : [],
            use: {
              ...visualUse,
              ...(authEnvironment.enabled
                ? { storageState: authStatePath }
                : {}),
            },
          },
        ]
      : []),
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: useProductionServer
          ? "npm run start -- --hostname 127.0.0.1 --port 3100"
          : "npm run dev -- --hostname 127.0.0.1 --port 3100",
        url: localBaseUrl,
        // A production server holds prerendered HTML in memory. Reusing it
        // after another build rewrites `.next` can pair old HTML with new
        // chunk hashes and silently disable all hydration. Dev reuse remains
        // convenient; production-mode verification always owns a fresh build.
        reuseExistingServer: !process.env.CI && !useProductionServer,
        timeout: 120_000,
        env: {
          // getSiteUrl() is evaluated while static embed pages render. Keep
          // local dev-server HTML on the same origin Playwright actually
          // serves instead of baking the normal localhost:3000 fallback into
          // links while this harness listens on 127.0.0.1:3100.
          NEXT_PUBLIC_SITE_URL:
            process.env.NEXT_PUBLIC_SITE_URL?.trim() || localBaseUrl,
          NEXT_PUBLIC_SUPABASE_URL:
            process.env.E2E_SUPABASE_URL?.trim() || "http://127.0.0.1:54321",
          NEXT_PUBLIC_SUPABASE_ANON_KEY:
            process.env.E2E_SUPABASE_ANON_KEY?.trim() || "truecap-e2e-anon-key",
          SHARE_LINK_SECRET:
            process.env.SHARE_LINK_SECRET?.trim() ||
            "truecap-e2e-anonymous-decision-signing-secret",
        },
      },
});
