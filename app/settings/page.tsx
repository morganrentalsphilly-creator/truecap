import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserDefaultsCard } from "@/components/settings/user-defaults-card";
import { BuyBoxesCard } from "@/components/settings/buy-boxes-card";
import { AgentClientsCard } from "@/components/settings/agent-clients-card";
import { WhitelabelEmbedCard } from "@/components/settings/whitelabel-embed-card";
import { RateAlertsToggle } from "@/components/settings/rate-alerts-toggle";
import { WeeklySummaryToggle } from "@/components/settings/weekly-summary-toggle";
import { FinancingProfilesCard } from "@/components/settings/financing-profiles-card";
import { getEntitlementsForUser, hasPlanFeature } from "@/lib/entitlements";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { isFeatureReleased } from "@/lib/entitlements-catalog";
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
      <main id="main" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-5 space-y-6">
        <UserDefaultsCard />

        {/* Reusable lender terms. Both this surface and every backing action
            fail closed behind the rollout flag; the migration must land
            before the flag is enabled. */}
        {isFeatureEnabled("financing_profiles") ? <FinancingProfilesCard /> : null}

        {/* Buy Boxes — self-gates: shows a Pro upsell to free users, the
            multi-box manager to Pro. Drives the inline buy-box verdict on
            analyses (each deal is screened against every active box). */}
        {/* id anchors /dashboard/clients' "Set their buy box" link. On the
            wrapper, not inside the card, so it resolves for every branch the
            card can render (and scrolls correctly on mobile). */}
        <div id="buy-boxes" className="scroll-mt-20">
          <BuyBoxesCard />
        </div>

        {/* Agent Pro client roster — self-hides for everyone without the
            client_buy_box entitlement (and while its migration is pending). */}
        <AgentClientsCard />

        {/* Provisioning can lead launch readiness. The catalog release gate
            keeps this runtime entry point dark until the embed license is
            expressly approved, even if a plan already carries the flag. */}
        {isFeatureReleased("embed_whitelabel") ? <WhitelabelEmbedCard /> : null}

        {/* Deal rate alerts — opt-in for the weekly rate-alert email.
            Self-hides until the schema migration is applied. */}
        <RateAlertsToggle />

        {/* Weekly portfolio summary — opt-in for the weekly summary email
            (its own consent surface, separate from rate alerts).
            Self-hides until the weekly_summary migration is applied. */}
        <WeeklySummaryToggle />

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
      </main>
    </>
  );
}
