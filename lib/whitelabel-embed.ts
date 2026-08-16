import "server-only";

/**
 * White-label embeds — an Agent Pro user drops a TrueCap calculator on their
 * own site under THEIR brand, with no "Powered by TrueCap" footer.
 *
 * EMBED_SCOPE-signed token carries {agentUserId, slug}. This module verifies
 * (at view time, via the admin client since the embed is public) that the
 * agent still holds `embed_whitelabel` AND has real branding to apply, then
 * hands the route the calculator entry + the public brand. No entitlement or
 * no branding → null, and the route falls back to the standard branded embed
 * (never a chrome-less calculator with nobody's name on it).
 *
 * Only the widget + brand cross to the client; nothing account-level does.
 */

import { getEmbedEntry, type EmbedEntry } from "@/lib/embed-registry";
import { getEntitlementsForUser, hasPlanFeature } from "@/lib/entitlements";
import { getPublicAgentBranding, type PublicAgentBranding } from "@/lib/agent-share";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isFeatureReleased } from "@/lib/entitlements-catalog";

export const EMBED_SCOPE = "whitelabel-embed.v1";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type WhitelabelEmbed = {
  entry: EmbedEntry;
  branding: PublicAgentBranding;
};

export async function loadWhitelabelEmbed(input: {
  agentUserId: string;
  slug: string;
}): Promise<WhitelabelEmbed | null> {
  if (!isFeatureReleased("embed_whitelabel")) return null;
  const { agentUserId, slug } = input;
  if (!UUID_RE.test(agentUserId)) return null;

  const entry = getEmbedEntry(slug);
  if (!entry) return null; // unknown/removed calculator slug

  try {
    const admin = createAdminSupabaseClient();
    const entitlements = await getEntitlementsForUser(admin, agentUserId);
    if (!hasPlanFeature(entitlements, "embed_whitelabel")) return null;

    // getPublicAgentBranding additionally requires custom_branding (which every
    // agent_pro plan includes) and a non-empty display name. No brand = nothing
    // to white-label with, so we decline and let the route show the standard
    // TrueCap-branded embed instead of a chrome-less orphan.
    const branding = await getPublicAgentBranding(agentUserId);
    if (!branding) return null;

    return { entry, branding };
  } catch {
    return null;
  }
}
