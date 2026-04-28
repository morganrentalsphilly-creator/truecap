import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { dealDistribution } from "@/lib/dashboard-data";

type DealDistributionPoint = {
  name: string;
  value: number;
  color: string;
  label?: string;
};

export function DealDistribution({
  data = dealDistribution,
  totalOverride,
}: {
  data?: DealDistributionPoint[];
  totalOverride?: number;
}) {
  const total = totalOverride ?? data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="mb-4">
        <h3 className="font-display text-lg font-semibold">Deal Distribution</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Active analyses by property type</p>
      </div>
      <div className="relative h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={60} outerRadius={86} paddingAngle={3} stroke="none">
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            <div className="font-display text-3xl font-bold">{total}</div>
            <div className="text-[11px] text-muted-foreground tracking-wider uppercase">Deals</div>
          </div>
        </div>
      </div>
      <div className="space-y-2 mt-4">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
              <span>{d.name}</span>
            </div>
            <span className="font-semibold tabular-nums">{d.label ?? `${d.value}%`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
