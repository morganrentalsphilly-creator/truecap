#!/usr/bin/env node

/**
 * Measure the locally served homepage without calling PageSpeed or any other
 * external service.
 *
 * The document request asks for identity encoding so `rawHtmlBytes` is the
 * exact response-body byte count. Chromium then loads the page with cache and
 * service workers disabled while every non-local request is blocked. CDP's
 * encodedDataLength is summed for first-party JavaScript, which reports the
 * actual local network bytes requested through initial hydration (including
 * chunks requested by the runtime, not only <script> tags in the HTML).
 *
 * Usage:
 *   npm run perf:homepage
 *   npm run perf:homepage -- --base http://127.0.0.1:3100 --json
 *   npm run perf:homepage -- --max-html-bytes 250000 --max-js-bytes 1500000
 *
 * A local Next server must already be running. Targets are loopback-only by
 * design, and browser requests to every other origin are aborted.
 */

import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";

const DEFAULT_URL = "http://127.0.0.1:3100/";
const MAX_REDIRECTS = 5;
const DEFAULT_BUDGETS = {
  maxHtmlBytes: 350 * 1024,
  maxJsBytes: 1024 * 1024,
  maxLcpMs: 2_500,
  maxCls: 0.1,
  maxLongTaskMs: 500,
};

export function isLoopbackHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  );
}

export function assertLocalUrl(value) {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol)) {
    throw new Error(`Only http(s) URLs are supported: ${url.href}`);
  }
  if (!isLoopbackHostname(url.hostname)) {
    throw new Error(
      `Refusing non-loopback target ${url.origin}. Run this measurement against a local server.`,
    );
  }
  url.hash = "";
  return url;
}

export function parseByteLimit(value, flag) {
  if (value === undefined) return null;
  const match = String(value)
    .trim()
    .toLowerCase()
    .match(/^(\d+(?:\.\d+)?)\s*(b|kb|kib|mb|mib)?$/);
  if (!match) {
    throw new Error(
      `${flag} must be a non-negative byte value (for example 900kb).`,
    );
  }
  const amount = Number(match[1]);
  const multiplier =
    match[2] === "mb" || match[2] === "mib"
      ? 1024 * 1024
      : match[2] === "kb" || match[2] === "kib"
        ? 1024
        : 1;
  return Math.round(amount * multiplier);
}

export function evaluateBudgets(result, budgets) {
  const failures = [];
  if (
    budgets.maxHtmlBytes !== null &&
    result.rawHtmlBytes > budgets.maxHtmlBytes
  ) {
    failures.push(
      `raw HTML ${result.rawHtmlBytes} B exceeds ${budgets.maxHtmlBytes} B`,
    );
  }
  if (
    budgets.maxJsBytes !== null &&
    result.firstPartyJavaScript.transferBytes > budgets.maxJsBytes
  ) {
    failures.push(
      `first-party JavaScript ${result.firstPartyJavaScript.transferBytes} B exceeds ${budgets.maxJsBytes} B`,
    );
  }
  if (
    budgets.maxLcpMs !== null &&
    result.coreWebVitals.lcpMs > budgets.maxLcpMs
  ) {
    failures.push(
      `mobile LCP ${result.coreWebVitals.lcpMs} ms exceeds ${budgets.maxLcpMs} ms`,
    );
  }
  if (budgets.maxCls !== null && result.coreWebVitals.cls > budgets.maxCls) {
    failures.push(
      `mobile CLS ${result.coreWebVitals.cls} exceeds ${budgets.maxCls}`,
    );
  }
  if (
    budgets.maxLongTaskMs !== null &&
    result.hydration.longTasks.totalDurationMs > budgets.maxLongTaskMs
  ) {
    failures.push(
      `long tasks ${result.hydration.longTasks.totalDurationMs} ms exceed ${budgets.maxLongTaskMs} ms`,
    );
  }
  return failures;
}

