import { redirect } from "next/navigation";
import { Header } from "@/components/investcalc/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getEntitlementsForUser } from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);

  return (
    <>
      <Header initialUser={user} initialEntitlements={entitlements} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-5">
        <Card className="border-border/70 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Settings</CardTitle>
              <Badge variant="outline">Account</Badge>
            </div>
            <CardDescription>
              Manage your account preferences. More controls can be added here as the app grows.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Email notifications</p>
              <p className="font-semibold text-foreground">Enabled</p>
            </div>
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Two-factor auth</p>
              <p className="font-semibold text-foreground">Not configured</p>
            </div>
            <div className="rounded-lg border p-4 bg-muted/30 sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Signed in as</p>
              <p className="font-semibold text-foreground break-all">{user.email}</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
