# TrueCap implementation — 2026-10-26

Branch: `codex/truecap-readiness-2026-10-26`; baseline `f1d8e418`. Exact release evidence is in TRUECAP_QA.md. Existing pricing, subscriptions and paid feature grants are unchanged.

## Product trust and activation

- Client edits preserve omitted contact details, private notes and archive status. The roster exposes notes and explicit financing assumptions. Failed roster counts fail closed.
- Selected criteria with unknown/nonfinite inputs cannot produce a positive Buy Box match. Cash DSCR remains inapplicable. Missing market or wrong property type suppresses unsupported Offer Ceilings.
- Evaluation credits meter normalized property addresses, separately from exact-input authorization used by anonymous and historical paid decision grants. Revisions to a credited property remain usable during the 21-day window, including after three slots are used. Comparison quota and expiry are unchanged.
- Owned legacy saved-deal grants can be promoted without a new credit. Unsaved legacy hashes cannot be reversed: running original inputs once promotes that exact grant. Different spellings or unit identifiers can identify different properties; this is address normalization, not parcel resolution. No historical credit refunds or subscription changes occur.

## Agent underwriting

- Screen one saved property against every active client Buy Box, preserving conflicting boxes. Explain every check, client financing and the price satisfying applicable financial targets.
- Financing supports saved deal terms, cash or a fully amortizing loan with down payment, interest, term and PMI assumptions. These are planning inputs, not lender quotes. Property income/expenses and other acquisition assumptions remain shared. Malformed stored preferences require review.
- Save many immutable client matches referencing one property. Each freezes inputs, criteria, screening, date and methodology. A digest rejects stale reviewed results; repeat saves are idempotent. Private notes/contact details are excluded.
- Client PDFs use owned frozen matches and canonical calculations. Client criteria/financing appear with Offer Ceiling, operating statements, downside and verification disclosures. Methodology mismatch blocks a fresh export and requires explicit re-screening; old matches remain unchanged. Retain original downloaded PDFs as sent artifacts; branding is current at export.
- Client links reuse secure sharing, address-disclosure choices, expiration and revocation. Financing and financial targets come from the frozen match. Client names/private notes are excluded. PDFs include full client criteria; public links show the frozen financial scenario. Nothing is sent automatically.
- The primary pipeline client remains separate from many saved matches. Misleading unreleased-portal promises were removed.

## Comparable evidence fallback

A saved-deal worksheet stores user-entered address, source/document reference, optional HTTP(S) URL, observation date, rent, size, adjustment and rationale. Positive rent, valid dates and explained adjustments are required. Archive/restore preserves references. The adjusted range is explicitly user-entered evidence, not a provider estimate.

Saving evidence never changes rent or old reports automatically. Manual references currently remain in the private worksheet; they are not automatically appended to PDFs or public shares. Existing provider report provenance remains unchanged.

## Commercial and website changes

Pricing, signup, audience pages, homepage sections and prompts explain property-based evaluation and revisions. Existing agent-first homepage, free first result, sample and Blueprint design are retained. DealCheck copy now acknowledges its screening, offer and report capabilities.

Existing $29.99/$300 Pro and $59.99/$590 Agent Pro prices remain. Workspace limits are centralized in `lib/commercial-limits.ts`, retaining 100 clients/12 Buy Boxes pending explicit approval of paid allowance changes. New analytics events cover generated/saved matches, client PDF exports and saved rent evidence using count/source only.

## Database and release

- `20261026160000_client_underwriting_workspace.sql`: additive financing column and immutable match table. Owner-only reads; trusted server writes after entitlement/ownership checks; owned-property composite FK and client/Buy Box ownership trigger.
- `20261026161000_manual_rent_evidence.sql`: owner-scoped evidence table, bounded fields, composite owned-property FK and RLS.
- No old migrations, saved analyses, billing rows, credentials or provider settings are rewritten. Match generation has a best-effort account compute brake; PDF/share keep their existing brakes.
- CI adds placeholder Agent Pro Stripe IDs solely for disposable tests. No purchase occurs. The reviewed workflow hash is updated in a separate integrity commit.

## Rollback

1. Disable the existing `agent_client_matching` flag to hide new match UI/actions if needed.
2. Roll back new UI/match/evidence code selectively and retain additive schema and snapshots. Never drop tables containing customer records.
3. **Do not blindly revert property-metering readers.** New/promoted `property-v1:` grants require compatible ledger reading, access and consumption code. Retain these until an explicitly reviewed ledger rollback exists.
4. Do not reset subscriptions, entitlements, original reports, anonymous exact grants or historical paid-claim recovery.

Client PDFs use the complete frozen criteria result for the main verdict, so unknown/wrong market or property type cannot be hidden by favorable financial metrics. Financial-only links are refused when those scope criteria are unverified or not met; the full PDF remains available. Cash downside DSCR uses a compact N/A label with No debt service below it.
