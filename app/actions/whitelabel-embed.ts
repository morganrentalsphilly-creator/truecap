"use server";

/**
 * Generate the white-label embed snippet for an Agent Pro user.
 *
 * Gated on `embed_whitelabel`. Returns a ready-to-paste <iframe> whose src is a
 * signed /embed/brand/[token] URL (token = {agentUserId, slug}, minted via
 * lib/signed-token). Requires the user to have branding set — a white-label
 * embed with no brand is a contradiction, so we say so instead of emitting a
 * chrome-less calculator. SHARE_LINK_SECRET unset → NOT_CONFIGURED.
 */

import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEntitlementsForUser, hasPlanFeature } from "@/lib/entitlements";
import { mintSignedToken } from "@/lib/signed-token";
import { EMBED_SCOPE } from "@/lib/whitelabel-embed";
import { getEmbedEntry, EMBED_LIST } from "@/lib/embed-registry";
import { getSiteUrl } from "@/lib/site-url";

export type EmbedOption = { slug: string; title: string; defaultHeight: number };

export type WhitelabelEmbedResult =
  | { ok: true; snippet: string; previewUrl: string }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "ENTITLEMENT_REQUIRED"
        | "VALIDATION_ERROR"
        | "BRANDING_REQUIRED"
        | "NOT_CONFIGURED"
        | "SERVER_ERROR";
      message: string;
    };

/** The embeddable calculators an agent can white-label. Safe to call from a
 *  client component; it exposes only public registry metadata. */
export async function listWhitelabelEmbedOptions(): Promise<EmbedOption[]> {
  return EMBED_LIST.map((e) => ({ slug: e.slug, title: e.title, defaultHeight: e.defaultHeight }));
}

export async function getWhitelabelEmbedSnippetAction(input: unknown): Promise<WhitelabelEmbedResult> {
  const parsed = z.object({ slug: z.string().min(1).max(80) }).safeParse(input);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR", message: "Pick a calculator." };

  const entry = getEmbedEntry(parsed.data.slug);
  if (!entry) return { ok: false, code: "VALIDATION_ERROR", message: "That calculator can't be embedded." };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in." };

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!hasPlanFeature(entitlements, "embed_whitelabel")) {
    return { ok: false, code: "ENTITLEMENT_REQUIRED", message: "White-label embeds are an Agent Pro feature." };
  }

  // A white-label embed needs a brand. Require a company or contact name.
  const { data: branding } = await supabase
    .from("branding")
    .select("company_name, contact_name")
    .eq("user_id", user.id)
    .maybeSingle();
  const hasName = Boolean((branding?.company_name || branding?.contact_name || "").trim());
  if (!hasName) {
    return {
      ok: false,
      code: "BRANDING_REQUIRED",
      message: "Add your company or contact name under Branding first — that's the brand the embed wears.",
    };
  }

  const token = mintSignedToken(EMBED_SCOPE, { a: user.id, s: entry.slug });
  if (!token) {
    return { ok: false, code: "NOT_CONFIGURED", message: "White-label embeds aren't configured on this deployment yet." };
  }

  const src = `${getSiteUrl()}/embed/brand/${token}`;
  const snippet =
    `<iframe src="${src}" title="${entry.title}" width="100%" height="${entry.defaultHeight}" ` +
    `style="border:0;max-width:640px" loading="lazy"></iframe>`;
  return { ok: true, snippet, previewUrl: src };
}
