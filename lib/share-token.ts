import "server-only";

/**
 * Token primitives for opaque public shares (/s/[token]).
 *
 * The raw token is the ONLY secret: it appears in the minted URL and nowhere
 * else. The database stores its sha256 — so a database read alone cannot
 * reconstruct working share links, and tokens can't be enumerated (256 bits of
 * entropy, non-sequential).
 *
 * Kept pure (crypto only, no IO) so entropy/format/hashing are unit-testable.
 */

import { createHash, randomBytes } from "crypto";

/** 32 random bytes → 43-char base64url. */
export function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}

/** sha256 hex of the raw token — the at-rest representation. */
export function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Shape check before any DB round-trip: exactly the base64url alphabet at the
 * generated length. Rejecting junk here keeps crawler noise and probe traffic
 * away from the database entirely.
 */
export function isWellFormedShareToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
