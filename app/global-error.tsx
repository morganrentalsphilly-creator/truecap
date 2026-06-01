"use client";

/**
 * Last-resort error boundary that catches errors thrown by the root
 * layout itself. Unlike app/error.tsx, this MUST render its own <html>
 * and <body> — the root layout is gone by the time this runs.
 *
 * Keep this minimal: no fonts, no styled-system, no global CSS imports
 * other than what's strictly required for it to be legible.
 *
 * Sentry integration: forwards the error to Sentry.captureException so
 * the root-layout crashes (which are the most catastrophic class) get
 * proper stack-trace logging in production.
 */

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("[app/global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "2rem", margin: 0, background: "#f8fafc" }}>
        <div style={{ maxWidth: 480, margin: "10vh auto", textAlign: "center" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#64748b", marginBottom: "0.5rem" }}>
            TrueCap
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem" }}>
            Something went very wrong
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#475569", lineHeight: 1.5 }}>
            We hit a serious error and can&apos;t recover gracefully. Try
            reloading the page.{" "}
            {error?.digest ? (
              <span style={{ display: "block", marginTop: "0.5rem", fontSize: "0.75rem", opacity: 0.7 }}>
                Reference: {error.digest}
              </span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            // Brand primary (#5248D4), not the default blue, so this
            // last-resort page still feels like TrueCap. Inline styles
            // only — globals.css isn't loaded by global-error.tsx.
            style={{ marginTop: "1.5rem", background: "#5248D4", color: "#fff", border: "none", padding: "0.625rem 1rem", borderRadius: "0.75rem", fontWeight: 700, cursor: "pointer" }}
          >
            Try again
          </button>
          <div style={{ marginTop: "1rem" }}>
            <a
              href="/"
              style={{ fontSize: "0.8125rem", color: "#475569", textDecoration: "underline" }}
            >
              or go to the homepage
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
