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
import { useChartDrawAnimation } from "@/components/investcalc/analysis-panels/shared/use-prefers-reduced-motion";
import {
  formatCompactCurrency,
  formatCurrency,
} from "@/components/investcalc/analysis-panels/shared/formatters";
import type { ExitScenarioYear } from "@/lib/exit-scenarios";

// Sentence case (DESIGN.md chrome rules).
const chartConfig = {
  equity: { label: "Equity", color: "var(--color-chart-2)" },
  propertyValue: { label: "Property value", color: "var(--color-chart-1)" },
  remainingLoanBalance: { label: "Loan balance", color: "var(--color-chart-5)" },
  totalProfit: { label: "Total profit", color: "var(--color-chart-4)" },
  netSaleProceeds: { label: "Net sale proceeds", color: "var(--color-chart-1)" },
  cumulativeCashFlow: { label: "Cumulative cash flow", color: "var(--color-chart-2)" },
  cumulativeTaxBenefit: { label: "Cumulative tax benefit", color: "var(--color-chart-4)" },
} as const;

export function ExitScenarioCharts({
  years,
}: {
  years: ExitScenarioYear[];
}) {
  // Recharts animates from JavaScript, which the reduced-motion CSS rule
  // cannot stop, so every mark is told directly.
  const animate = useChartDrawAnimation();
  return (
    <div className="grid min-w-0 gap-3 sm:gap-4 xl:grid-cols-2">
      <ChartCard title="Equity growth">
        <ChartContainer config={chartConfig} className="h-[240px] w-full sm:h-[260px]">
          <LineChart data={years}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Line
              isAnimationActive={animate}
              type="monotone"
              dataKey="equity"
              stroke="var(--color-equity)"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="Property value vs loan balance">
        <ChartContainer config={chartConfig} className="h-[240px] w-full sm:h-[260px]">
          <LineChart data={years}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Legend content={<ChartLegendContent />} />
            <Line
              isAnimationActive={animate}
              type="monotone"
              dataKey="propertyValue"
              stroke="var(--color-propertyValue)"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              isAnimationActive={animate}
              type="monotone"
              dataKey="remainingLoanBalance"
              stroke="var(--color-remainingLoanBalance)"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="Total profit over time">
        <ChartContainer config={chartConfig} className="h-[240px] w-full sm:h-[260px]">
          <LineChart data={years}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Line
              isAnimationActive={animate}
              type="monotone"
              dataKey="totalProfit"
              stroke="var(--color-totalProfit)"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="Profit breakdown">
        <ChartContainer config={chartConfig} className="h-[240px] w-full sm:h-[260px]">
          <BarChart data={years}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Legend content={<ChartLegendContent />} />
            <Bar isAnimationActive={animate} dataKey="netSaleProceeds" stackId="profit" fill="var(--color-netSaleProceeds)" radius={[6, 6, 0, 0]} />
            <Bar isAnimationActive={animate} dataKey="cumulativeCashFlow" stackId="profit" fill="var(--color-cumulativeCashFlow)" />
            <Bar isAnimationActive={animate} dataKey="cumulativeTaxBenefit" stackId="profit" fill="var(--color-cumulativeTaxBenefit)" />
          </BarChart>
        </ChartContainer>
      </ChartCard>
    </div>
  );
}
