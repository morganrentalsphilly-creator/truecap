import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, ReferenceLine } from "recharts";
import { riskReturn } from "@/lib/dashboard-data";

type RiskReturnPoint = {
  name: string;
  risk: number;
  return: number;
  size: number;
  score?: number;
  cashFlow?: number;
  roi?: number;
};

export function RiskReturn({ data = riskReturn }: { data?: RiskReturnPoint[] }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold">Risk vs Return</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Each point is a saved deal. Top-left means lower risk with stronger return.</p>
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
            <XAxis type="number" dataKey="risk" name="Risk" unit="%" stroke="oklch(0.52 0.03 256)" fontSize={12} tickLine={false} axisLine={false}
              label={{ value: "Risk Score →", position: "insideBottom", offset: -2, fontSize: 11, fill: "oklch(0.52 0.03 256)" }} />
            <YAxis type="number" dataKey="return" name="Return" unit="%" stroke="oklch(0.52 0.03 256)" fontSize={12} tickLine={false} axisLine={false}
              label={{ value: "Return ↑", angle: -90, position: "insideLeft", fontSize: 11, fill: "oklch(0.52 0.03 256)" }} />
            <ZAxis type="number" dataKey="size" range={[80, 400]} />
            <ReferenceLine x={25} stroke="oklch(0.92 0.012 255)" strokeDasharray="3 3" />
            <ReferenceLine y={10} stroke="oklch(0.92 0.012 255)" strokeDasharray="3 3" />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.92 0.012 255)", borderRadius: 12, fontSize: 12 }}
              formatter={(v: number, n: string) => {
                if (n === "size") return `$${v}K`;
                if (n === "cashFlow") return `$${v.toLocaleString()}/mo`;
                if (n === "score") return `${v}`;
                return `${v}%`;
              }}
            />
            <Scatter data={data} fill="oklch(0.55 0.22 265)" fillOpacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
