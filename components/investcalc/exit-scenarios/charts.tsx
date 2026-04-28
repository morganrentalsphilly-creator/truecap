"use client";

import {
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
import type { ExitScenarioYear } from "@/lib/exit-scenarios";

const chartConfig = {
  equity: { label: "Equity", color: "var(--color-chart-2)" },
  propertyValue: { label: "Property Value", color: "var(--color-chart-1)" },
  remainingLoanBalance: { label: "Loan Balance", color: "var(--color-chart-5)" },
  totalProfit: { label: "Total Profit", color: "var(--color-chart-4)" },
  netSaleProceeds: { label: "Net Sale Proceeds", color: "var(--color-chart-1)" },
  cumulativeCashFlow: { label: "Cumulative Cash Flow", color: "var(--color-chart-2)" },
  cumulativeTaxBenefit: { label: "Cumulative Tax Benefit", color: "var(--color-chart-4)" },
} as const;

export function ExitScenarioCharts({
  years,
}: {
  years: ExitScenarioYear[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Equity Growth">
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <LineChart data={years}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Line
              type="monotone"
              dataKey="equity"
              stroke="var(--color-equity)"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="Property Value vs Loan Balance">
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <LineChart data={years}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Legend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="propertyValue"
              stroke="var(--color-propertyValue)"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="remainingLoanBalance"
              stroke="var(--color-remainingLoanBalance)"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="Total Profit Over Time">
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <LineChart data={years}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Line
              type="monotone"
              dataKey="totalProfit"
              stroke="var(--color-totalProfit)"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="Profit Breakdown">
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <BarChart data={years}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Legend content={<ChartLegendContent />} />
            <Bar dataKey="netSaleProceeds" stackId="profit" fill="var(--color-netSaleProceeds)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="cumulativeCashFlow" stackId="profit" fill="var(--color-cumulativeCashFlow)" />
            <Bar dataKey="cumulativeTaxBenefit" stackId="profit" fill="var(--color-cumulativeTaxBenefit)" />
          </BarChart>
        </ChartContainer>
      </ChartCard>
    </div>
  );
}
