"use client";

/**
 * Buy-box discovery nudge (PV-2 + FFM-3) — a one-line dismissible hint that
 * the buy-box feature exists, for Pro users who never found it in Settings.
 * Two surfaces share this ONE component (and one localStorage key, so
 * dismissing it anywhere silences it everywhere — never double-nag):
 *
 *  - "my-deals": sits where the "Meets my buy box" filter pill would render
 *    (moment-of-need: the user is looking at a list they could be screening).
 *  - "dashboard": a slim card on 1-3-deal dashboards. NOTE: this variant is a
 *    deliberate, flagged exception to the "invisible until useful" principle
 *    (CLAUDE.md §1 #3/#5) — it's kept to one sentence + link and fully
 *    self-contained here so removing it is a two-line revert if Morgan vetoes.
 *
 * Renders NOTHING unless the user can use buy boxes (Pro `buy_box` feature)
 * AND has zero boxes AND hasn't dismissed the nudge. When the parent already
 * knows eligibility (My Deals loads the boxes anyway), pass `eligible` to
 * skip the extra server-action round trip; otherwise the component checks
 * listBuyBoxesAction itself (MIGRATION_PENDING / errors → stays hidden).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Target, X } from "lucide-react";
import { listBuyBoxesAction } from "@/app/actions/user-buy-boxes";
import { cn } from "@/lib/utils";

/** Shared across every nudge surface — dismiss once, silenced everywhere. */
const BUY_BOX_NUDGE_DISMISSED_KEY = "truecap_buybox_nudge_dismissed";

const SETTINGS_BUY_BOX_HREF = "/settings#buy-boxes-heading";

export function BuyBoxNudge({
  variant,
  eligible,
  className,
}: {
  variant: "my-deals" | "dashboard";
  /**
   * Parent-computed "canUse buy boxes AND has zero boxes". When provided the
   * component skips its own listBuyBoxesAction call; when omitted it fetches.
   */
  eligible?: boolean;
  className?: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(BUY_BOX_NUDGE_DISMISSED_KEY) === "1") return;
    } catch {
      // private mode — can't read the dismissal, fall through and show
    }
    if (eligible !== undefined) {
      setShow(eligible);
      return;
    }
    let cancelled = false;
    void listBuyBoxesAction()
      .then((result) => {
        if (cancelled) return;
        // Only for users who CAN use the feature and have never created a
        // box. MIGRATION_PENDING / entitlement / error paths all stay hidden.
        setShow(result.ok && result.canUse && result.boxes.length === 0);
      })
      .catch(() => {
        // Server-action transport failure — a nudge is never worth surfacing
        // an error for; just stay hidden.
      });
    return () => {
      cancelled = true;
    };
  }, [eligible]);

  const dismiss = () => {
    setShow(false);
    try {
      window.localStorage.setItem(BUY_BOX_NUDGE_DISMISSED_KEY, "1");
    } catch {
      // private mode — dismissal won't persist; hiding for this view is enough
    }
  };

  if (!show) return null;

  const message = (
    <>
      <Link
        href={SETTINGS_BUY_BOX_HREF}
        prefetch={false}
        className="font-semibold text-[var(--brand-green)] underline-offset-2 hover:underline"
      >
        Set your buy box
      </Link>{" "}
      — every deal gets a pass/fail against your numbers.
    </>
  );

  if (variant === "my-deals") {
    // One-liner in the filter row (where the "Meets my buy box" pill will
    // live once a box exists).
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 self-start rounded-full border border-dashed border-[var(--brand-green)]/40 bg-[var(--brand-green-light)] py-1 pl-3 pr-1 text-xs text-muted-foreground",
          className
        )}
      >
        <Target aria-hidden className="size-3.5 shrink-0 text-[var(--brand-green)]" />
        <span>{message}</span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss buy-box tip"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-[var(--brand-green)]/15 hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  // "dashboard" — the slim 1-3-deal card. One sentence + link, nothing else.
  return (
    <section aria-label="Set your buy box" className={className}>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-card px-4 py-3">
        <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <Target aria-hidden className="size-4 shrink-0 text-[var(--brand-green)]" />
          <span>{message}</span>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss buy-box tip"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </section>
  );
}
