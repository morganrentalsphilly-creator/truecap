import { beforeEach, describe, expect, it, vi } from "vitest";
import { PDF_CACHE_VERSION } from "@/lib/pdf-export-constants";
import { cacheSavedAnalysisPdfExport } from "@/lib/pdf/saved-analysis-cache";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  storageFrom: vi.fn(),
  upload: vi.fn(),
  complete: vi.fn(),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({
    auth: { getUser: mocks.getUser },
    storage: { from: mocks.storageFrom },
  }),
}));

vi.mock("@/app/actions/saved-analyses", () => ({
  completeSavedAnalysisPdfExportAction: mocks.complete,
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: mocks.captureMessage,
  captureException: mocks.captureException,
}));

const OWNER_ID = "04599e0c-f6e1-41e1-a178-350f8644be9f";
const ANALYSIS_ID = "76631712-31d9-4ece-913a-a363579e05a7";
const RENDER_FINGERPRINT = "8c4f918d4035f062bc9ff45cb68c1bd8";

describe("saved-analysis PDF cache persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mocks.storageFrom.mockReturnValue({ upload: mocks.upload });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.complete.mockResolvedValue({ ok: true, pdfPath: "stored-path" });
  });

  it("uploads and records the exact server-issued render fingerprint", async () => {
    const pdfBytes = "%PDF-1.7 TrueCap";

    await cacheSavedAnalysisPdfExport({
      analysisId: ANALYSIS_ID,
      renderFingerprint: RENDER_FINGERPRINT,
      pdfBase64: Buffer.from(pdfBytes).toString("base64"),
      renderedWithBranding: true,
      renderedWithBuyBoxVerdict: false,
      buyBoxStateResolved: true,
    });

    const expectedPath = `${OWNER_ID}/${ANALYSIS_ID}/investment-analysis-v${PDF_CACHE_VERSION}-${RENDER_FINGERPRINT}.pdf`;
    expect(mocks.storageFrom).toHaveBeenCalledWith("analysis-pdfs");
    expect(mocks.upload).toHaveBeenCalledWith(expectedPath, expect.any(Blob), {
      contentType: "application/pdf",
      upsert: true,
    });
    const uploadedBlob = mocks.upload.mock.calls[0]?.[1] as Blob;
    expect(uploadedBlob.type).toBe("application/pdf");
    expect(await uploadedBlob.text()).toBe(pdfBytes);
    expect(mocks.complete).toHaveBeenCalledWith(
      ANALYSIS_ID,
      RENDER_FINGERPRINT,
      true,
      false,
      true,
    );
  });

  it("does not attach a report when the storage write fails", async () => {
    mocks.upload.mockResolvedValue({
      error: { message: "storage unavailable" },
    });

    await cacheSavedAnalysisPdfExport({
      analysisId: ANALYSIS_ID,
      renderFingerprint: RENDER_FINGERPRINT,
      pdfBase64: Buffer.from("%PDF").toString("base64"),
      renderedWithBranding: false,
      renderedWithBuyBoxVerdict: false,
      buyBoxStateResolved: true,
    });

    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      "pdf-cache-write upload failed",
      expect.objectContaining({
        level: "warning",
        tags: { feature: "pdf-cache-write" },
      }),
    );
  });
});
