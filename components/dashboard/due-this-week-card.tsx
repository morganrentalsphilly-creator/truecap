"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, Clock } from "lucide-react";
import {
  dueDiligenceItemStatus,
  normalizeDueDiligenceItems,
  type DueDiligenceItem,
} from "@/lib/due-diligence";

/**
 * A saved deal's due-diligence checklist, as passed from the dashboard server
 * component. `items` is the raw jsonb array — we normalize + status it here so
 * the status is computed in the VIEWER's local time (not the server's).
 */
export type DueThisWeekDeal = {
  id: string;
  /** Display label for the deal (address, falling back to title). */
  address: string;
  /** Raw jsonb items array from deal_due_diligence.items. */
  items: unknown;
};

/**
 * An active deal sitting ≥7 days in Offer / Under contract, server-computed
 * on /dashboard with the SAME thresholds as the in-workspace DealAgingNudge
 * (lib/deal-aging). Honesty rule carries over: `days` counts from created_at
 * (when the deal was SAVED), so copy says "saved N days ago" — never a false
 * "in this stage N days".
 */
export type AgingDealRow = {
  id: string;
  /** Display label for the deal (address, falling back to title). */
  address: string;
  /** Short stage label ("Offer" / "Contract") from lib/pipeline metadata. */
  stageLabel: string;
  /** Whole days since the deal was saved. */
  days: number;
};

/** Max deals named in the quiet aging line before collapsing to "+N more". */
const MAX_AGING_LINKS = 3;

type DueRow = {
  dealId: string;
  address: string;
  label: string;
  /** Whole days until the deadline (negative = overdue). */
  days: number;
  overdue: boolean;
};

/** Local "today" as YYYY-MM-DD, in the viewer's own timezone. Computed on the
 *  client so a deadline never reads "overdue" a day early/late for a user in a
 *  different timezone than the server. */
function localTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Whole-day difference between local today and a YYYY-MM-DD due date (noon-
 *  anchored to match lib/due-diligence, so DST never shifts the count). */
function daysUntil(dueDate: string, todayISO: string): number | null {
  const parse = (s: string): number | null => {
    const mm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
    if (!mm) return null;
    return Date.UTC(Number(mm[1]), Number(mm[2]) - 1, Number(mm[3]), 12, 0, 0);
  };
  const pa = parse(todayISO);
  const pb = parse(dueDate);
  if (pa == null || pb == null) return null;
  return Math.round((pb - pa) / 86_400_000);
}

function relativeLabel(days: number): string {
  if (days < 0) {
    const n = Math.abs(days);
    return `overdue ${n}d`;
  }
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `due in ${days}d`;
}

const MAX_ROWS = 5;

/**
 * "Due this week" — the dashboard home's answer to "what should I DO this
 * week?" Surfaces due-diligence deadlines (inspection / appraisal / financing
 * contingencies) that are OVERDUE or due within 7 days across the user's active
 * saved deals, so a lapsing contingency never hides inside a deal the user
 * hasn't opened. Each row deep-links to that deal's detail page.
 *
 * Invisible until useful: renders NULL when nothing is overdue or due within
 * 7 days — no empty state to explain. Status is computed with the shared
 * dueDiligenceItemStatus helper against the viewer's LOCAL today.
 *
 * `agingDeals` adds one quiet footer line for deals going cold in Offer /
 * Under contract (the workspace DealAgingNudge's signal, surfaced where the
 * user actually starts the session). When there are aging deals but no
 * deadlines, the card renders in a slim aging-only mode — otherwise the
 * signal would stay invisible unless the user already opened that deal,
 * which is exactly the gap this line closes.
 */
