"use client";

/**
 * Client-side controls for the email preview page:
 *   - Week selector (drops you onto a different content file)
 *   - Send-test-to-me button (POSTs to /api/email/send-test)
 *
 * Kept in a separate file so the page itself can be a pure server
 * component (which means we don't ship the iframe HTML payload to
 * the client unnecessarily).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";

export function EmailPreviewControls({
  dates,
  selectedDate,
  adminEmail,
}: {
  dates: string[];
  selectedDate: string;
  adminEmail: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    { tone: "success" | "error"; message: string } | null
  >(null);

  const sendTest = () => {
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/email/send-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: selectedDate, to: adminEmail }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
        };
        if (res.ok && body.ok) {
          setStatus({
            tone: "success",
            message: `Test sent to ${adminEmail}. Check your inbox.`,
          });
        } else {
          setStatus({
            tone: "error",
            message: body.message ?? `Send failed (HTTP ${res.status}).`,
          });
        }
      } catch (err) {
        setStatus({
          tone: "error",
          message: err instanceof Error ? err.message : "Network error.",
        });
      }
    });
  };

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="email-preview-week" className="sr-only">
          Week
        </label>
        <select
          id="email-preview-week"
          value={selectedDate}
          onChange={(e) => {
            const next = e.target.value;
            router.push(`/admin/email-preview?date=${encodeURIComponent(next)}`);
          }}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          {dates.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={sendTest}
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
          Send test to me
        </button>
      </div>
      {status ? (
        <p
          className={
            status.tone === "success"
              ? "text-xs text-[color:var(--brand-green,#0f9d58)]"
              : "text-xs text-[var(--metric-negative,#dc2626)]"
          }
          role="status"
          aria-live="polite"
        >
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
