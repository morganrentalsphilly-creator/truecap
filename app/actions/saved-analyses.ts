"use server";

import { calculateAnalysis } from "@/lib/calc-analysis";
import { getEntitlementsForUser } from "@/lib/entitlements";
import { INVESTCALC_SCHEMA_VERSION, investmentFormSchema } from "@/lib/investcalc-schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SaveDealResult =
  | { ok: true; id: string }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "VALIDATION_ERROR" | "ENTITLEMENT_SAVE" | "SERVER_ERROR";
      message?: string;
    };

export async function saveDealAction(input: unknown): Promise<SaveDealResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED" };
  }

  const parsed = investmentFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid form payload" };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!entitlements.features.includes("save_deal")) {
    return {
      ok: false,
      code: "ENTITLEMENT_SAVE",
      message: "Upgrade required to save deals",
    };
  }

  const { count, error: countErr } = await supabase
    .from("saved_analyses")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (countErr) {
    return { ok: false, code: "SERVER_ERROR", message: countErr.message };
  }

  if ((count ?? 0) >= entitlements.max_saved_deals) {
    return {
      ok: false,
      code: "ENTITLEMENT_SAVE",
      message: "Saved deal limit reached for your plan",
    };
  }

  const values = parsed.data;
  const result = calculateAnalysis(values);
  const title =
    values.address.trim().length > 0
      ? values.address.slice(0, 200)
      : `${values.propertyType} analysis`;

  const { data, error } = await supabase
    .from("saved_analyses")
    .insert({
      user_id: user.id,
      title,
      schema_version: INVESTCALC_SCHEMA_VERSION,
      form_snapshot: values as unknown as Record<string, unknown>,
      result_snapshot: result as unknown as Record<string, unknown>,
      property_type: values.propertyType,
      purchase_price: values.purchasePrice,
      net_cash_flow_monthly: result.netCashFlow,
      coc_return_pct: result.cocReturn,
      property_tax_mo: result.propertyTax,
      insurance_mo: result.insurance,
      hoa_mo: result.hoa,
      utilities_mo: result.utilities,
      maintenance_pct: values.maintenancePct,
      vacancy_pct: values.vacancyPct,
      mgmt_pct: values.mgmtPct,
      capex_pct: values.capexPct,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }

  return { ok: true, id: data.id };
}
