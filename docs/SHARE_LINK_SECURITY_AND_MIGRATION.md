# Share-link security and migration

**Status: implemented 2026-08-17 · opaque shares live once migration `20260817150658_public_shares.sql` is applied**

## The problem being retired

Legacy public shares (`/d/[encoded]`) put the ENTIRE analysis — address, rent,
price, every assumption — base64-encoded in the URL path. Anyone holding the
URL holds the data; it lands in referrer logs, chat link-previews, browser
history sync, and analytics tools. Links were also irrevocable: once sent,
forever live.

## The replacement

`/s/[token]` — opaque server-backed shares:

| Property | Implementation |
|---|---|
| URL contents | one random 256-bit token (43-char base64url), nothing else |
| At rest | `public_shares.token_hash` = sha256(token); a DB read alone can't reconstruct links |
| Snapshot | immutable jsonb captured at mint, pinned to `calc_version` |
| Ownership | `owner_id` is required for new shares; historical ownerless rows remain readable until expiry |
| Expiry | default `now() + 180 days`; NULL = explicit never |
| Revocation | `revoked_at` — owner action via `revokePublicShareAction` (RLS-scoped) |
| Resolution | service-role server route; RLS has deliberately NO public read policy |
| Robots | `noindex, nofollow, noarchive, nosnippet` (meta + `X-Robots-Tag`) |
| Referrer | `Referrer-Policy: no-referrer` on `/d/`, `/s/`, `/portal/` |
| Caching | `Cache-Control: private, no-store` — a revoked link dies immediately, no CDN afterlife |
| Probes | malformed tokens rejected pre-DB; unknown/revoked/expired all render one identical 404 (no oracle) |

Attribution (co-branding + lead capture) is server-trusted at mint (the row
records the session's owner), and the page bridges to the legacy-hardened
lead-capture write path by minting a valid HMAC on the fly — that write path is
unchanged.

Portal deal links (`/portal/[token]/d/[dealId]`) replaced their encoded `/d/`
URLs: ids only in the URL; the nested page re-verifies the portal token HMAC,
the agent's live entitlement, and the deal↔client assignment server-side.

## Legacy compatibility (time-boxed)

- `/d/[encoded]` KEEPS decoding (CLAUDE.md §8.8 — links in the wild must not
  break) and now renders through the same `SharedDealShell` as `/s/`.
- The share button creates only opaque links and fails closed when storage is
  unavailable; it never puts a new analysis snapshot back into a URL.
- New share creation requires a signed-in account. Historical opaque rows with
  `owner_id = null` and legacy `/d/` links remain readable for compatibility,
  but only newly created owned links can be listed and revoked from an account.
- **Deprecation date: 2027-02-01.** After that date, revisit `/d/` and decide
  whether to redirect remaining traffic to an upgrade prompt. Until then the
  legacy payload is never logged or sent to analytics (no-referrer + Sentry
  path scrubbing; TrackSharedDealView sends only a boolean).

## Owner actions

1. Apply `supabase/migrations/20260817150658_public_shares.sql` in the Supabase
   SQL editor (idempotent; ends with a verification select that must return one
   row with `policies = 4`, `rls_enabled = true`). Until applied, new share
   creation fails closed; existing `/s/` and `/d/` viewers are unaffected.

## Test coverage

`lib/__tests__/public-share.test.ts`: token entropy/uniqueness/shape,
hash stability, malformed rejection, header-contract presence AND ordering (the
override block must sit after the catch-all or Next's merge silently reverts
no-referrer), authenticated owner creation, opaque-only failure, portal URLs
carrying ids only, `/d/` still decoding. Verified on a production build: malformed and
unknown tokens 404; headers present on `/s/` and `/d/`; a valid legacy link
still renders.
