import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { isSavedAnalysisPdfArtifactAttestation } from "@/lib/pdf-export-constants";

type SavedAnalysisPdfArtifactIdentity = {
  userId: string;
  analysisId: string;
  cacheVersion: number;
  renderFingerprint: string;
  pdfBytes: Uint8Array;
};

function artifactPayload(input: SavedAnalysisPdfArtifactIdentity): string {
  const contentDigest = createHash("sha256")
    .update(input.pdfBytes)
    .digest("hex");
  return [
    "truecap-saved-pdf-v1",
    input.userId,
    input.analysisId,
    String(input.cacheVersion),
    input.renderFingerprint,
    contentDigest,
  ].join("\n");
}

/**
 * Bind the exact server-rendered PDF bytes to their owner, deal, cache
 * version, and render fingerprint. The same server-only secret already used
 * for TrueCap share attribution is reused so this adds no deployment secret.
 * When the secret is absent, caching fails closed while fresh exports still
 * work.
 */
export function signSavedAnalysisPdfArtifact(
  input: SavedAnalysisPdfArtifactIdentity,
): string | null {
  const secret = process.env.SHARE_LINK_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret)
    .update(artifactPayload(input))
    .digest("hex");
}

/** Verify bytes after downloading them from owner-writable storage. */
export function verifySavedAnalysisPdfArtifact(
  input: SavedAnalysisPdfArtifactIdentity & { attestation: unknown },
): boolean {
  if (!isSavedAnalysisPdfArtifactAttestation(input.attestation)) return false;
  const expected = signSavedAnalysisPdfArtifact(input);
  if (!expected) return false;
  return timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(input.attestation, "hex"),
  );
}
