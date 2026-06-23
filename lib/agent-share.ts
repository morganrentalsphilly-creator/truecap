import "server-only";

/**
 * Public-facing agent branding for co-branding a /d/[encoded] share page (T6).
 *
 * Returns null unless the share owner is a Pro user with the `custom_branding`
 * entitlement AND a branding row with something to show. Uses the service-role
 * admin client because the share page is public (no viewer session) and the
 * branding RLS is owner-only — but every field returned here is data the agent
 * already chose to make public on their exported reports. We never return
 * account/auth fields.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getEntitlementsForUser, hasPlanFeature } from "@/lib/entitlements";

export type PublicAgentBranding = {
  /** Company or contact name — guaranteed non-empty. */
  displayName: string;
  tagline: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactWebsite: string | null;
};

export async function getPublicAgentBranding(
  ownerId: string | undefined | null
): Promise<PublicAgentBranding | null> {
  if (!ownerId) return null;
  try {
    const admin = createAdminSupabaseClient();

    const entitlements = await getEntitlementsForUser(admin, ownerId);
    if (!hasPlanFeature(entitlements, "custom_branding")) return null;

    const { data } = await admin
      .from("branding")
      .select(
        "company_name, tagline, logo_url, primary_color_hex, contact_name, contact_email, contact_phone, contact_website"
      )
      .eq("user_id", ownerId)
      .maybeSingle();
    if (!data) return null;

    const displayName = (data.company_name || data.contact_name || "").trim();
    if (!displayName) return null; // nothing meaningful to co-brand with

    return {
      displayName,
      tagline: data.tagline ?? null,
      logoUrl: data.logo_url ?? null,
      primaryColor:
        typeof data.primary_color_hex === "string" && /^#[0-9A-Fa-f]{6}$/.test(data.primary_color_hex)
          ? data.primary_color_hex
          : null,
      contactName: data.contact_name ?? null,
      contactEmail: data.contact_email ?? null,
      contactPhone: data.contact_phone ?? null,
      contactWebsite: data.contact_website ?? null,
    };
  } catch {
    // Co-branding is best-effort — if branding/entitlements can't be read
    // (e.g. migration pending), fall back to the generic TrueCap view.
    return null;
  }
}
