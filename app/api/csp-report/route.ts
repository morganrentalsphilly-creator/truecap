import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

const MAX_REPORT_BYTES = 20_000;
const MAX_REPORTS_PER_WINDOW = 50;
/**
 * Every POST counts against this before its body is read, so a flood is
 * answered without a read or a parse. It sits well above the forwarding
 * limit because the Ads-tag reports below arrive 4 or 5 to a consented view
 * and are dropped only after they have been read.
 */
const MAX_REQUESTS_PER_WINDOW = 600;
const WINDOW_MS = 60_000;
let reportWindowStartedAt = 0;
let reportCount = 0;
let requestWindowStartedAt = 0;
let requestCount = 0;

/**
 * The reports the consent-gated Google Ads tag (components/analytics/
 * google-measurement.tsx) causes on every consented page view. The
 * report-only policy in next.config.mjs does not list these hosts yet, so
 * each consented view posted 4 or 5 reports here and each one became a
 * Sentry event. With the per-page-load PostHog notice, these are the two
 * events the site sent about itself on every view; the 2026-10 audit's crawl
 * most likely used the error quota up through them (Sentry answered 429 from
 * 2026-10-01). Each entry is an origin the audit captured in a report body
 * and the directive it was reported under (script-src-elem for the tag's
 * script, connect-src for its beacons); a report matching both says nothing
 * new, so it is answered and not forwarded. The same origin under any other
 * directive, and every other origin, is still reported. When the policy
 * gains these hosts the reports stop at the browser and this list can go.
 */
const KNOWN_GOOGLE_ADS_ORIGINS: ReadonlyMap<string, "script-src" | "connect-src"> = new Map([
  ["https://googleads.g.doubleclick.net", "script-src"],
  ["https://ad.doubleclick.net", "connect-src"],
  ["https://www.google.com", "connect-src"],
  ["https://www.googleadservices.com", "connect-src"],
]);

type ReportBodyRead =
  | { oversized: true }
  | { oversized: false; body: Record<string, unknown> };

function rateLimitAllowsReport(now = Date.now()): boolean {
  if (now - reportWindowStartedAt >= WINDOW_MS) {
    reportWindowStartedAt = now;
    reportCount = 0;
  }
  reportCount += 1;
  return reportCount <= MAX_REPORTS_PER_WINDOW;
}

function requestCeilingAllows(now = Date.now()): boolean {
  if (now - requestWindowStartedAt >= WINDOW_MS) {
    requestWindowStartedAt = now;
    requestCount = 0;
  }
  requestCount += 1;
  return requestCount <= MAX_REQUESTS_PER_WINDOW;
}

function reportDirective(raw: Record<string, unknown>): string {
  return typeof raw["effective-directive"] === "string"
    ? raw["effective-directive"].slice(0, 100)
    : typeof raw["violated-directive"] === "string"
      ? raw["violated-directive"].slice(0, 100)
      : "unknown";
}

function safeOrigin(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 2_000) return null;
  if (raw === "inline" || raw === "eval" || raw === "self") return raw;
  try {
    const url = new URL(raw);
    return url.origin;
  } catch {
    return null;
  }
}

function safeDocumentRoute(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 2_000) return null;
  try {
    const url = new URL(raw);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "s" || parts[0] === "d" || parts[0] === "portal") {
      return `/${parts[0]}/:redacted`;
    }
    if (parts[0] === "dashboard" && parts[1] === "saved-analyses" && parts[2]) {
      return "/dashboard/saved-analyses/:id";
    }
    return url.pathname.slice(0, 500);
  } catch {
    return null;
  }
}

async function readReportBody(request: Request): Promise<ReportBodyRead> {
  if (!request.body) return { oversized: false, body: {} };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let decoded = "";
  let bytesRead = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_REPORT_BYTES) {
        await reader.cancel();
        return { oversized: true };
      }
      decoded += decoder.decode(value, { stream: true });
    }
    decoded += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  return {
    oversized: false,
    body: JSON.parse(decoded) as Record<string, unknown>,
  };
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_REPORT_BYTES) {
    return new NextResponse(null, { status: 413 });
  }
  // Past the ceiling, answer without reading the body: the order this route
  // had before the Ads-tag drop moved the forwarding limiter below the read.
  if (!requestCeilingAllows()) return new NextResponse(null, { status: 204 });

  try {
    const parsed = await readReportBody(request);
    if (parsed.oversized) return new NextResponse(null, { status: 413 });
    const body = parsed.body;
    const raw =
      body["csp-report"] && typeof body["csp-report"] === "object"
        ? (body["csp-report"] as Record<string, unknown>)
        : body;
    const blockedOrigin = safeOrigin(raw["blocked-uri"]);
    const directive = reportDirective(raw);
    const adsDirective = blockedOrigin
      ? KNOWN_GOOGLE_ADS_ORIGINS.get(blockedOrigin)
      : undefined;
    const knownAdsReport =
      adsDirective !== undefined && directive.startsWith(adsDirective);
    // Known Ads-tag reports are dropped before the forwarding limiter counts
    // them, so they cannot use up the window and push out a report that
    // matters.
    const forward = !knownAdsReport && rateLimitAllowsReport();
    if (!forward) {
      return new NextResponse(null, {
        status: 204,
        headers: { "Cache-Control": "no-store" },
      });
    }
    Sentry.captureMessage("CSP report-only violation", {
      level: "info",
      tags: { feature: "csp-report", directive },
      extra: {
        blockedOrigin,
        documentRoute: safeDocumentRoute(raw["document-uri"]),
        sourceOrigin: safeOrigin(raw["source-file"]),
      },
    });
  } catch {
    // Browser reports are advisory and may vary by user agent. Malformed
    // reports must never become an application error or echo their content.
  }

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
