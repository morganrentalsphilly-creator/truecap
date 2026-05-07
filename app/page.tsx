import { Header } from "@/components/investcalc/header";
import { InvestCalcPage } from "@/components/investcalc/investcalc-page";
import {
  getEntitlementsForUser,
  hasPaidPlanSubscription,
  hasPlanFeature,
  hasSavedDealCapacity,
} from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const entitlements = user ? await getEntitlementsForUser(supabase, user.id) : null;
  const canUpdateSavedDeals = user ? await hasPaidPlanSubscription(supabase, user.id) : false;
  const { count: savedDealCount } = user
    ? await supabase
        .from("saved_analyses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("deleted_at", null)
    : { count: 0 };
  const canSaveDeals = entitlements ? hasPlanFeature(entitlements, "save_deal") : false;
  const saveDealLimitReached = entitlements ? !hasSavedDealCapacity(entitlements, savedDealCount ?? 0) : false;
  const canCompareDeals = entitlements ? hasPlanFeature(entitlements, "compare_deals") : false;
  const canExportPdf = entitlements ? hasPlanFeature(entitlements, "pdf_export") : false;
  const canUseProjections = entitlements ? hasPlanFeature(entitlements, "projections") : false;
  const canUseTaxStrategy = entitlements ? hasPlanFeature(entitlements, "tax_strategy") : false;
  const canUseExitScenarios = entitlements ? hasPlanFeature(entitlements, "exit_scenarios") : false;
  const canUseDealScore = entitlements ? hasPlanFeature(entitlements, "deal_score") : false;

  return (
    <>
      <Header initialUser={user} initialEntitlements={entitlements} />
      <InvestCalcPage
        canSaveDeals={canSaveDeals}
        canCompareDeals={canCompareDeals}
        canExportPdf={canExportPdf}
        canUseProjections={canUseProjections}
        canUseTaxStrategy={canUseTaxStrategy}
        canUseExitScenarios={canUseExitScenarios}
        canUseDealScore={canUseDealScore}
        canUpdateSavedDeals={canUpdateSavedDeals}
        saveDealLimitReached={saveDealLimitReached}
        initialSavedDealCount={savedDealCount ?? 0}
        savedDealLimit={entitlements?.max_saved_deals ?? null}
        isAuthenticated={Boolean(user)}
      />
    </>
  );
}
