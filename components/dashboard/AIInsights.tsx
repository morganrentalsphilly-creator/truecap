import Link from "next/link";
import { Lightbulb, AlertTriangle, TrendingUp } from "lucide-react";

const toneMap = {
  opportunity: { icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
  risk: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  tip: { icon: Lightbulb, color: "text-gold", bg: "bg-warning/15" },
};

type AIInsight = {
  title: string;
  body: string;
  tone: keyof typeof toneMap;
  /** Optional next-step CTA — every insight should end with an action. */
  action?: { label: string; href: string };
};

type RiskReturnInsightData = {
  bestRiskAdjusted: string;
  highestReturn: string;
  safest: string;
};

// NOTE: the old default for `data` was a hardcoded marketing placeholder
// list (fake "Tampa market" insights). DashboardHome always passes REAL
// derived insights, so the fake default never rendered in the live path —
// but it was a footgun for any future call site. Default is now an empty
// list; this component must never show invented analysis on a financial
// product.
export function AIInsights({
  data = [],
  riskReturnInsights,
}: {
  data?: AIInsight[];
  riskReturnInsights?: RiskReturnInsightData;
}) {
  return (
    <div className="rounded-2xl border border-border p-6 relative overflow-hidden h-full" style={{ background: "var(--ai-insights-bg)" }}>
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full opacity-30 blur-3xl" style={{ background: "var(--gradient-premium)" }} />
      <div className="relative flex items-center gap-2 mb-1">
        <div className="h-7 w-7 rounded-lg grid place-items-center" style={{ background: "var(--gradient-premium)" }}>
          <TrendingUp className="h-3.5 w-3.5 text-white" />
        </div>
        <h3 className="font-display text-lg font-semibold">Portfolio Signals</h3>
        <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full text-white ml-1" style={{ background: "var(--gradient-gold)" }}>PREMIUM</span>
      </div>
      <p className="relative text-sm text-muted-foreground mb-4">Comparative signals from your saved deals</p>

      <div className="relative space-y-3">
        {riskReturnInsights ? (
          <div className="rounded-xl bg-card/80 backdrop-blur border border-border/60 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Risk vs Return</div>
            <div className="space-y-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Best risk-adjusted deal</div>
                <div className="text-sm font-semibold text-foreground mt-0.5">{riskReturnInsights.bestRiskAdjusted || "-"}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Highest return</div>
                <div className="text-sm font-semibold text-foreground mt-0.5">{riskReturnInsights.highestReturn || "-"}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Safest deal</div>
                <div className="text-sm font-semibold text-foreground mt-0.5">{riskReturnInsights.safest || "-"}</div>
              </div>
            </div>
          </div>
        ) : null}

        {data.map((ins, i) => {
          const t = toneMap[ins.tone];
          const Icon = t.icon;
          return (
            <div key={i} className="flex gap-3 p-3 rounded-xl bg-card/80 backdrop-blur border border-border/60">
              <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${t.bg}`}>
                <Icon className={`h-4 w-4 ${t.color}`} />
              </div>
              <div>
                <div className="font-semibold text-sm">{ins.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{ins.body}</div>
                {ins.action ? (
                  <Link
                    href={ins.action.href}
                    prefetch={false}
                    className="mt-1.5 inline-block text-xs font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    {ins.action.label} →
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
