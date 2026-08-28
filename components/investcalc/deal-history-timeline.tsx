import { History } from "lucide-react";

import {
  dealHistoryDecisionLabel,
  dealHistoryStageLabel,
  type SavedDealHistoryEvent,
} from "@/lib/deal-history";
import type { PipelineStage } from "@/lib/pipeline";

export type DealHistoryAvailability = "ready" | "migration_pending" | "error";

function formatEventTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

export function DealHistoryTimeline({
  availability,
  currentStage,
  events,
}: {
  availability: DealHistoryAvailability;
  currentStage: PipelineStage;
  events: SavedDealHistoryEvent[];
}) {
  return (
    <section
      aria-labelledby="deal-log-heading"
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
          <History aria-hidden className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 id="deal-log-heading" className="text-sm font-bold text-foreground">
                Deal Log
              </h2>
              <p className="text-xs text-muted-foreground">
                Stage and decision history · current: {dealHistoryStageLabel(currentStage)}
              </p>
            </div>
          </div>

          {availability === "migration_pending" ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Deal Log will be available after the latest schema update is applied.
            </p>
          ) : availability === "error" ? (
            <p role="status" className="mt-3 text-xs text-muted-foreground">
              Deal Log could not be loaded right now. Refresh to try again.
            </p>
          ) : events.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              No transitions recorded yet. The next stage change will start this log.
            </p>
          ) : (
            <ol className="mt-4 space-y-3 border-l border-border pl-4">
              {events.map((event) => (
                <li key={event.id} className="relative min-w-0">
                  <span
                    aria-hidden
                    className="absolute -left-[1.22rem] top-1.5 size-2 rounded-full bg-primary ring-4 ring-card"
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-xs font-semibold text-foreground">
                      {event.oldStage ? (
                        <>
                          {dealHistoryStageLabel(event.oldStage)} →{" "}
                          {dealHistoryStageLabel(event.newStage)}
                        </>
                      ) : (
                        <>Moved to {dealHistoryStageLabel(event.newStage)}</>
                      )}
                    </p>
                    <time
                      dateTime={event.occurredAt}
                      className="text-[10px] tabular-nums text-muted-foreground"
                    >
                      {formatEventTime(event.occurredAt)}
                    </time>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    You
                    {event.decisionStatus !== "undecided"
                      ? ` · Decision: ${dealHistoryDecisionLabel(event.decisionStatus)}`
                      : ""}
                  </p>
                  {event.reason ? (
                    <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                      <span className="font-semibold">Reason:</span> {event.reason}
                    </p>
                  ) : null}
                  {event.note ? (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {event.note}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
