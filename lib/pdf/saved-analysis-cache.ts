"use client";

import * as Sentry from "@sentry/nextjs";
import { completeSavedAnalysisPdfExportAction } from "@/app/actions/saved-analyses";
import {
  ANALYSIS_PDF_BUCKET,
  buildAnalysisPdfObjectPath,
  PDF_CACHE_VERSION,
} from "@/lib/pdf-export-constants";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type SavedAnalysisPdfCacheInput = {
  analysisId: string;
  renderFingerprint: string;
  pdfBase64: string;
  renderedWithBranding: boolean;
  renderedWithBuyBoxVerdict: boolean;
  buyBoxStateResolved: boolean;
};

/**
 * Best-effort persistence for a server-rendered saved-analysis report.
 *
 * The user already has the local download before this starts. Storage writes
 * and the completion action deliberately share the server-issued fingerprint,
 * so an edit that lands during rendering can leave only an unreachable object
 * rather than attaching stale bytes to the deal.
 */
export async function cacheSavedAnalysisPdfExport({
  analysisId,
  renderFingerprint,
  pdfBase64,
  renderedWithBranding,
  renderedWithBuyBoxVerdict,
  buyBoxStateResolved,
}: SavedAnalysisPdfCacheInput): Promise<void> {
  try {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const pdfBytes = Uint8Array.from(atob(pdfBase64), (character) =>
      character.charCodeAt(0),
    );
    const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
    const filePath = buildAnalysisPdfObjectPath(
      user.id,
      analysisId,
      PDF_CACHE_VERSION,
      renderFingerprint,
    );
    const { error: uploadError } = await supabase.storage
      .from(ANALYSIS_PDF_BUCKET)
      .upload(filePath, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      Sentry.captureMessage("pdf-cache-write upload failed", {
        level: "warning",
        tags: { feature: "pdf-cache-write" },
        extra: { message: uploadError.message },
      });
      return;
    }

    // No public URL crosses this boundary. The private object path is derived
    // again on the server, which then mints short-lived signed URLs on reads.
    const completeResult = await completeSavedAnalysisPdfExportAction(
      analysisId,
      renderFingerprint,
      renderedWithBranding,
      renderedWithBuyBoxVerdict,
      buyBoxStateResolved,
    );
    if (!completeResult.ok && completeResult.code !== "STALE_EXPORT") {
      Sentry.captureMessage("pdf-cache-write complete action failed", {
        level: "warning",
        tags: { feature: "pdf-cache-write" },
        extra: {
          code: completeResult.code,
          message: completeResult.message,
        },
      });
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "pdf-cache-write" },
    });
  }
}
