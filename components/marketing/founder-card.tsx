import Link from "next/link";

/**
 * Founder presence, facts only (docs/site-overhaul.md Phase 4): name, one
 * sentence already published on /about, a link to /about. No photo — the
 * only permitted source is a real photograph on the owner's own account,
 * which this build could not verify, so the card renders without one.
 * No generated, downloaded, or substituted face — ever.
 */
export function FounderCard({ className = "" }: { className?: string }) {
  return (
    <aside
      aria-label="About the founder"
      className={`flex items-start gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5 ${className}`.trim()}
    >
      <div
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary"
      >
        MP
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">Morgan Page</p>
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
          Rental investor in Philadelphia. Built TrueCap for my own underwriting.
        </p>
        <Link
          href="/about"
          className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          About TrueCap →
        </Link>
      </div>
    </aside>
  );
}
