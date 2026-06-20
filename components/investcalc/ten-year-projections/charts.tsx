"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ChartCard } from "@/components/investcalc/analysis-panels/shared/chart-card";
import {
  formatCompactCurrency,
  formatCurrency,
} from "@/components/investcalc/analysis-panels/shared/formatters";
import type { ProjectionYear } from "@/lib/ten-year-projections";

const chartConfig = {
  netCashFlowAnnual: { label: "Net Cash Flow", color: "var(--color-chart-1)" },
  rentalIncomeAnnual: { label: "Rental Income", color: "var(--color-chart-2)" },
  operatingExpensesAnnual: { label: "Operating Expenses", color: "var(--color-chart-5)" },
  debtServiceAnnual: { label: "Debt Service", color: "var(--color-chart-3)" },
  cumulativeCashFlowAnnual: { label: "Cumulative Cash Flow", color: "var(--color-chart-4)" },
} as const;

export function TenYearProjectionCharts({
  projectionYears,
}: {
  projectionYears: ProjectionYear[];
}) {
  return (
    <div className="grid min-w-0 gap-3 sm:gap-4 xl:grid-cols-2">
      <ChartCard title="Annual Cash Flow">
        <ChartContainer config={chartConfig} className="h-[240px] w-full sm:h-[260px]">
          <BarChart data={projectionYears}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Bar dataKey="netCashFlowAnnual" fill="var(--color-netCashFlowAnnual)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="Income vs Expenses">
        <ChartContainer config={chartConfig} className="h-[240px] w-full sm:h-[260px]">
          <LineChart data={projectionYears}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Legend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="rentalIncomeAnnual"
              stroke="var(--color-rentalIncomeAnnual)"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="operatingExpensesAnnual"
              stroke="var(--color-operatingExpensesAnnual)"
              strokeWidth={2.5}
              dot={false}
            />
            {/* Debt service was previously omitted, so the gap between income
                and "expenses" looked like healthy cash flow even on a
                cash-flow-negative deal. Plotting it makes the real squeeze
                visible — income vs operating expenses AND the mortgage. */}
            <Line
              type="monotone"
              dataKey="debtServiceAnnual"
              stroke="var(--color-debtServiceAnnual)"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="Cumulative Cash Flow" className="xl:col-span-2">
        <ChartContainer config={chartConfig} className="h-[240px] w-full sm:h-[280px]">
          <AreaChart data={projectionYears}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Area
              type="monotone"
              dataKey="cumulativeCashFlowAnnual"
              stroke="var(--color-cumulativeCashFlowAnnual)"
              fill="var(--color-cumulativeCashFlowAnnual)"
              fillOpacity={0.18}
              strokeWidth={2.5}
            />
          </AreaChart>
        </ChartContainer>
      </ChartCard>
    </div>
  );
}
