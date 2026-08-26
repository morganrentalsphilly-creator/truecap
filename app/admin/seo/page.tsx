import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkAdmin } from "@/lib/admin-guard";
import { loadSeoDashboard } from "@/lib/seo/control-plane/dashboard";

export const metadata: Metadata = {
  title: "SEO Control Plane · TrueCap Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const fmt = (value: number) => new Intl.NumberFormat("en-US").format(value);
const decimal = (value: number | null) => value === null ? "—" : value.toFixed(1);
const percent = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1)}%`;

function Card({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-foreground">{value}</p>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

export default async function SeoAdminPage() {
  const admin = await checkAdmin();
  if (!admin.ok) {
    if (admin.reason === "UNAUTHENTICATED") redirect("/auth/login?next=/admin/seo");
    notFound();
  }
  const data = await loadSeoDashboard();
  const config = data.config;

  return (
    <main id="main" className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Admin · SEO control plane</p>
            <h1 className="mt-1 text-3xl font-extrabold text-foreground">Search growth, truth, and health</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Mode: <strong className="text-foreground">{config.enabled ? config.mode : "observe (global switch off)"}</strong>
              {" · "}autopublish: <strong className="text-foreground">{config.autopublishEnabled ? "enabled" : "disabled"}</strong>
              {" · "}daily mutation cap: {config.dailyMutationCap}
              {" · "}weekly publication cap: {config.weeklyPublicationCap}
            </p>
          </div>
          <Link href="/admin/email-preview" className="text-sm font-semibold text-primary hover:underline">Email admin →</Link>
        </header>

        {!data.configured ? (
          <section className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-foreground">
            <strong>Control plane is not receiving database data yet.</strong>{" "}
            Apply <code>20260815120000_seo_control_plane.sql</code>, then add the documented GSC and Supabase GitHub Actions secrets.
            {data.error ? <span className="mt-2 block text-xs text-muted-foreground">Diagnostic: {data.error}</span> : null}
          </section>
        ) : null}

        <section aria-labelledby="growth" className="mb-10">
          <h2 id="growth" className="mb-4 text-xl font-extrabold text-foreground">28-day organic growth</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card label="Clicks" value={fmt(data.growth.clicks)} />
            <Card label="Impressions" value={fmt(data.growth.impressions)} />
            <Card label="CTR" value={percent(data.growth.ctr)} />
            <Card label="Average position" value={decimal(data.growth.averagePosition)} />
            <Card label="Non-brand clicks" value={fmt(data.growth.nonbrandClicks)} />
            <Card label="Analyzer starts" value={fmt(data.growth.analyzerStarts)} />
            <Card label="Signups" value={fmt(data.growth.signups)} />
            <Card label="Paid conversions" value={fmt(data.growth.paidConversions)} />
          </div>
        </section>

        <section aria-labelledby="health" className="mb-10">
          <h2 id="health" className="mb-4 text-xl font-extrabold text-foreground">Health</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card label="Stale pages" value={fmt(data.health.stalePages)} note="Source review required" />
            <Card label="Changed sources" value={fmt(data.health.changedSources)} />
            <Card label="Failed sources" value={fmt(data.health.failedSources)} />
            <Card label="Open opportunities" value={fmt(data.health.openOpportunities)} />
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section aria-labelledby="opportunities">
            <h2 id="opportunities" className="mb-4 text-xl font-extrabold text-foreground">Highest-confidence opportunities</h2>
            <div className="space-y-3">
              {data.opportunities.length ? data.opportunities.map((item, index) => (
                <article key={`${String(item.opportunity_type)}-${index}`} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-extrabold text-primary">{String(item.opportunity_type)}</p>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-bold text-foreground">{String(item.score)}</span>
                  </div>
                  <p className="mt-2 break-words text-sm font-semibold text-foreground">{String(item.query ?? item.page ?? "Site-level")}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{String(item.recommended_action)}</p>
                </article>
              )) : <p className="text-sm text-muted-foreground">No measured opportunities yet.</p>}
            </div>
          </section>

          <div className="space-y-8">
            <section aria-labelledby="sources">
              <h2 id="sources" className="mb-4 text-xl font-extrabold text-foreground">Source alerts</h2>
              <div className="space-y-3">
                {data.sources.length ? data.sources.map((item, index) => (
                  <article key={`${String(item.source_id)}-${index}`} className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-xs font-extrabold text-primary">{String(item.source_status)} · {String(item.source_category)}</p>
                    <a href={String(item.authoritative_url)} className="mt-1 block break-words text-sm font-semibold text-foreground hover:underline">{String(item.source_organization)}</a>
                    {item.change_summary || item.last_error ? <p className="mt-1 text-xs text-muted-foreground">{String(item.change_summary ?? item.last_error)}</p> : null}
                  </article>
                )) : <p className="text-sm text-muted-foreground">No changed, stale, or failed sources.</p>}
              </div>
            </section>

            <section aria-labelledby="jobs">
              <h2 id="jobs" className="mb-4 text-xl font-extrabold text-foreground">Recent autonomous jobs</h2>
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full min-w-[480px] text-left text-xs">
                  <thead className="border-b border-border bg-muted/40"><tr><th className="p-3">Job</th><th className="p-3">Cadence</th><th className="p-3">Mode</th><th className="p-3">Status</th><th className="p-3">Started</th></tr></thead>
                  <tbody>{data.jobs.map((job, index) => <tr key={index} className="border-b border-border last:border-0"><td className="p-3 font-semibold">{String(job.job_name)}</td><td className="p-3">{String(job.cadence)}</td><td className="p-3">{String(job.mode)}</td><td className="p-3">{String(job.status)}</td><td className="p-3">{String(job.started_at).slice(0, 16).replace("T", " ")}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
