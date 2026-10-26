# TrueCap product and launch audit — 2026-10-26

Source baseline `f1d8e418` on `main`; production inspected at https://usetruecap.com. Findings T01–T04, T06 and T07 are implemented on the release branch; validation is tracked in TRUECAP_QA.md. T05 remains an explicit paid-allowance decision. T08 has a prepared test kit, not fabricated customer evidence.

## Architecture and assets to retain

- Next.js 16 App Router / React 19 / strict TypeScript; server actions; Tailwind 4 and Radix. Preserve the Blueprint design system in DESIGN.md.
- Supabase Auth, Postgres RLS and Storage; timestamped migrations. Owner-scoped server actions supplement RLS. Stripe subscription checkout, signed webhooks and idempotent processing. Vercel Git deployments; build-integrity guard, unit tests, isolated Supabase browser CI and Lighthouse.
- `lib/calc-analysis.ts` is the canonical rental engine; loan amortization, reserves below NOI, cash-purchase handling, multi-target price solver, projections and methodology versions already exist. Reports use server-side jsPDF and saved/shared snapshots.
- HUD rent and FRED mortgage benchmarks, optional property enrichment, input provenance, review-before-apply imports, manual fallbacks, cost caps and provider rate limits already exist. Licensing and actual production provider costs still require verification.
- Existing free first decision, live preview, sample rental, saved deals, comparisons, templates, Buy Boxes, client roster, notes, pipeline, co-branding, expiring/revocable shares, privacy-conscious analytics and onboarding must be retained and tested.

## Consequential findings

| ID | Finding and evidence | Priority | Complexity / action |
|---|---|---|---|
| T01 | Client workspace sends `notes: null` and `isArchived: false` on every edit, risking loss of private notes and unintended reactivation. `components/investcalc/clients-workspace.tsx`. | P0 | Small; preserve and expose notes, preserve archive state. |
| T02 | Buy Box evaluation treats unavailable selected criteria as skipped and can declare a match if another criterion passes. Nonfinite metrics also need defensive handling. `lib/buy-box.ts`, `lib/agent-client-matching.ts`. | P0 | Medium; distinguish unavailable from inapplicable cash DSCR, fail closed and explain unknowns. |
| T03 | Trial ledger hashes all assumptions; changed inputs count as another analysis. Pricing explicitly discloses this. | P0 activation | Medium/high; separate property metering identity from exact-result authorization without weakening historical paid/report grants. |
| T04 | Multi-client matching is a dark pure helper with no production callers. | P1 | Medium; owner-scoped saved-deal screening, per-client criteria explanations and Offer Ceilings, staged release. |
| T05 | 100 clients share a 12-Buy-Box account ceiling. | P1 | Medium; configure limits, review distinction between new capability and existing customer entitlements before changing live allowance. |
| T06 | Client assignment toast and empty state advertise a live portal while the portal is intentionally unreleased. | P0 trust | Small; describe saved assignment and available share workflow accurately. |
| T07 | Pricing still says “DealCheck is a calculator; TrueCap is a decision,” although DealCheck offers criteria screening, offer calculation and branded reports. | P2 trust | Small; replace with supported workflow comparison. |
| T08 | No new customer validation evidence supplied. Prior audits and functioning code do not establish willingness to pay or two-minute completion. | P3 | External customer testing; prepare protocol and measurement sheet without invented results. |

## Competitive evidence, checked 2026-10-26

- [DealCheck features](https://dealcheck.io/features/) includes imports, rental/sale comps, criteria screening, maximum offers and branded web/PDF reports. These are competitive parity, not unique TrueCap claims. [Pricing](https://dealcheck.io/pricing/) shows free/Plus/Pro and 15 saved properties on Starter; exact premium feature gates need visual verification before comparison copy uses them.
- [Stessa pricing](https://www.stessa.com/pricing/) emphasizes ownership operations: accounting, collection and reporting, with free, Manage and Pro plans. TrueCap should win the acquisition workflow rather than rebuild property accounting.
- [BiggerPockets calculator](https://www.biggerpockets.com/rental-property-calculator) supports cash flow, return projections, assumption editing and report sharing/PDF. Audience and educational reach are meaningful advantages.
- [TheAnalyst PRO](https://www.theanalystpro.com/) targets brokers with underwriting, offering materials and deal execution. TrueCap's opportunity is a simpler rental-agent workflow connecting evidence, client-specific targets and understandable reports.

## Verification still required

The eight financial references pass, with client financing, multi-client snapshots/PDFs, manual rent evidence and property-based trial metering implemented. Current test outcomes and remaining isolated E2E/deployment gates are in TRUECAP_QA.md. Provider contract/costs, actual analytics delivery and customer validation remain external evidence gaps. Unknowns are not classified as absent capabilities. No prices, subscriptions or email audiences are changed by this release.
