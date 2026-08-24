/**
 * GET /portal/[token] — a public, co-branded page an Agent Pro user shares
 * with one buyer, listing the deals they've screened for that client.
 *
 * The token is HMAC-signed (lib/signed-token) over {agentUserId, clientId};
 * lib/client-portal re-verifies the agent's `agent_portal` entitlement and the
 * client ownership at view time, so a forged or downgraded link renders the
 * generic 404 below rather than leaking a paid surface. noindex — these are
 * private hand-offs, not SEO pages.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { readSignedToken } from "@/lib/signed-token";
import { loadClientPortal, PORTAL_SCOPE, type PortalDeal } from "@/lib/client-portal";
import { verdictLabel } from "@/lib/verdict-display";

export const metadata: Metadata = {
  title: "Your deal shortlist",
  robots: { index: false, follow: false },
};

const money = (n: number) => `${n < 0 ? "-" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
const pct = (n: number) => `${n.toFixed(1)}%`;

/** Verdict → pill tone. Mirrors the recommendation vocabulary in deal-score. */
function recTone(rec: PortalDeal["recommendation"]): string {
  switch (rec) {
    case "Strong Buy":
    case "Buy":
      return "border-[var(--brand-green)]/30 bg-[var(--brand-green-light)] text-[var(--brand-green)]";
    case "Risky":
    case "Avoid":
      return "border-amber-300 bg-amber-50 text-amber-800";
    default:
      return "border-border bg-muted/50 text-muted-foreground";
  }
}

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const decoded = readSignedToken(PORTAL_SCOPE, token);
  if (!decoded?.a || !decoded?.c) notFound();

  const data = await loadClientPortal({ agentUserId: decoded.a, clientId: decoded.c, portalToken: token });
  if (!data) notFound();

  const { clientName, branding, deals, criteriaSummary, meetingCount } = data;
  const brandColor = branding?.primaryColor ?? "var(--primary)";
  const brandName = branding?.displayName ?? "TrueCap";

  return (
    <div className="min-h-screen bg-background">
      {/* Co-branded header — the agent's logo/name/color when set, else a
          clean generic strip. */}
      <header className="border-b border-border" style={{ borderTopColor: brandColor, borderTopWidth: 3 }}>
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          {branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={brandName} className="h-9 w-auto max-w-[160px] object-contain" />
          ) : (
            <span className="text-lg font-extrabold tracking-tight text-foreground">{brandName}</span>
          )}
          <div className="ml-auto text-right">
            {branding?.contactName ? (
              <p className="text-sm font-semibold text-foreground">{branding.contactName}</p>
            ) : null}
            {branding?.contactEmail ? (
              <a href={`mailto:${branding.contactEmail}`} className="text-xs text-muted-foreground hover:underline">
                {branding.contactEmail}
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: brandColor }}>
            Prepared for {clientName}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
            Your deal shortlist
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {deals.length === 0
              ? "No deals have been shared with you yet — check back soon."
              : criteriaSummary
                ? `${deals.length} ${deals.length === 1 ? "property" : "properties"} underwritten — ${meetingCount} meet your criteria.`
                : `${deals.length} ${deals.length === 1 ? "property" : "properties"}, each fully underwritten.`}
          </p>
          {/* The criteria themselves. "Screened to your criteria" is only
              credible if the buyer can see what the bar actually is. */}
          {criteriaSummary ? (
            <div className="mt-3 rounded-xl border border-border bg-muted/30 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Your criteria
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{criteriaSummary}</p>
            </div>
          ) : null}
        </div>

        <ul className="space-y-3">
          {deals.map((deal) => {
            const Card = (
              <div className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-foreground" title={deal.address}>
                      {deal.address}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${recTone(deal.recommendation)}`}
                      >
                        {/* Was the raw internal enum ("Strong Buy"/"Avoid").
                            This page is what an agent's BUYER sees, so it
                            must use the advice-safe display wording. */}
                        {verdictLabel(deal.recommendation)} · Screening Index {Math.round(deal.score)}
                      </span>
                      {deal.meetsCriteria === true ? (
                        <span className="inline-flex items-center rounded-full border border-[var(--brand-green)]/30 bg-[var(--brand-green-light)] px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-green)]">
                          Meets your criteria
                        </span>
                      ) : deal.meetsCriteria === false ? (
                        <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          Below your criteria
                        </span>
                      ) : null}
                    </div>
                    {deal.gapLine ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">{deal.gapLine}</p>
                    ) : null}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {deal.methodologyLabel}
                    </p>
                  </div>
                  {deal.sharePath ? (
                    <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  ) : null}
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/40 py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cash flow</dt>
                    <dd className={`text-sm font-extrabold ${deal.netCashFlowMonthly >= 0 ? "text-success" : "text-[var(--metric-negative)]"}`}>
                      {money(deal.netCashFlowMonthly)}<span className="text-[10px] font-normal text-muted-foreground">/mo</span>
                    </dd>
                  </div>
                  <div className="rounded-lg bg-muted/40 py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cap rate</dt>
                    <dd className="text-sm font-extrabold text-foreground">{pct(deal.capRatePct)}</dd>
                  </div>
                  <div className="rounded-lg bg-muted/40 py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CoC</dt>
                    <dd className="text-sm font-extrabold text-foreground">{pct(deal.cocReturnPct)}</dd>
                  </div>
                </dl>
              </div>
            );
            return (
              <li key={deal.id}>
                {deal.sharePath ? (
                  <a href={deal.sharePath} className="block" target="_blank" rel="noopener">
                    {Card}
                  </a>
                ) : (
                  Card
                )}
              </li>
            );
          })}
        </ul>

        <footer className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          Underwriting by{" "}
          <a href="https://usetruecap.com" target="_blank" rel="noopener" className="font-semibold text-primary hover:underline">
            TrueCap
          </a>
        </footer>
      </main>
    </div>
  );
}
