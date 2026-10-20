"use client";

/**
 * App-wide error boundary. Catches any uncaught error from a route or its
 * child server/client components and renders a branded fallback instead
 * of the default Next.js error UI.
 *
 * - Must be a Client Component (Next.js requires "use client" here).
 * - `reset` re-renders the segment that threw — clicking "Try again"
 *   lets the user retry without a full page reload.
 */

import { useEffect } from "react";
import Link from "next/link";
import { captureExceptionLazy } from "@/lib/sentry/lazy";
import { RefreshCw } from "lucide-react";

export default function GlobalAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Forward to Sentry so production errors get proper stack-trace
    // logging — without this, route-level errors caught here would only
    // show up in the browser console, never in our error inbox.
    // (global-error.tsx already does this for root-layout crashes; we
    // need the same coverage for route-segment crashes.)
    // Lazy: this boundary is a client module on EVERY route, so a static
    // Sentry import would put the SDK core back on the critical path of
    // every marketing page (docs/site-overhaul.md Phase 7).
    void captureExceptionLazy(error);
    // Also keep the console line for local dev debugging.
    console.error("[app/error]", error);
  }, [error]);

  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center bg-background bg-sheet-grid px-4 text-center">
      <p className="font-mono text-xs text-muted-foreground">Error</p>
      <h1 className="mt-2 font-display text-balance text-2xl text-foreground sm:text-3xl">
        Something went wrong on our end
      </h1>
      <p className="mt-3 max-w-md text-pretty text-base text-muted-foreground">
        We hit an unexpected error while loading this page. Try again — most
        issues clear on a retry.{" "}
        {error?.digest ? (
          <span className="mt-1 block font-mono text-xs">
            Reference: {error.digest}
          </span>
        ) : null}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-[background-color] duration-150 hover:bg-primary-deep"
        >
          <RefreshCw className="size-4" aria-hidden />
          Try again
        </button>
        <Link
          href="/"
          className="tc-link inline-flex min-h-11 items-center text-sm font-medium"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
