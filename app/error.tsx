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
import * as Sentry from "@sentry/nextjs";
import { ArrowUpRight, AlertTriangle, RefreshCw } from "lucide-react";

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
    Sentry.captureException(error);
    // Also keep the console line for local dev debugging.
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-red-50 text-[var(--metric-negative)]">
        <AlertTriangle className="size-6" />
      </div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2">
        TrueCap
      </div>
      <h1 className="text-xl sm:text-2xl font-bold text-foreground">
        Something went wrong on our end
      </h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">
        We hit an unexpected error while loading this page. Try again — most
        issues clear on a retry.{" "}
        {error?.digest ? (
          <span className="block mt-1 text-xs opacity-70">
            Reference: {error.digest}
          </span>
        ) : null}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-bold hover:opacity-90"
        >
          <RefreshCw className="size-4" />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
        >
          Go home
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
