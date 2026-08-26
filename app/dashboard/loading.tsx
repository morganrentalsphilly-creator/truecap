/**
 * Loading state for dashboard pages. Renders INSIDE DashboardShell
 * (the segment layout keeps the sidebar mounted), so during tab
 * switches the user sees the sidebar + this content-area skeleton
 * instead of a white flash. Must match the shell's flex contract:
 * fill the row, own nothing outside the content pane.
 */

export default function DashboardLoading() {
  return (
    <main id="main" aria-busy="true" className="flex-1 min-w-0 flex flex-col">
      <span className="sr-only" role="status" aria-live="polite">
        Loading dashboard content…
      </span>
      <div aria-hidden="true" className="contents">
      {/* Topbar placeholder — same height band as the real Topbar so
          the page doesn't jump when content arrives. */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4 sm:px-6 lg:px-8">
        <div className="h-9 w-56 max-w-[50vw] rounded-lg bg-muted animate-pulse" />
        <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
      </div>

      {/* Mirrors the real first paint order (Decision Center band → 2 hero
          cards + stat strip → 4-up KPI grid → chart) so the page doesn't
          reflow/jump when content hydrates. */}
      <div className="flex-1 min-h-0 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-6">
        {/* H1 */}
        <div className="h-8 w-64 max-w-[70vw] rounded-lg bg-muted animate-pulse" />

        {/* Decision Center band (full-width) */}
        <div className="h-28 w-full rounded-2xl border border-border bg-card animate-pulse" />

        {/* 2 hero stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="h-4 w-24 rounded-md bg-muted animate-pulse" />
              <div className="h-9 w-36 rounded-md bg-muted animate-pulse" />
              <div className="h-3 w-3/4 rounded-md bg-muted animate-pulse" />
            </div>
          ))}
        </div>

        {/* one-line stat strip */}
        <div className="h-10 w-full rounded-xl border border-border bg-card/40 animate-pulse" />

        {/* 4-up KPI grid */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3 space-y-2">
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              <div className="h-6 w-16 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>

        {/* chart block */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <div className="h-5 w-48 rounded-md bg-muted animate-pulse" />
          <div className="h-64 w-full rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
      </div>
    </main>
  );
}
