import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, ReferenceLine } from "recharts";

type RiskReturnPoint = {
  dealId?: string;
  name: string;
  type?: string;
  risk: number;
  return: number;
  returnKind?: "roi" | "annualCashFlow";
  hasRiskMetric?: boolean;
  hasReturnMetric?: boolean;
  size: number;
  score?: number;
  cashFlow?: number;
  annualCashFlow?: number;
  roi?: number;
  dscr?: number;
};

type RiskReturnInsightData = {
  bestRiskAdjusted: string;
  highestReturn: string;
  safest: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatReturn(point: RiskReturnPoint): string {
  if (point.hasReturnMetric === false) return "Not provided by backend";
  if (point.returnKind === "annualCashFlow") return `${formatCurrency(point.return)}/yr`;
  return `${point.return.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}

function RiskReturnTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: RiskReturnPoint }>;
}) {
  if (!active || !payload?.length || !payload[0]?.payload) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <div><span className="font-semibold text-muted-foreground">Property:</span> <span className="font-semibold text-foreground">{point.name || "-"}</span></div>
      <div className="mt-1"><span className="font-semibold text-muted-foreground">Type:</span> <span className="text-foreground">{point.type || "-"}</span></div>
      <div className="mt-1"><span className="font-semibold text-muted-foreground">Return:</span> <span className="text-foreground">{formatReturn(point)}</span></div>
      <div className="mt-1">
        <span className="font-semibold text-muted-foreground">Risk (DSCR):</span>{" "}
        <span className="text-foreground">
          {point.hasRiskMetric === false
            ? "Not provided by backend"
            : point.risk.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}

export function RiskReturn({ data = [] }: { data?: RiskReturnPoint[] }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold">Risk vs Return</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Each point is a saved deal. Return uses ROI first, then annual cash flow.</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Optimal</div>
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> Caution</div>
        </div>
      </div>
      <div className="h-[260px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 6" stroke="oklch(0.92 0.012 255)" />
            <XAxis type="number" dataKey="return" name="Return" stroke="oklch(0.52 0.03 256)" fontSize={12} tickLine={false} axisLine={false}
              label={{ value: "Return →", position: "insideBottom", offset: -2, fontSize: 11, fill: "oklch(0.52 0.03 256)" }} />
            <YAxis type="number" dataKey="risk" name="Risk" stroke="oklch(0.52 0.03 256)" fontSize={12} tickLine={false} axisLine={false}
              label={{ value: "Risk / DSCR ↑", angle: -90, position: "insideLeft", fontSize: 11, fill: "oklch(0.52 0.03 256)" }} />
            <ZAxis type="number" dataKey="size" range={[80, 400]} />
            <ReferenceLine x={10} stroke="oklch(0.92 0.012 255)" strokeDasharray="3 3" />
            <ReferenceLine y={1} stroke="oklch(0.92 0.012 255)" strokeDasharray="3 3" />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={<RiskReturnTooltip />}
            />
            <Scatter data={data} fill="oklch(0.55 0.22 265)" fillOpacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function RiskReturnInsights({ data }: { data: RiskReturnInsightData }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <h3 className="font-display text-lg font-semibold">Insights</h3>
      <p className="text-sm text-muted-foreground mt-0.5 mb-4">Risk and return signals from saved deals</p>
      <div className="space-y-3">
        <div className="rounded-xl bg-muted/40 border border-border/60 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Best risk-adjusted deal</div>
          <div className="mt-1 text-sm font-semibold text-foreground">{data.bestRiskAdjusted || "-"}</div>
        </div>
        <div className="rounded-xl bg-muted/40 border border-border/60 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Highest return</div>
          <div className="mt-1 text-sm font-semibold text-foreground">{data.highestReturn || "-"}</div>
        </div>
        <div className="rounded-xl bg-muted/40 border border-border/60 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Safest deal</div>
          <div className="mt-1 text-sm font-semibold text-foreground">{data.safest || "-"}</div>
        </div>
      </div>
    </div>
  );
}
