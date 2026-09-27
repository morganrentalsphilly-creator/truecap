/**
 * The founder's private identity, as the guards that forbid it test for it.
 * The founder is described, never named, anywhere in the public repository
 * (their request, 2026-09-07; restated 2026-09-27). Encoded as character
 * codes so the guards never publish what they forbid.
 *
 * Shared by the identity sweep (site-overhaul-product-shots.test.ts) and the
 * author byline/bio guard (author-byline-bio.test.tsx), so both hold the same
 * patterns.
 */

export const privateGivenName = String.fromCharCode(77, 111, 114, 103, 97, 110);
export const privateHandle = String.fromCharCode(
  109, 111, 114, 103, 97, 110, 114, 101, 110, 116, 97, 108, 115, 112, 104, 105, 108, 108, 121,
);
export const forbiddenGivenName = new RegExp(`\\b${privateGivenName}\\b`, "i");
export const forbiddenHandle = new RegExp(privateHandle, "i");
