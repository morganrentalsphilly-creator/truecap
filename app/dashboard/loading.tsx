/**
 * Branded loading state for /dashboard and nested routes. Server pages
 * run auth + entitlements + a few DB queries before rendering — without
 * a loading.tsx the user sees only the browser tab spinner.
 *
 * Kept intentionally simple: a top brand-mark, then a skeleton page
 * shell that mirrors the eventual dashboard layout (sidebar + main grid).
 */

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-7 w-40 rounded-lg bg-muted animate-pulse" />
          <div className="h-9 w-32 rounded-xl bg-muted animate-pulse" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card p-5 space-y-3"
            >
              <div className="h-4 w-24 rounded-md bg-muted animate-pulse" />
              <div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
              <div className="h-3 w-full rounded-md bg-muted animate-pulse" />
              <div className="h-3 w-3/4 rounded-md bg-muted animate-pulse" />
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6 space-y-3">
          <div className="h-5 w-48 rounded-md bg-muted animate-pulse" />
          <div className="h-64 w-full rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}
