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
import type { TaxStrategyYear } from "@/lib/tax-strategy";

const chartConfig = {
  taxSavingsAnnual: { label: "Modeled Tax Savings", color: "var(--color-chart-2)" },
  taxLiabilityAnnual: { label: "Modeled Tax Liability", color: "var(--color-chart-5)" },
  taxableRentalIncomeAnnual: { label: "Taxable Rental Income", color: "var(--color-chart-1)" },
  mortgageInterestDeductionAnnual: { label: "Interest Deduction", color: "var(--color-chart-4)" },
  depreciationDeductionAnnual: { label: "Depreciation", color: "var(--color-chart-3)" },
  operatingExpensesAnnual: { label: "Operating Expenses", color: "var(--color-chart-5)" },
} as const;

export function TaxStrategyCharts({
  years,
}: {
  years: TaxStrategyYear[];
}) {
  return (
    <div className="grid min-w-0 gap-3 sm:gap-4 xl:grid-cols-2">
      <ChartCard title="Modeled Annual Tax Savings">
        <ChartContainer config={chartConfig} className="h-[240px] w-full sm:h-[260px]">
          <BarChart data={years}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Bar dataKey="taxSavingsAnnual" radius={[8, 8, 0, 0]} fill="var(--color-taxSavingsAnnual)" />
          </BarChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="Taxable Rental Income Trend">
        <ChartContainer config={chartConfig} className="h-[240px] w-full sm:h-[260px]">
          <LineChart data={years}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Line
              type="monotone"
              dataKey="taxableRentalIncomeAnnual"
              stroke="var(--color-taxableRentalIncomeAnnual)"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="Interest vs Depreciation Deduction">
        <ChartContainer config={chartConfig} className="h-[240px] w-full sm:h-[280px]">
          <LineChart data={years}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Legend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="mortgageInterestDeductionAnnual"
              stroke="var(--color-mortgageInterestDeductionAnnual)"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="depreciationDeductionAnnual"
              stroke="var(--color-depreciationDeductionAnnual)"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="Deductions Breakdown">
        <ChartContainer config={chartConfig} className="h-[240px] w-full sm:h-[280px]">
          <BarChart data={years}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Legend content={<ChartLegendContent />} />
            <Bar dataKey="operatingExpensesAnnual" stackId="deductions" fill="var(--color-operatingExpensesAnnual)" radius={[0, 0, 8, 8]} />
            <Bar dataKey="mortgageInterestDeductionAnnual" stackId="deductions" fill="var(--color-mortgageInterestDeductionAnnual)" />
            <Bar dataKey="depreciationDeductionAnnual" stackId="deductions" fill="var(--color-depreciationDeductionAnnual)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </ChartCard>
    </div>
  );
}
