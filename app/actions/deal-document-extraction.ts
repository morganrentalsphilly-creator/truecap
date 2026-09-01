"use server";

/**
 * Extract numeric candidates from a deal document, and apply ONE confirmed
 * value to the saved deal.
 *
 * Trust contract (v1):
 *  - Text-layer PDFs only. A scanned image yields NO_TEXT_LAYER, stated
 *    plainly — never a guess.
 *  - Extraction proposes; nothing is written until the user clicks Apply on
 *    a specific candidate whose source snippet they can read.
 *  - Apply reuses saveDealAction's update path wholesale, so revision
 *    bumping, verdict recompute, entitlement checks, and every persistence
 *    invariant come from the one existing engine instead of a parallel one.
 *  - Ownership is by construction: the storage path must be
 *    `${user.id}/${dealId}/…`, and the download runs under the USER's
 *    session, so the bucket's RLS SELECT policy is a second, independent
 *    gate in front of the same rule.
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  extractDealDocumentCandidates,
  type ExtractionCandidate,
} from "@/lib/document-extraction";
import { normalizeReleasedInvestmentFormSnapshot } from "@/lib/underwriting-model-release";
import { saveDealAction } from "@/app/actions/saved-analyses";

const BUCKET = "deal-documents";
const MAX_TEXT_CHARS = 200_000;

export type ExtractDealDocumentResult =
  | { ok: true; candidates: ExtractionCandidate[]; fileName: string }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "VALIDATION_ERROR"
        | "NOT_FOUND"
        | "NO_TEXT_LAYER"
        | "SERVER_ERROR";
      message: string;
    };

const extractInputSchema = z.object({
  savedDealId: z.string().uuid(),
  /** Full storage object path as listed by the documents card. */
  path: z.string().min(8).max(512),
});

export async function extractDealDocumentAction(
  input: unknown,
): Promise<ExtractDealDocumentResult> {
  const parsed = extractInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid document reference." };
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      code: "SIGN_IN_REQUIRED",
      message: "Your session has expired. Sign in again to continue.",
    };
  }
  const { savedDealId, path } = parsed.data;
  // Ownership by construction, mirroring the bucket policy exactly.
  if (!path.startsWith(`${user.id}/${savedDealId}/`)) {
    return { ok: false, code: "NOT_FOUND", message: "That document is not on this deal." };
  }
  if (!/\.pdf$/i.test(path)) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Number extraction works on PDF documents (leases, tax bills, insurance pages).",
    };
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(path);
  if (downloadError || !blob) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "That document is no longer available. Refresh the page and try again.",
    };
  }

  let text = "";
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(await blob.arrayBuffer()));
    const extracted = await extractText(pdf, { mergePages: true });
    const rawText: unknown = extracted.text;
    text = (Array.isArray(rawText) ? rawText.join("\n") : String(rawText ?? ""))
      .slice(0, MAX_TEXT_CHARS);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "deal-document-extraction" },
    });
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "This PDF could not be read. Try re-exporting it and uploading again.",
    };
  }

  if (text.trim().length < 20) {
    return {
      ok: false,
      code: "NO_TEXT_LAYER",
      message:
        "This PDF has no selectable text — it's likely a scan or photos. Enter the numbers manually; extraction only reads real text so it never guesses.",
    };
  }

  const fileName = path.split("/").pop() ?? "document";
  return { ok: true, candidates: extractDealDocumentCandidates(text), fileName };
}

export type ApplyExtractedValueResult =
  | { ok: true; savedDealId: string }
  | { ok: false; code: string; message: string };

const applyInputSchema = z.object({
  savedDealId: z.string().uuid(),
  field: z.enum(["monthlyRent", "propertyTaxAnnual", "insuranceMonthly"]),
  value: z.number().positive().finite(),
});

export async function applyExtractedValueAction(
  input: unknown,
): Promise<ApplyExtractedValueResult> {
  const parsed = applyInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid value." };
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      code: "SIGN_IN_REQUIRED",
      message: "Your session has expired. Sign in again to continue.",
    };
  }
  const { savedDealId, field, value } = parsed.data;
  const { data: row, error } = await supabase
    .from("saved_analyses")
    .select("form_snapshot, property_type, underwriting_revision")
    .eq("id", savedDealId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !row) {
    return { ok: false, code: "NOT_FOUND", message: "Deal was not found." };
  }
  const values = normalizeReleasedInvestmentFormSnapshot(row.form_snapshot);
  if (!values) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "This deal uses a recorded model version that can't be edited here. Open it in the analyzer instead.",
    };
  }

  const next: Record<string, unknown> = { ...values };
  if (field === "monthlyRent") {
    if (values.propertyType !== "single-family") {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message:
          "This deal has multiple units, so a single lease rent can't be applied automatically. Edit the unit's rent in the analyzer.",
      };
    }
    next.monthlyRent = value;
    // The units array mirrors the single-family rent; keep them consistent
    // the same way the form does.
    const units = Array.isArray(values.units) ? values.units : [];
    if (units.length === 1) {
      next.units = [{ ...units[0], monthlyRent: value }];
    }
  } else if (field === "propertyTaxAnnual") {
    next.propertyTaxInputMode = "annual";
    next.propertyTaxAnnual = value;
  } else {
    next.insuranceInputMode = "monthly";
    next.insuranceMonthly = value;
  }

  // saveDealAction's update path refuses to write without the caller proving
  // which revision it read (hasOwnProperty check → unconditional STALE_DATA),
  // so the revision loaded above rides along — same shape as the
  // apply-template-to-deal call in analysis-templates.
  const saved = await saveDealAction(next, savedDealId, undefined, {
    expectedUnderwritingRevision: (
      row as { underwriting_revision?: unknown }
    ).underwriting_revision,
  });
  if (!saved.ok) {
    if (saved.code === "STALE_DATA") {
      return {
        ok: false,
        code: "STALE_DATA",
        message:
          "This deal changed since the numbers were extracted. Refresh the page and run extraction again.",
      };
    }
    return {
      ok: false,
      code: saved.code ?? "SERVER_ERROR",
      message:
        saved.message ??
        "The value could not be applied. Please try again.",
    };
  }
  // The workspace header strip renders from the server page; the card's
  // router.refresh() alone can serve a cached segment, so invalidate the
  // route server-side too (saveDealAction itself never revalidates paths).
  revalidatePath(`/dashboard/saved-analyses/${savedDealId}`);
  return { ok: true, savedDealId };
}