export function DueThisWeekCard({
  deals,
  agingDeals = [],
}: {
  deals: DueThisWeekDeal[];
  agingDeals?: AgingDealRow[];
}) {
  const rows = useMemo<DueRow[]>(() => {
    const todayISO = localTodayISO();
    const collected: DueRow[] = [];
    for (const deal of deals) {
      const items: DueDiligenceItem[] = normalizeDueDiligenceItems(deal.items);
      for (const item of items) {
        const status = dueDiligenceItemStatus(item, todayISO);
        // Only overdue / due-within-7d items surface here; "scheduled"
        // (>7d out), done, and dateless items are handled inside the helper.
        if (status !== "overdue" && status !== "due-soon") continue;
        if (!item.dueDate) continue;
        const days = daysUntil(item.dueDate, todayISO);
        if (days == null) continue;
        collected.push({
          dealId: deal.id,
          address: deal.address,
          label: item.label,
          days,
          overdue: status === "overdue",
        });
      }
    }
    // Overdue first (most overdue → least), then due-soon by soonest deadline.
    collected.sort((a, b) => a.days - b.days);
    return collected;
  }, [deals]);

  // Invisible until useful — nothing overdue, due within 7 days, or aging.
  if (rows.length === 0 && agingDeals.length === 0) return null;

  const overdueCount = rows.filter((r) => r.overdue).length;
  const shown = rows.slice(0, MAX_ROWS);
  const extra = rows.length - shown.length;
  // No deadlines at all → the aging line carries the card (slim mode with
  // the workspace nudge's own "Keep it moving" framing).
  const agingOnly = rows.length === 0;

  return (
    <section
      aria-label={agingOnly ? "Deals going cold" : "Due this week"}
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
              overdueCount > 0
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary"
            }`}
          >
            <CalendarClock className="size-4" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {agingOnly ? "Keep it moving" : "Due this week"}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {agingOnly
                ? `${agingDeals.length} ${agingDeals.length === 1 ? "deal is" : "deals are"} going cold`
                : overdueCount > 0
                  ? `${overdueCount} ${overdueCount === 1 ? "deadline is" : "deadlines are"} overdue`
                  : `${rows.length} ${rows.length === 1 ? "deadline" : "deadlines"} coming up`}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/saved-analyses"
          prefetch={false}
          className="shrink-0 text-xs font-semibold text-primary hover:underline"
        >
          Review
        </Link>
      </div>

      {shown.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {shown.map((row) => (
            <li key={`${row.dealId}-${row.label}`}>
              <Link
                href={`/dashboard/saved-analyses/${row.dealId}`}
                prefetch={false}
                className="flex items-start gap-2.5 rounded-xl bg-muted/40 px-3 py-2 transition-colors hover:bg-muted"
              >
                <span
                  className={`mt-0.5 shrink-0 ${row.overdue ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {row.overdue ? (
                    <AlertTriangle className="size-3.5" />
                  ) : (
                    <Clock className="size-3.5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {row.label} — {row.address}
                  </p>
                  <p
                    className={`text-xs leading-relaxed ${
                      row.overdue ? "font-semibold text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {relativeLabel(row.days)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {extra > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          +{extra} more {extra === 1 ? "deadline" : "deadlines"} — see all in{" "}
          <Link
            href="/dashboard/saved-analyses"
            prefetch={false}
            className="font-semibold text-primary hover:underline"
          >
            My Deals
          </Link>
          .
        </p>
      ) : null}

      {/* One quiet aging line — deals going cold in Offer / Under contract,
          each deep-linking to its workspace (where the DealAgingNudge and
          next-action live). Copy says "saved Nd ago" (created_at), never
          "in stage N days" — see lib/deal-aging. */}
      {agingDeals.length > 0 ? (
        <p
          className={`text-xs leading-relaxed text-muted-foreground ${
            agingOnly ? "mt-3" : "mt-3 border-t border-border pt-2.5"
          }`}
        >
          {agingOnly ? "Still marked as in play, but quiet: " : "Also going cold: "}
          {agingDeals.slice(0, MAX_AGING_LINKS).map((deal, index) => (
            <span key={deal.id}>
              {index > 0 ? " · " : null}
              <Link
                href={`/dashboard/saved-analyses/${deal.id}`}
                prefetch={false}
                className="font-semibold text-primary hover:underline"
              >
                {deal.address}
              </Link>{" "}
              ({deal.stageLabel} · saved {deal.days}d ago)
            </span>
          ))}
          {agingDeals.length > MAX_AGING_LINKS
            ? ` · +${agingDeals.length - MAX_AGING_LINKS} more`
            : null}
        </p>
      ) : null}
    </section>
  );
}