function parseNonNegativeNumber(value, flag) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${flag} must be a non-negative number.`);
  }
  return parsed;
}

function parseArguments(argv) {
  const options = {
    url: assertLocalUrl(DEFAULT_URL),
    json: false,
    help: false,
    ...DEFAULT_BUDGETS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const [flag, inlineValue] = argument.split("=", 2);
    const takeValue = () => {
      const value = inlineValue ?? argv[index + 1];
      if (
        value === undefined ||
        (inlineValue === undefined && value.startsWith("--"))
      ) {
        throw new Error(`${flag} requires a value.`);
      }
      if (inlineValue === undefined) index += 1;
      return value;
    };

    if (flag === "--base" || flag === "--url") {
      options.url = assertLocalUrl(takeValue());
    } else if (flag === "--max-html-bytes") {
      options.maxHtmlBytes = parseByteLimit(takeValue(), flag);
    } else if (flag === "--max-js-bytes") {
      options.maxJsBytes = parseByteLimit(takeValue(), flag);
    } else if (flag === "--max-lcp-ms") {
      options.maxLcpMs = parseNonNegativeNumber(takeValue(), flag);
    } else if (flag === "--max-cls") {
      options.maxCls = parseNonNegativeNumber(takeValue(), flag);
    } else if (flag === "--max-long-task-ms") {
      options.maxLongTaskMs = parseNonNegativeNumber(takeValue(), flag);
    } else if (flag === "--json") {
      options.json = true;
    } else if (flag === "--help" || flag === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }

  return options;
}

function requestRawHtml(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        method: "GET",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Encoding": "identity",
          "User-Agent": "TrueCap-local-homepage-transfer/1.0",
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location;
        if (status >= 300 && status < 400 && location) {
          response.resume();
          if (redirectCount >= MAX_REDIRECTS) {
            reject(
              new Error(`Too many redirects while requesting ${url.href}.`),
            );
            return;
          }
          const redirected = assertLocalUrl(new URL(location, url).href);
          if (redirected.origin !== url.origin) {
            reject(
              new Error(
                `Refusing cross-origin redirect to ${redirected.href}.`,
              ),
            );
            return;
          }
          requestRawHtml(redirected, redirectCount + 1).then(resolve, reject);
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.on("end", () => {
          const body = Buffer.concat(chunks);
          if (status < 200 || status >= 300) {
            reject(
              new Error(
                `Homepage request returned HTTP ${status} (${body.toString("utf8", 0, 200)}).`,
              ),
            );
            return;
          }
          resolve({ url, status, bytes: body.length });
        });
      },
    );

    request.setTimeout(30_000, () => {
      request.destroy(new Error(`Timed out requesting ${url.href}.`));
    });
    request.on("error", reject);
    request.end();
  });
}

export async function measureHomepageTransfer(targetUrl) {
  const requestedUrl = assertLocalUrl(targetUrl);
  const rawHtml = await requestRawHtml(requestedUrl);
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      serviceWorkers: "block",
      viewport: { width: 390, height: 844 },
    });
    const blockedExternalOrigins = new Set();
    await context.route("**/*", async (route) => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.origin === rawHtml.url.origin) {
        await route.continue();
        return;
      }
      blockedExternalOrigins.add(requestUrl.origin);
      await route.abort("blockedbyclient");
    });

    const page = await context.newPage();
    await page.addInitScript(() => {
      window.__truecapHomepagePerformance = {
        cls: 0,
        lcpMs: 0,
        longTaskCount: 0,
        longTaskDurationMs: 0,
      };

      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              window.__truecapHomepagePerformance.cls += entry.value;
            }
          }
        }).observe({ type: "layout-shift", buffered: true });
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries.at(-1);
          if (last) window.__truecapHomepagePerformance.lcpMs = last.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          window.__truecapHomepagePerformance.longTaskCount += entries.length;
          window.__truecapHomepagePerformance.longTaskDurationMs +=
            entries.reduce((sum, entry) => sum + entry.duration, 0);
        }).observe({ type: "longtask", buffered: true });
      } catch {
        // Older local Chromium builds can omit an observer type. The command's
        // final validity checks reject missing paint measurements instead of
        // treating an unobserved zero as a perfect result.
      }
    });
    const cdp = await context.newCDPSession(page);
    const scripts = new Map();
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Performance.enable");

    cdp.on("Network.responseReceived", (event) => {
      const responseUrl = new URL(event.response.url);
      const mimeType = event.response.mimeType.toLowerCase();
      if (
        responseUrl.origin === rawHtml.url.origin &&
        (event.type === "Script" || /javascript|ecmascript/.test(mimeType))
      ) {
        scripts.set(event.requestId, {
          url: responseUrl.href,
          transferBytes: 0,
        });
      }
    });

    cdp.on("Network.loadingFinished", (event) => {
      const script = scripts.get(event.requestId);
      if (script) script.transferBytes = Math.round(event.encodedDataLength);
    });

    await page.goto(rawHtml.url.href, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    const analyzerReadyStartedAt = await page.evaluate(() => performance.now());
    await page
      .locator('[data-calculator-ready="true"]')
      .waitFor({ state: "attached", timeout: 15_000 })
      .catch(() => undefined);
    const analyzerReadyAtMs = await page.evaluate(() => performance.now());
    await page
      .waitForLoadState("networkidle", { timeout: 10_000 })
      .catch(() => undefined);
    await page.waitForTimeout(500);

    const calculatorReady = await page
      .locator('[data-calculator-ready="true"]')
      .isVisible()
      .catch(() => false);
    const resources = [...scripts.values()].sort((a, b) =>
      a.url.localeCompare(b.url),
    );
    const browserMetrics = await cdp.send("Performance.getMetrics");
    const metric = (name) =>
      browserMetrics.metrics.find((candidate) => candidate.name === name)
        ?.value ?? 0;
    const pageMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0];
      const firstContentfulPaint = performance
        .getEntriesByName("first-contentful-paint")
        .at(-1);
      const observed = window.__truecapHomepagePerformance;
      return {
        domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? 0,
        loadEventMs: navigation?.loadEventEnd ?? 0,
        firstContentfulPaintMs: firstContentfulPaint?.startTime ?? 0,
        cls: observed?.cls ?? 0,
        lcpMs: observed?.lcpMs ?? 0,
        longTaskCount: observed?.longTaskCount ?? 0,
        longTaskDurationMs: observed?.longTaskDurationMs ?? 0,
        horizontalOverflowPx: Math.max(
          0,
          document.documentElement.scrollWidth - window.innerWidth,
        ),
      };
    });

    const heroInput = page.locator(
      '[data-hero-address-form] input[name="address"]',
    );
    const heroInputVisible = await heroInput.isVisible().catch(() => false);
    const heroInputBox = heroInputVisible
      ? await heroInput.boundingBox()
      : null;
    let heroInputAcceptsText = false;
    if (heroInputVisible) {
      await heroInput.fill("123 Main Street, Austin, TX 78701");
      heroInputAcceptsText =
        (await heroInput.inputValue()) === "123 Main Street, Austin, TX 78701";
    }

    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const seriousOrCritical = accessibility.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    );

    await context.close();

    return {
      url: rawHtml.url.href,
      measuredAt: new Date().toISOString(),
      rawHtmlBytes: rawHtml.bytes,
      firstPartyJavaScript: {
        requestCount: resources.length,
        transferBytes: resources.reduce(
          (total, resource) => total + resource.transferBytes,
          0,
        ),
        resources,
      },
      hydration: {
        analyzerReadyMs: Math.round(analyzerReadyAtMs),
        waitAfterDomContentLoadedMs: Math.round(
          analyzerReadyAtMs - analyzerReadyStartedAt,
        ),
        mainThreadTaskDurationMs: Math.round(metric("TaskDuration") * 1_000),
        scriptDurationMs: Math.round(metric("ScriptDuration") * 1_000),
        longTasks: {
          count: pageMetrics.longTaskCount,
          totalDurationMs: Math.round(pageMetrics.longTaskDurationMs),
        },
      },
      coreWebVitals: {
        firstContentfulPaintMs: Math.round(pageMetrics.firstContentfulPaintMs),
        lcpMs: Math.round(pageMetrics.lcpMs),
        cls: Number(pageMetrics.cls.toFixed(6)),
      },
      mobileRendering: {
        viewport: { width: 390, height: 844 },
        horizontalOverflowPx: pageMetrics.horizontalOverflowPx,
        heroAddressEntryVisible: heroInputVisible,
        heroAddressEntryAboveFold: Boolean(
          heroInputBox &&
          heroInputBox.y < 844 &&
          heroInputBox.y + heroInputBox.height > 0,
        ),
        heroAddressEntryAcceptsText: heroInputAcceptsText,
      },
      accessibility: {
        seriousOrCriticalViolationCount: seriousOrCritical.length,
        violations: seriousOrCritical.map(({ id, impact, help, nodes }) => ({
          id,
          impact,
          help,
          affectedNodeCount: nodes.length,
        })),
      },
      calculatorReady,
      blockedExternalOrigins: [...blockedExternalOrigins].sort(),
    };
  } finally {
    await browser.close();
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

function printHelp() {
  process.stdout.write(`Local homepage transfer measurement\n\n`);
  process.stdout.write(
    `  --base <url>             Loopback homepage URL (default ${DEFAULT_URL})\n`,
  );
  process.stdout.write(
    `  --json                   Emit machine-readable JSON\n`,
  );
  process.stdout.write(
    `  --max-html-bytes <size>  Optional raw HTML budget (supports kb/mb)\n`,
  );
  process.stdout.write(
    `  --max-js-bytes <size>    Optional first-party JS budget\n`,
  );
  process.stdout.write(
    `  --max-lcp-ms <number>    Mobile LCP budget (default 2500)\n`,
  );
  process.stdout.write(
    `  --max-cls <number>       Mobile CLS budget (default 0.1)\n`,
  );
  process.stdout.write(
    `  --max-long-task-ms <n>   Total long-task budget (default 500)\n`,
  );
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const result = await measureHomepageTransfer(options.url.href);
  const failures = evaluateBudgets(result, options);

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify({ ...result, budgetFailures: failures }, null, 2)}\n`,
    );
  } else {
    process.stdout.write(`Homepage transfer baseline: ${result.url}\n`);
    process.stdout.write(`Raw HTML: ${formatBytes(result.rawHtmlBytes)}\n`);
    process.stdout.write(
      `First-party JavaScript: ${formatBytes(result.firstPartyJavaScript.transferBytes)} across ${result.firstPartyJavaScript.requestCount} request(s)\n`,
    );
    process.stdout.write(
      `Analyzer hydrated: ${result.calculatorReady ? "yes" : "no (investigate before accepting this run)"}\n`,
    );
    process.stdout.write(
      `Mobile LCP / CLS: ${result.coreWebVitals.lcpMs} ms / ${result.coreWebVitals.cls}\n`,
    );
    process.stdout.write(
      `Hydration readiness / script time / long tasks: ${result.hydration.analyzerReadyMs} ms / ${result.hydration.scriptDurationMs} ms / ${result.hydration.longTasks.totalDurationMs} ms\n`,
    );
    process.stdout.write(
      `Mobile overflow: ${result.mobileRendering.horizontalOverflowPx}px; hero input usable: ${result.mobileRendering.heroAddressEntryAcceptsText ? "yes" : "no"}\n`,
    );
    process.stdout.write(
      `Serious/critical accessibility violations: ${result.accessibility.seriousOrCriticalViolationCount}\n`,
    );
    process.stdout.write(
      `External origins blocked: ${result.blockedExternalOrigins.length}\n`,
    );
    for (const failure of failures)
      process.stderr.write(`Budget failed: ${failure}\n`);
  }

  const functionalFailures =
    !result.calculatorReady ||
    result.coreWebVitals.firstContentfulPaintMs <= 0 ||
    result.coreWebVitals.lcpMs <= 0 ||
    result.mobileRendering.horizontalOverflowPx > 1 ||
    !result.mobileRendering.heroAddressEntryVisible ||
    !result.mobileRendering.heroAddressEntryAboveFold ||
    !result.mobileRendering.heroAddressEntryAcceptsText ||
    result.accessibility.seriousOrCriticalViolationCount > 0;
  if (functionalFailures || failures.length > 0) process.exitCode = 1;
}

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entryUrl) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
