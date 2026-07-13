import { isValidRentalUnit } from "@/lib/investcalc-schema";

export type DealAssumptions = {
  financing: {
    interestRatePct: number | null;
    loanTermYears: number | null;
    downPaymentPct: number | null;
  };
  income: {
    totalMonthlyRent: number | null;
    unitsDescription: string;
  };
  expenses: {
    vacancyPct: number | null;
    managementPct: number | null;
    maintenancePct: number | null;
    capexPct: number | null;
    /** How the tax was entered. "annual" means propertyTaxAnnual is the
     *  customer's actual bill and propertyTaxPct (if any) is only a derived
     *  effective rate — render the bill, not the percent. */
    propertyTaxInputMode: "percent" | "annual" | null;
    propertyTaxAnnual: number | null;
    propertyTaxPct: number | null;
    insuranceInputMode: "percent" | "monthly" | null;
    insurancePct: number | null;
    insuranceMonthly: number | null;
  };
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function numFromUnknown(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function coerceUnit(u: unknown) {
  const r = asRecord(u);
  if (!r) return null;
  return {
    bedrooms: numFromUnknown(r.bedrooms) ?? undefined,
    bathrooms: numFromUnknown(r.bathrooms) ?? undefined,
    sqft: numFromUnknown(r.sqft) ?? undefined,
    monthlyRent: numFromUnknown(r.monthlyRent) ?? undefined,
    isOwnerOccupied: Boolean(r.isOwnerOccupied),
  };
}

function rentalIncomeFromSnapshot(snapshot: Record<string, unknown>): number | null {
  const pt = snapshot.propertyType;
  if (pt === "single-family") {
    return numFromUnknown(snapshot.monthlyRent);
  }
  const rawUnits = snapshot.units;
  if (!Array.isArray(rawUnits)) return null;
  const units = rawUnits.map(coerceUnit).filter(Boolean) as NonNullable<ReturnType<typeof coerceUnit>>[];
  const valid = units.filter((u) =>
    isValidRentalUnit(u, {
      allowZeroRent: pt === "owner-occupant" && !!u.isOwnerOccupied,
    })
  );
  if (valid.length === 0) return null;
  if (pt === "owner-occupant") {
    return valid
      .filter((u) => !u.isOwnerOccupied)
      .reduce((sum, u) => sum + (typeof u.monthlyRent === "number" ? u.monthlyRent : 0), 0);
  }
  return valid.reduce((sum, u) => sum + (typeof u.monthlyRent === "number" ? u.monthlyRent : 0), 0);
}

function unitsDescription(snapshot: Record<string, unknown>): string {
  const pt = snapshot.propertyType;
  const raw = Array.isArray(snapshot.units) ? snapshot.units : [];
  if (pt === "single-family") return "Single-family (one rent roll)";
  if (pt === "owner-occupant") {
    const n = raw.length;
    return n <= 1 ? "House hack (1 unit row)" : `House hack (${n} unit rows)`;
  }
  if (pt === "multi-family") {
    return raw.length ? `Multi-family (${raw.length} unit row${raw.length === 1 ? "" : "s"})` : "Multi-family";
  }
  return "—";
}

type RowFallback = {
  property_tax_pct?: number | string | null;
  maintenance_pct?: number | string | null;
  capex_pct?: number | string | null;
  vacancy_pct?: number | string | null;
  interest_rate_pct?: number | string | null;
  loan_term_years?: number | string | null;
  down_payment_pct?: number | string | null;
  management_pct?: number | string | null;
  monthly_rent?: number | string | null;
  insurance_input_mode?: string | null;
  insurance_pct?: number | string | null;
  insurance_mo?: number | string | null;
};

export function buildDealAssumptions(formSnapshot: unknown, row: RowFallback): DealAssumptions {
  const s = asRecord(formSnapshot) ?? {};
  const insuranceInputMode: DealAssumptions["expenses"]["insuranceInputMode"] =
    s.insuranceInputMode === "monthly" || s.insuranceInputMode === "percent"
      ? s.insuranceInputMode
      : row.insurance_input_mode === "monthly" || row.insurance_input_mode === "percent"
        ? row.insurance_input_mode
        : null;

  const financing = {
    interestRatePct: numFromUnknown(s.interestRate) ?? toNumber(row.interest_rate_pct),
    loanTermYears: numFromUnknown(s.loanTermYears) ?? toNumber(row.loan_term_years),
    downPaymentPct: numFromUnknown(s.downPaymentPct) ?? toNumber(row.down_payment_pct),
  };

  const income = {
    totalMonthlyRent: rentalIncomeFromSnapshot(s),
    unitsDescription: unitsDescription(s),
  };

  const propertyTaxAnnual = numFromUnknown(s.propertyTaxAnnual);
  const propertyTaxInputMode: DealAssumptions["expenses"]["propertyTaxInputMode"] =
    s.propertyTaxInputMode === "annual" && propertyTaxAnnual != null
      ? "annual"
      : s.propertyTaxInputMode === "percent"
        ? "percent"
        : null;

  const expenses = {
    vacancyPct: numFromUnknown(s.vacancyPct) ?? toNumber(row.vacancy_pct),
    managementPct: numFromUnknown(s.mgmtPct) ?? toNumber(row.management_pct),
    maintenancePct: numFromUnknown(s.maintenancePct) ?? toNumber(row.maintenance_pct),
    capexPct: numFromUnknown(s.capexPct) ?? toNumber(row.capex_pct),
    propertyTaxInputMode,
    propertyTaxAnnual,
    propertyTaxPct: numFromUnknown(s.propertyTaxPct) ?? toNumber(row.property_tax_pct),
    insuranceInputMode,
    insurancePct: numFromUnknown(s.insurancePct) ?? toNumber(row.insurance_pct),
    insuranceMonthly: numFromUnknown(s.insuranceMonthly) ?? toNumber(row.insurance_mo),
  };

  if (income.totalMonthlyRent == null && row.monthly_rent != null) {
    income.totalMonthlyRent = toNumber(row.monthly_rent);
  }

  return { financing, income, expenses };
}
