import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

const MAX_REPORT_BYTES = 20_000;
const MAX_REPORTS_PER_WINDOW = 50;
const WINDOW_MS = 60_000;
let reportWindowStartedAt = 0;
let reportCount = 0;

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
  if (!rateLimitAllowsReport()) return new NextResponse(null, { status: 204 });

  try {
    const parsed = await readReportBody(request);
    if (parsed.oversized) return new NextResponse(null, { status: 413 });
    const body = parsed.body;
    const raw =
      body["csp-report"] && typeof body["csp-report"] === "object"
        ? (body["csp-report"] as Record<string, unknown>)
        : body;
    const directive =
      typeof raw["effective-directive"] === "string"
        ? raw["effective-directive"].slice(0, 100)
        : typeof raw["violated-directive"] === "string"
          ? raw["violated-directive"].slice(0, 100)
          : "unknown";
    Sentry.captureMessage("CSP report-only violation", {
      level: "info",
      tags: { feature: "csp-report", directive },
      extra: {
        blockedOrigin: safeOrigin(raw["blocked-uri"]),
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
