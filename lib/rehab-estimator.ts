/**
 * Rehab cost estimator.
 *
 * Pure calculation logic — no UI, no React. Takes a sqft and a list of
 * selected work-item IDs (plus optional bath count + contingency pct)
 * and returns a per-item breakdown and totals.
 *
 * Built-in amounts are illustrative product defaults. They are not derived
 * from a current contractor survey, location, inspection, permit set, or bid.
 * The UI must label them that way and let the user replace each selected
 * line with their own planning amount.
 */

export type RehabWorkItem = {
  id: string;
  label: string;
  category: "structural" | "kitchen" | "bath" | "cosmetic" | "systems";
  defaultCostPerSqft?: number;
  flatCost?: number;
  perBath?: boolean; // multiplied by bath count
  help?: string;
};

export const REHAB_WORK_ITEMS: RehabWorkItem[] = [
  // Cosmetic
  { id: "paint-interior", label: "Interior paint", category: "cosmetic", defaultCostPerSqft: 3, help: "Full-house paint top to bottom." },
  { id: "paint-exterior", label: "Exterior paint", category: "cosmetic", flatCost: 5500 },
  { id: "flooring", label: "New flooring (LVP)", category: "cosmetic", defaultCostPerSqft: 7 },
  { id: "fixtures", label: "Light fixtures + hardware", category: "cosmetic", flatCost: 1800 },
  { id: "landscaping", label: "Landscaping + curb appeal", category: "cosmetic", flatCost: 3500 },

  // Kitchen
  { id: "kitchen-refresh", label: "Kitchen refresh (paint cabinets, hardware)", category: "kitchen", flatCost: 5000 },
  { id: "kitchen-mid", label: "Mid-grade kitchen reno", category: "kitchen", flatCost: 22000 },
  { id: "kitchen-full", label: "Full kitchen renovation", category: "kitchen", flatCost: 38000 },

  // Bath (multiplied by bath count)
  { id: "bath-refresh", label: "Bath refresh (paint, fixtures)", category: "bath", flatCost: 2800, perBath: true },
  { id: "bath-mid", label: "Mid-grade bath reno", category: "bath", flatCost: 9500, perBath: true },
  { id: "bath-full", label: "Full bath renovation", category: "bath", flatCost: 16000, perBath: true },

  // Systems
  { id: "roof", label: "New roof", category: "structural", flatCost: 12000 },
  { id: "hvac", label: "HVAC replacement", category: "systems", flatCost: 8500 },
  { id: "water-heater", label: "Water heater replacement", category: "systems", flatCost: 1800 },
  { id: "electrical", label: "Electrical upgrade / panel", category: "systems", flatCost: 7500 },
  { id: "plumbing", label: "Plumbing rough-in", category: "systems", flatCost: 6500 },
  { id: "windows", label: "Replace windows", category: "structural", flatCost: 8000 },
];

export type RehabInputs = {
  sqft: number;
  selectedItems: string[]; // work-item IDs
  bathCount?: number;
  contingencyPct?: number; // 0-25 typical
  /** Optional per-item cost overrides, keyed by item id. */
  overrides?: Record<string, number>;
};

export type RehabBreakdownLine = {
  id: string;
  label: string;
  cost: number;
  source: "default" | "override";
};

export type RehabResult = {
  lines: RehabBreakdownLine[];
  subtotal: number;
  contingency: number;
  contingencyPct: number;
  total: number;
};

/** Illustrative built-in line total before any user override. Exported so the
 * editor can show the exact placeholder that the pure calculator will use. */
export function illustrativeRehabWorkItemCost(
  item: RehabWorkItem,
  sqftInput: number,
  bathCountInput: number,
): number {
  const sqft = Math.max(0, Number(sqftInput) || 0);
  const baths = Math.max(1, Number(bathCountInput) || 1);
  if (typeof item.defaultCostPerSqft === "number" && sqft > 0) {
    return Math.round(item.defaultCostPerSqft * sqft);
  }
  if (typeof item.flatCost === "number") {
    return Math.round(item.perBath ? item.flatCost * baths : item.flatCost);
  }
  return 0;
}

export function estimateRehab(inputs: RehabInputs): RehabResult {
  const sqft = Math.max(0, Number(inputs.sqft) || 0);
  const baths = Math.max(1, Number(inputs.bathCount) || 1);
  const ctgPct = Math.max(0, Math.min(50, inputs.contingencyPct ?? 10));

  const lines: RehabBreakdownLine[] = [];
  for (const it of REHAB_WORK_ITEMS) {
    if (!inputs.selectedItems.includes(it.id)) continue;

    const override = inputs.overrides?.[it.id];
    if (
      typeof override === "number" &&
      Number.isFinite(override) &&
      override >= 0
    ) {
      lines.push({ id: it.id, label: it.label, cost: Math.round(override), source: "override" });
      continue;
    }

    const cost = illustrativeRehabWorkItemCost(it, sqft, baths);
    lines.push({ id: it.id, label: it.label, cost: Math.round(cost), source: "default" });
  }

  const subtotal = lines.reduce((s, l) => s + l.cost, 0);
  const contingency = Math.round((subtotal * ctgPct) / 100);
  return {
    lines,
    subtotal,
    contingency,
    contingencyPct: ctgPct,
    total: subtotal + contingency,
  };
}
