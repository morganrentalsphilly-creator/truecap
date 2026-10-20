"use client";

/**
 * Last-resort error boundary that catches errors thrown by the root
 * layout itself. Unlike app/error.tsx, this MUST render its own <html>
 * and <body> — the root layout is gone by the time this runs.
 *
 * Keep this minimal: no fonts, no styled-system, no global CSS imports
 * other than what's strictly required for it to be legible.
 *
 * Sentry integration: forwards the error to Sentry (captureException) so
 * the root-layout crashes (which are the most catastrophic class) get
 * proper stack-trace logging in production. The SDK is loaded lazily at
 * capture time: this file is bundled into every route, and a static
 * `@sentry/nextjs` import here would ship Sentry core on every page.
 */

import { useEffect } from "react";
import { captureExceptionLazy } from "@/lib/sentry/lazy";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void captureExceptionLazy(error);
    console.error("[app/global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "2rem", margin: 0, background: "#fbfaf7" }}>
        <div style={{ maxWidth: 480, margin: "10vh auto", textAlign: "center" }}>
          <div style={{ fontSize: "0.75rem", fontFamily: "ui-monospace, monospace", color: "#5b6069", marginBottom: "0.5rem" }}>
            TrueCap
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 750, letterSpacing: "-0.025em", color: "#26292e", margin: "0 0 0.5rem" }}>
            Something went very wrong
          </h1>
          <p style={{ fontSize: "1rem", color: "#5b6069", lineHeight: 1.55 }}>
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
            // The Blueprint cobalt (#1853c6, DESIGN.md "Color") as hex, so this
            // last-resort page still feels like TrueCap. Inline styles
            // only — globals.css isn't loaded by global-error.tsx.
            style={{ marginTop: "1.5rem", background: "#1853c6", color: "#fff", border: "none", padding: "0.75rem 1.25rem", borderRadius: "8px", fontWeight: 600, minHeight: 44, cursor: "pointer" }}
          >
            Try again
          </button>
          <div style={{ marginTop: "1rem" }}>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error renders its own <html>/<body> outside the App Router, so next/link has no router context here; a plain <a> is required. */}
            <a
              href="/"
              style={{ fontSize: "0.875rem", color: "#1853c6", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              or go to the homepage
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
