"use client";

/**
 * Error boundary around the analysis dashboard.
 *
 * Workflow protection - if any of the dashboard's many child
 * components (waterfall, mortgage compare, score breakdown, NCF card,
 * projections chart, tax strategy table, exit scenarios, etc.) ever
 * throws on a weird/malformed AnalysisResult, the WHOLE post-calc
 * surface used to white-screen out. That's catastrophic UX: the user
 * just ran their analysis, the math is correct, but they see nothing.
 *
 * This boundary catches the throw and falls back to a small "your
 * numbers are safe" card that surfaces the four headline metrics
 * directly from the AnalysisResult. The user still gets value out of
 * the calc, the error is logged to the console for debugging, and a
 * "Try refreshing" button gives them a graceful recovery path.
 *
 * Logging hook: errors are written to console.error for local triage AND
 * reported to Sentry in componentDidCatch — this boundary wraps the entire
 * post-calc dashboard (the app's highest-value screen), so a prod render crash
 * here must surface as an alert, not just a silent fallback card.
 */
import React from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@/lib/calc-analysis";

type Props = {
  /** Optional - passed so the fallback can show the user's numbers
   *  even when the children crash. When omitted, fallback shows a
   *  pure-text recovery message. */
  result?: AnalysisResult | null;
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  errorMessage: string | null;
};

export class AnalysisErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || "Unknown error",
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Structured log so it's easy to spot in dev-tools when triaging
    // user reports. Don't break the parent's render - just log.
    console.error("[AnalysisErrorBoundary] dashboard child threw:", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    // Report to Sentry so a prod crash on the dashboard alerts the team.
    // PII-safe: deliberately do NOT attach the AnalysisResult or address —
    // explicit Sentry extras still leave the app even with default PII off.
    Sentry.captureException(error, {
      tags: { feature: "analysis-dashboard" },
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  handleRetry = (): void => {
    // Reset our own state - the parent's data is still valid, so a
    // re-render of the children may succeed if the cause was a
    // transient state issue.
    this.setState({ hasError: false, errorMessage: null });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { result } = this.props;
    return (
      <section
        aria-label="Analysis dashboard fallback"
        className="rounded-2xl border border-amber-300/40 bg-amber-50/50 p-4 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"
          >
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-amber-900">
              Something glitched while rendering the dashboard
            </h2>
            <p className="mt-1 text-sm text-amber-800/90">
              Your numbers are safe - only the visualization broke. Try refreshing
              the page, or recalculate. The error has been logged.
            </p>

            {result ? (
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-amber-200 bg-background p-3 sm:grid-cols-4">
                <FallbackMetric
                  label="Monthly cash flow"
                  value={fmtSignedUsd(result.netCashFlow)}
                  tone={result.netCashFlow >= 0 ? "positive" : "negative"}
                />
                <FallbackMetric
                  label="CoC return"
                  value={`${result.cocReturn >= 0 ? "+" : ""}${result.cocReturn.toFixed(1)}%`}
                  tone={result.cocReturn >= 0 ? "positive" : "negative"}
                />
                <FallbackMetric
                  label="Cap rate"
                  value={`${result.capRate.toFixed(1)}%`}
                  tone="neutral"
                />
                <FallbackMetric
                  label="DSCR"
                  value={
                    result.monthlyPayment > 0 ? result.dscr.toFixed(2) : "—"
                  }
                  tone="neutral"
                />
              </div>
            ) : null}

            <div className="mt-4 flex items-center gap-2">
              <Button type="button" size="sm" onClick={this.handleRetry}>
                <RotateCw className="mr-1.5 size-3.5" />
                Try again
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (typeof window !== "undefined") window.location.reload();
                }}
              >
                Reload page
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }
}

function fmtSignedUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}$${Math.round(Math.abs(n)).toLocaleString()}`;
}

function FallbackMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative" | "neutral";
}) {
  const color =
    tone === "positive"
      ? "text-[var(--metric-positive,#16a34a)]"
      : tone === "negative"
        ? "text-[var(--metric-negative,#dc2626)]"
        : "text-foreground";
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className={`mt-0.5 text-base font-extrabold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
