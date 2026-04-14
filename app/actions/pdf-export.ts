"use server";

import { getEntitlementsForUser } from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PdfExportGateResult =
  | { ok: true }
  | { ok: false; code: "SIGN_IN_REQUIRED" | "UPGRADE_REQUIRED" };

/**
 * Server gate for PDF export. Generation can be added later; callers must not trust the client.
 */
export async function requestPdfExportAction(): Promise<PdfExportGateResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED" };
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!entitlements.features.includes("pdf_export")) {
    return { ok: false, code: "UPGRADE_REQUIRED" };
  }

  return { ok: true };
}
