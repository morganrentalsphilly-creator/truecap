import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { cashFlowTrend } from "@/lib/dashboard-data";

type CashFlowPoint = {
  month: string;
  income: number;
  expense: number;
};

export function CashFlowChart({ data = cashFlowTrend }: { data?: CashFlowPoint[] }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="mb-6">
        <h3 className="font-display text-lg font-semibold">Income vs Expenses</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Monthly aggregate across all deals (in $K)</p>
      </div>
      <div className="h-[260px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 6" stroke="oklch(0.92 0.012 255)" vertical={false} />
            <XAxis dataKey="month" stroke="oklch(0.52 0.03 256)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="oklch(0.52 0.03 256)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "oklch(0.55 0.22 265 / 0.06)" }}
              contentStyle={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.92 0.012 255)", borderRadius: 12, fontSize: 12 }}
              formatter={(v: number) => `$${v}K`}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="income" name="Income" fill="oklch(0.68 0.17 158)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expense" name="Expenses" fill="oklch(0.78 0.14 85)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
