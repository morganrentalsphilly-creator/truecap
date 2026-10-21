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
import type { TaxStrategyYear } from "@/lib/tax-strategy";

// Sentence case (DESIGN.md chrome rules).
const chartConfig = {
  taxSavingsAnnual: { label: "Modeled tax savings", color: "var(--color-chart-2)" },
  taxLiabilityAnnual: { label: "Modeled tax liability", color: "var(--color-chart-5)" },
  taxableRentalIncomeAnnual: { label: "Taxable rental income", color: "var(--color-chart-1)" },
  mortgageInterestDeductionAnnual: { label: "Interest deduction", color: "var(--color-chart-4)" },
  depreciationDeductionAnnual: { label: "Depreciation", color: "var(--color-chart-3)" },
  operatingExpensesAnnual: { label: "Operating expenses", color: "var(--color-chart-5)" },
} as const;

export function TaxStrategyCharts({
  years,
}: {
  years: TaxStrategyYear[];
}) {
  // Recharts animates from JavaScript, which the reduced-motion CSS rule
  // cannot stop, so every mark is told directly.
  const animate = useChartDrawAnimation();
  return (
    <div className="grid min-w-0 gap-3 sm:gap-4 xl:grid-cols-2">
      <ChartCard title="Modeled annual tax savings">
        <ChartContainer config={chartConfig} className="h-[240px] w-full sm:h-[260px]">
          <BarChart data={years}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Bar isAnimationActive={animate} dataKey="taxSavingsAnnual" radius={[8, 8, 0, 0]} fill="var(--color-taxSavingsAnnual)" />
          </BarChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="Taxable rental income trend">
        <ChartContainer config={chartConfig} className="h-[240px] w-full sm:h-[260px]">
          <LineChart data={years}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Line
              isAnimationActive={animate}
              type="monotone"
              dataKey="taxableRentalIncomeAnnual"
              stroke="var(--color-taxableRentalIncomeAnnual)"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="Interest vs depreciation deduction">
        <ChartContainer config={chartConfig} className="h-[240px] w-full sm:h-[280px]">
          <LineChart data={years}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Legend content={<ChartLegendContent />} />
            <Line
              isAnimationActive={animate}
              type="monotone"
              dataKey="mortgageInterestDeductionAnnual"
              stroke="var(--color-mortgageInterestDeductionAnnual)"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              isAnimationActive={animate}
              type="monotone"
              dataKey="depreciationDeductionAnnual"
              stroke="var(--color-depreciationDeductionAnnual)"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="Deductions breakdown">
        <ChartContainer config={chartConfig} className="h-[240px] w-full sm:h-[280px]">
          <BarChart data={years}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Legend content={<ChartLegendContent />} />
            <Bar isAnimationActive={animate} dataKey="operatingExpensesAnnual" stackId="deductions" fill="var(--color-operatingExpensesAnnual)" radius={[0, 0, 8, 8]} />
            <Bar isAnimationActive={animate} dataKey="mortgageInterestDeductionAnnual" stackId="deductions" fill="var(--color-mortgageInterestDeductionAnnual)" />
            <Bar isAnimationActive={animate} dataKey="depreciationDeductionAnnual" stackId="deductions" fill="var(--color-depreciationDeductionAnnual)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </ChartCard>
    </div>
  );
}
