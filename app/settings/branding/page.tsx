import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getEntitlementsForUser, hasPlanFeature } from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getBranding } from "@/app/actions/branding";
import { BrandingForm } from "@/components/settings/branding-form";

export const metadata: Metadata = {
  title: "Branding · Settings",
  description: "Customize PDF reports with your logo, brand color, and contact info.",
  alternates: { canonical: "/settings/branding" },
  robots: { index: false, follow: false },
};

export default async function BrandingSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  const isEntitled = hasPlanFeature(entitlements, "custom_branding");

  // Always fetch existing branding — even unentitled users keep their
  // saved row (so re-upgrade is friction-free). We just disable the
  // form in the UI when not entitled.
  const result = await getBranding();
  const initialBranding = result.ok ? result.branding : null;

  // Profile pre-fill for contact fields was removed — the Contact
  // block (name/email/phone/website) is no longer part of the
  // branding UI now that "Prepared by [Name]" was removed from the
  // PDF entirely.

  return (
    <>
      <main
        id="main"
        className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-5 space-y-6"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Link
              href="/settings"
              className="hover:text-foreground underline-offset-2 hover:underline"
            >
              Settings
            </Link>
            <span className="mx-2 text-muted-foreground/50">/</span>
            <span>Branding</span>
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
            PDF report branding
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your logo and set your brand color, company info, and contact
            details. They&rsquo;ll automatically appear on every PDF report you
            export.
          </p>
        </div>

        {!isEntitled ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand-orange)]">
              Pro feature
            </p>
            <h2 className="mt-2 text-xl font-bold text-foreground">
              Brand your reports with your own logo
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Pro users can replace the TrueCap branding on exported PDFs with
              their own logo, brand color, and contact details. Perfect for
              agents, brokers, and property managers sharing analyses with
              clients.
            </p>
            <Link
              href="/pricing"
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              See Pro plans
            </Link>
          </div>
        ) : (
          <BrandingForm initial={initialBranding} />
        )}
      </main>
    </>
  );
}
