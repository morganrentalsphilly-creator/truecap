/**
 * Branded 404 page. Renders for any URL that doesn't match a route in
 * the App Router. Keeps the user inside the funnel — links back to
 * the homepage and the /tools landing instead of dumping them out.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Compass, Calculator } from "lucide-react";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-blue-light)] text-primary">
        <Compass className="size-6" />
      </div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2">
        TrueCap
      </div>
      <h1 className="text-2xl sm:text-3xl font-black text-foreground">
        404 — page not found
      </h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has moved. Try
        the homepage to start a new analysis, or jump to one of our free
        calculators.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-bold hover:opacity-90"
        >
          Open TrueCap
          <ArrowUpRight className="size-4" />
        </Link>
        <Link
          href="/tools"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
        >
          <Calculator className="size-4" />
          Browse free calculators
        </Link>
      </div>
    </div>
  );
}
