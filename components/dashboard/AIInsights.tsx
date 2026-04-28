import { Sparkles, Lightbulb, AlertTriangle, TrendingUp } from "lucide-react";
import { aiInsights } from "@/lib/dashboard-data";

const toneMap = {
  opportunity: { icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
  risk: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  tip: { icon: Lightbulb, color: "text-gold", bg: "bg-warning/15" },
};

type AIInsight = {
  title: string;
  body: string;
  tone: keyof typeof toneMap;
};

export function AIInsights({ data = aiInsights }: { data?: AIInsight[] }) {
  return (
    <div className="rounded-2xl border border-border p-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, oklch(0.99 0.005 260), oklch(0.97 0.02 280))" }}>
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full opacity-30 blur-3xl" style={{ background: "var(--gradient-premium)" }} />
      <div className="relative flex items-center gap-2 mb-1">
        <div className="h-7 w-7 rounded-lg grid place-items-center" style={{ background: "var(--gradient-premium)" }}>
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <h3 className="font-display text-lg font-semibold">AI Insights</h3>
        <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full text-white ml-1" style={{ background: "var(--gradient-gold)" }}>PREMIUM</span>
      </div>
      <p className="relative text-sm text-muted-foreground mb-4">Comparative signals from your saved deals</p>

      <div className="relative space-y-3">
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
