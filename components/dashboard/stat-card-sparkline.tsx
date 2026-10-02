"use client";

/**
 * Recharts sparkline, extracted from StatCard so the recharts bundle
 * (~100KB) is only fetched when a sparkline actually renders. StatCard
 * imports this via next/dynamic; both dashboard call sites currently
 * pass spark={[]}, so the dashboard's initial JS ships zero recharts.
 */

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { usePrefersReducedMotion } from "@/components/investcalc/analysis-panels/shared/use-prefers-reduced-motion";

export default function StatCardSparkline({
  spark,
  color,
  gradientId,
}: {
  spark: { v: number }[];
  color: string;
  gradientId: string;
}) {
  // Recharts animates from JavaScript, which the reduced-motion CSS rule
  // cannot stop, so the mark is told directly (as the analyzer's charts are).
  const animate = !usePrefersReducedMotion();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={spark}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area isAnimationActive={animate} type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
