/** Pure lifecycle predicates shared by the opaque resolver and tests. */

export function isPublicShareExpired(
  expiresAt: string | null | undefined,
  nowMs = Date.now()
): boolean {
  if (!expiresAt) return false;
  const expiryMs = Date.parse(expiresAt);
  // A malformed persisted expiry must fail closed; the viewer cannot safely
  // infer that an unreadable lifecycle value means "never expires."
  return !Number.isFinite(expiryMs) || expiryMs <= nowMs;
}
