import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SentryBuildOptions } from "@sentry/nextjs";

const mocks = vi.hoisted(() => ({ wrap: vi.fn() }));
vi.mock("@sentry/nextjs/config", () => ({ withSentryConfig: mocks.wrap }));
vi.mock("@next/bundle-analyzer", () => ({ default: () => (config: unknown) => config }));

// Exercise the installed SDK's option translation without instantiating its
// upload manager or making a network call. Review this contract on SDK updates.
const require = createRequire(import.meta.url);
const sdkRoot = dirname(require.resolve("@sentry/nextjs/package.json"));
const { getBuildPluginOptions } = require(join(sdkRoot, "build/cjs/config/getBuildPluginOptions.js")) as {
  getBuildPluginOptions(input: {
    sentryBuildOptions: SentryBuildOptions;
    releaseName: string;
    distDirAbsPath: string;
    buildTool: string;
  }): {
    errorHandler?: (error: Error) => void;
    sourcemaps: { disable: boolean; assets: string[]; filesToDeleteAfterUpload?: string[] };
    release: { name: string; create: boolean };
  };
};

async function loadOptions() {
  await import("../../next.config.mjs");
  const [next, sentry] = mocks.wrap.mock.calls[0] as [Record<string, unknown>, SentryBuildOptions];
  return { next, sentry };
}

beforeEach(() => {
  vi.resetModules();
  mocks.wrap.mockReset().mockImplementation((config: unknown) => config);
  vi.stubEnv("SENTRY_AUTH_TOKEN", "");
  vi.stubEnv("CI", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("private Sentry build uploads", () => {
  it("does not upload or create releases in token-free local and test builds", async () => {
    const { next, sentry } = await loadOptions();
    expect(sentry.sourcemaps?.disable).toBe(true);
    expect(sentry.release?.create).toBe(false);
    expect(sentry.silent).toBe(true);
    expect(next.productionBrowserSourceMaps).not.toBe(true);
    expect(sentry.telemetry).toBe(false);
  });

  it("enables visible private uploads when a build-only token is present", async () => {
    vi.stubEnv("SENTRY_AUTH_TOKEN", "unit-test-placeholder-not-a-credential");
    const { next, sentry } = await loadOptions();
    expect(sentry).toMatchObject({ org: "truecap", project: "javascript-nextjs", silent: false });
    expect(sentry.sourcemaps).toMatchObject({ disable: false, deleteSourcemapsAfterUpload: true });
    expect(sentry.release?.create).toBe(true);
    expect(sentry.authToken).toBeUndefined();
    expect(next.env).toBeUndefined();
    expect(next.productionBrowserSourceMaps).not.toBe(true);
  });

  it("passes public-map deletion and the same release through the installed webpack adapter", async () => {
    vi.stubEnv("SENTRY_AUTH_TOKEN", "unit-test-placeholder-not-a-credential");
    const { sentry } = await loadOptions();
    const plugin = getBuildPluginOptions({
      sentryBuildOptions: sentry,
      releaseName: "test-build-revision",
      distDirAbsPath: "/test-project/.next",
      buildTool: "webpack-client",
    });
    expect(plugin.sourcemaps.disable).toBe(false);
    expect(plugin.sourcemaps.assets).toContain("/test-project/.next/static/chunks/**");
    expect(plugin.sourcemaps.filesToDeleteAfterUpload).toContain("/test-project/.next/static/**/*.js.map");
    expect(plugin.release).toMatchObject({ name: "test-build-revision", create: true });
    const failure = new Error("Simulated source-map upload failure");
    expect(() => plugin.errorHandler?.(failure)).toThrow(failure);
  });
});
