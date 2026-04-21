import { redirect } from "next/navigation";
import { Header } from "@/components/investcalc/header";
import { TemplatesManagementPage } from "@/components/investcalc/templates-management-page";
import { listAnalysisTemplatesAction } from "@/app/actions/analysis-templates";
import { getEntitlementsForUser } from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function TemplatesPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!entitlements.features.includes("template_manage")) {
    redirect("/");
  }

  const result = await listAnalysisTemplatesAction();

  return (
    <>
      <Header initialUser={user} />
      {result.ok ? (
        <TemplatesManagementPage initialTemplates={result.templates} />
      ) : (
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-6">
            <h1 className="text-xl font-bold text-foreground">Could not load templates</h1>
            <p className="text-sm text-muted-foreground mt-2">{result.message}</p>
          </div>
        </main>
      )}
    </>
  );
}
