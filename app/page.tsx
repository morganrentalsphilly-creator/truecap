import { Header } from "@/components/investcalc/header";
import { InvestCalcPage } from "@/components/investcalc/investcalc-page";
import { hasActivePremiumSubscription } from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const hasProAccess = user ? await hasActivePremiumSubscription(supabase, user.id) : false;

  return (
    <>
      <Header initialUser={user} />
      <InvestCalcPage hasProAccess={hasProAccess} isAuthenticated={Boolean(user)} />
    </>
  );
}
