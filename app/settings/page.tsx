import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/investcalc/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserDefaultsCard } from "@/components/settings/user-defaults-card";
import { BuyBoxCard } from "@/components/settings/buy-box-card";
import { getEntitlementsForUser, hasPlanFeature } from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your TrueCap account preferences and analysis defaults.",
  alternates: { canonical: "/settings" },
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  const canCustomizeBranding = hasPlanFeature(entitlements, "custom_branding");

  return (
    <>
      <Header initialUser={user} initialEntitlements={entitlements} />
      <main id="main" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-5 space-y-6">
        <UserDefaultsCard />

        {/* Buy Box — self-gates: shows a Pro upsell to free users, the
            editor to Pro. Drives the inline buy-box verdict on analyses. */}
        <BuyBoxCard />

        {/* Branding card — links to the dedicated /settings/branding page.
            Shown for everyone (Pro link + Pro badge for unentitled users
            to surface the upsell). */}
        <Card className="border-border/70 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>PDF report branding</CardTitle>
              {canCustomizeBranding ? (
                <Badge variant="outline">Pro</Badge>
              ) : (
                <Badge className="bg-[var(--brand-orange)] text-white">
                  Pro
                </Badge>
              )}
            </div>
            <CardDescription>
              Replace the TrueCap header on exported PDFs with your own logo,
              brand color, and contact info. Useful for agents, brokers, and
              property managers sharing analyses with clients.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/settings/branding"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              {canCustomizeBranding ? "Configure branding" : "Preview branding"}
            </Link>
          </CardContent>
        </Card>
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
