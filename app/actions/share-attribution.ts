"use server";

/**
 * Mint a signed owner-attribution for a share link. The signature is over
 * {ownerId, dealId, valuesHash} and can only be produced server-side (it needs
 * SHARE_LINK_SECRET), so a hand-edited /d payload can't impersonate another
 * owner's branding or lead capture. The public viewer re-verifies it.
 *
 * Returns null for anonymous sharers, an unverifiable saved deal, an invalid
 * payload, or when SHARE_LINK_SECRET isn't configured — in every case the
 * share simply renders the generic TrueCap view.
 */

import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { investmentFormSchema } from "@/lib/investcalc-schema";
import { hashShareValues, signShareAttribution } from "@/lib/share-attribution";

export type SignedShareAttribution = {
  ownerId: string;
  dealId?: string;
  sig: string;
};

const inputSchema = z.object({
  values: z.unknown(),
  savedDealId: z.string().uuid().optional(),
});

export async function getSignedShareAttribution(input: unknown): Promise<SignedShareAttribution | null> {
  const parsedInput = inputSchema.safeParse(input);
  if (!parsedInput.success) return null;

  // Hash the SAME canonical values the viewer will re-derive (Zod-parsed), so
  // the signature matches at verify time.
  const parsedValues = investmentFormSchema.safeParse(parsedInput.data.values);
  if (!parsedValues.success) return null;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // anonymous share → generic view

  let dealId: string | undefined;
  if (parsedInput.data.savedDealId) {
    // Only bind a dealId the caller actually owns — comps are gated on it.
    const { data: owned } = await supabase
      .from("saved_analyses")
      .select("id")
      .eq("id", parsedInput.data.savedDealId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (owned) dealId = parsedInput.data.savedDealId;
  }

  const valuesHash = hashShareValues(parsedValues.data);
  const sig = signShareAttribution({ ownerId: user.id, dealId, valuesHash });
  if (!sig) return null; // SHARE_LINK_SECRET unset → co-branding stays off

  return { ownerId: user.id, dealId, sig };
}
