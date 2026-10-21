# The home opens on the deal list (2026-10-21)

The founder's answer to the adversarial audit's Q1
(`docs/overhaul-2026-10/adversarial-audit/audit.md` on the trust-pass branch;
benchmarks P9, density by sign): the signed-in home leads with the deal list,
the gap to asking as a signed column, instead of KPI tiles. The design record
is DESIGN.md, "The home (2026-10-21, audit Q1)".

## What the audit saw, and what was live

The audit read `DashboardHome.tsx` and found "a Portfolio overview of two stat
cards and a strip". That block renders only with the `focused_dashboard` kill
switch off. With the flag on (its default, `lib/feature-flags.ts`) the home
opened on the Decision center: a card of three or four tinted tiles with
icons, then the list in a second card, each phone row a card of tiles inside
it. See `captures/home-before-*.png`.

## What changed

| Before | After |
|---|---|
| Decision center tiles first; the list's heading 605px down at 375, 488px at 1440 | The list is the first section under the page heading at every width; its heading 227px down at 375, 193px from 768 |
| The list in a card; zebra rows; each phone row a card of four tiles | On the sheet: one 1px graphite line, rows on soft lines, the band on hover |
| Gap "$29,000 over" / "$12,500 under", computed in the component | "+$29,000" / "−$12,500" in the figure face, set on the server beside the solved ceiling (`offerCeilingGap`) |
| Sorted by gap, largest over first | Most room under the ceiling first |
| "Recorded v1.3 · Sorted only within this model version" topping every list | The header renders only when the book mixes model versions |
| Table from 1024px; at 1095 no deal row reaches the first screen | Rows below 1280px (a six-column table with the verdict chips on one line clipped the gap at 1095 in this pass's first build); a fixed-width table from 1280; at 1095 the first screen shows five deals |
| Screening record: two display-size figures in a card | Two ruled rows under the list, beside the Decision center from 1280 |
| "Pipeline Value", "Monthly Cash Flow", "Cash to Close", "Needs Review" (kill-switch layout and the owned section) | Sentence case |

No calculation, threshold, price or entitlement changed. The Offer Ceiling
still comes from `computeDealOfferLine` / the recorded capture inside the paid
gate; the gap is the same subtraction Compare and the triage table make.

## How it was verified

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm test` (Vitest) | 9,070 passed, 2 skipped |
| `npm run lint` on the changed files | clean |
| Impeccable detector on the three components | one advisory (an off-ramp 15px in the kill-switch block), fixed |
| `node scripts/verify-build-integrity.mjs` | clean |
| Production build with the `scripts/dev-isolated.sh` environment, served by `dev-isolated.sh start`, signed in through the real login form | `/dashboard` renders at 375, 768, 1095 and 1440: no horizontal overflow, no control under 44px in the list or the Decision center, the list first, the gaps signed in green and red with tabular figures, no console errors except the local Vercel Insights 404 (`captures/home-after-report.json`) |
| The authenticated Playwright project (`authenticated-chromium`) | Runs in CI's `browser-regressions` job against its disposable Supabase stack. Not run locally: this Mac has no Docker or Supabase CLI. |

The signed-in local run used a loopback stand-in for Supabase Auth and
PostgREST on 127.0.0.1:54321 (the origin `dev-isolated.sh` already points
at), serving one Pro user and eight fixture deals. The fixtures were built
through the real engine the way a save builds them (calculateAnalysis, the
Deal score, the Offer Ceiling captured with `resolveOfferCeilingForAccess`,
recorded at methodology v1.3). The stand-in is read-only and is not part of
this change. The addresses are fixture labels, not real properties.

Not verified here: real Supabase and RLS (CI covers them), Safari, and a book
with leads, due-diligence deadlines or rate changes (those notices keep their
place above the list).
