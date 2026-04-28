import { marketHeatmap } from "@/lib/dashboard-data";
import { MapPin, TrendingUp } from "lucide-react";

const signalStyle: Record<string, string> = {
  "Strong Buy": "bg-success/10 text-success",
  Buy: "bg-primary/10 text-primary",
  Neutral: "bg-muted text-muted-foreground",
  Hold: "bg-warning/15 text-warning-foreground",
};

export function MarketHeatmap() {
  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-display text-lg font-semibold">Market Opportunity Index</h3>
          <p className="text-sm text-muted-foreground mt-0.5">AI-ranked emerging markets — refreshed daily</p>
        </div>
        <button className="text-xs font-semibold text-primary hover:underline">View all markets →</button>
      </div>
      <div className="space-y-2">
        {marketHeatmap.map((m) => (
          <div key={m.city} className="group flex items-center gap-4 p-3 -mx-1 rounded-xl hover:bg-muted/50 transition">
            <div className="h-9 w-9 rounded-lg grid place-items-center bg-muted">
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{m.city}</div>
              <div className="text-xs text-muted-foreground">Cap rate {m.capRate}% · Demand {m.demand}/100</div>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-sm font-semibold text-success">
              <TrendingUp className="h-3.5 w-3.5" />
              {m.growth}%
            </div>
            <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden hidden md:block">
              <div className="h-full rounded-full" style={{ width: `${m.demand}%`, background: "var(--gradient-premium)" }} />
            </div>
            <span className={`text-[11px] font-semibold px-2 py-1 rounded-md ${signalStyle[m.signal]}`}>{m.signal}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
