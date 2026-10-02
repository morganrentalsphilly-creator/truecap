import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

const { initMock, captureMessageMock } = vi.hoisted(() => ({
  initMock: vi.fn(),
  captureMessageMock: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  init: initMock,
  captureException: vi.fn(),
  captureMessage: captureMessageMock,
  captureRouterTransitionStart: vi.fn(),
}));

import { initSentryClient } from "@/lib/sentry/client-init";
import { captureMessageLazy } from "@/lib/sentry/lazy";
import {
  POSTHOG_KEY_MISSING_NOTICE_PREFIX,
  isPerPageLoadConfigNotice,
} from "@/lib/sentry/self-noise";

type SentryEvent = Record<string, unknown>;
type InitOptions = {
  enabled: boolean;
  tracesSampleRate: number;
  ignoreErrors: RegExp[];
  beforeSend: (event: SentryEvent) => SentryEvent | null;
};

const ROOT = process.cwd();

/** The literal lib/analytics.ts hands to Sentry when the PostHog key is absent. */
function noticeSentByTheSite(): string {
  const source = readFileSync(join(ROOT, "lib/analytics.ts"), "utf8");
  const literal = source.match(/captureMessageLazy\(\s*"([^"]+)"/)?.[1];
  expect(literal, "lib/analytics.ts no longer sends the notice as a string literal").toBeDefined();
  return literal!;
}

let options: InitOptions;

beforeAll(() => {
  initSentryClient();
  expect(initMock).toHaveBeenCalledTimes(1);
  options = initMock.mock.calls[0][0] as InitOptions;
});

/**
 * Go-to-market audit 2026-10, row P1-63: every page load sent one
 * error-quota event about the site's own configuration, the quota ran out
 * and Sentry rejected every error envelope with 429.
 */
describe("the per-page-load PostHog notice no longer spends the Sentry error quota", () => {
  it("recognises the exact message the site sends, and nothing else", () => {
    const notice = noticeSentByTheSite();
    expect(notice.startsWith(POSTHOG_KEY_MISSING_NOTICE_PREFIX)).toBe(true);
    expect(isPerPageLoadConfigNotice({ message: notice })).toBe(true);
    expect(isPerPageLoadConfigNotice({ logentry: { message: notice } })).toBe(true);

    for (const other of [
      "CSP report-only violation",
      "[billing] Stripe price id missing for plan pro",
      "[analytics] buffered call failed",
      `prefix ${notice}`,
      "",
    ]) {
      expect(isPerPageLoadConfigNotice({ message: other }), other).toBe(false);
    }
    expect(isPerPageLoadConfigNotice({})).toBe(false);
    expect(isPerPageLoadConfigNotice({ message: 42, logentry: null })).toBe(false);
  });

  it("stops the notice at the lazy helper lib/analytics.ts calls, and lets other messages through", async () => {
    captureMessageMock.mockClear();
    await captureMessageLazy(noticeSentByTheSite(), {
      level: "warning",
      tags: { feature: "analytics" },
    });
    expect(captureMessageMock).not.toHaveBeenCalled();

    const context = { level: "warning" as const, tags: { feature: "not-found" } };
    await captureMessageLazy("404 on a linked page", context);
    expect(captureMessageMock).toHaveBeenCalledTimes(1);
    expect(captureMessageMock).toHaveBeenCalledWith("404 on a linked page", context);

    // The call the helper intercepts is the one the site makes.
    const analytics = readFileSync(join(ROOT, "lib/analytics.ts"), "utf8");
    expect(analytics).toContain('import { captureMessageLazy } from "@/lib/sentry/lazy";');
  });

  it("drops that notice in the browser's beforeSend", () => {
    const dropped = options.beforeSend({
      message: noticeSentByTheSite(),
      level: "warning",
      tags: { feature: "analytics" },
    });
    expect(dropped).toBeNull();
  });

  it("still sends every other message and every exception", () => {
    const message = { message: "[billing] checkout blocked by the catalog guard", level: "error" };
    expect(options.beforeSend(message)).toBe(message);

    const exception = {
      exception: { values: [{ type: "TypeError", value: "x is not a function" }] },
    };
    expect(options.beforeSend(exception)).toBe(exception);
  });

  it("leaves Sentry on, tracing at 100% and the triaged ignoreErrors list whole", () => {
    // CLAUDE.md section 8.7: this fix removes one event the site sends about
    // itself. It must not disable Sentry, lower a sample rate or drop a
    // triaged pattern.
    // Off only where scripts/dev-isolated.sh and the CI browser job say so.
    expect(options.enabled).toBe(process.env.NEXT_PUBLIC_SENTRY_DISABLED !== "1");
    expect(options.tracesSampleRate).toBe(1);
    const patterns = options.ignoreErrors.map((pattern) => pattern.source);
    expect(patterns).toHaveLength(12);
    for (const expected of [
      "Acquiring an exclusive Navigator LockManager lock",
      "lock:sb-.*-auth-token",
      "Cannot add property .+, object is not extensible",
      "NetworkError when attempting to fetch resource",
      "Failed to fetch",
      "Load failed",
      "AbortError",
      "The user aborted a request",
      "The operation was aborted",
      "signal is aborted without reason",
      "ResizeObserver loop",
      "Non-Error promise rejection captured with value:",
    ]) {
      expect(patterns, expected).toContain(expected);
    }
    // The notice is dropped by name in beforeSend, not hidden behind a
    // pattern that could swallow a neighbouring "[analytics]" message.
    expect(patterns.some((pattern) => /POSTHOG|analytics/i.test(pattern))).toBe(false);
  });
});
