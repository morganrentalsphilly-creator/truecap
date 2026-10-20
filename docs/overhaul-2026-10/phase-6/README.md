# Phase 6: the app (2026-10-20)

The dashboard shell, its pages and the auth screens on the Blueprint
tokens, on branch `design/overhaul-2026-10-phase-6` (stacked on Phase 5).
Phase 6 has no checkpoint; Phase 7 (the assets: the social-card frame, the
product shots, the PDF cover) follows, then Phase 8, the final ⛔ QA.

## What was there

Phase 2 had unified the tokens (the rail already took the band's navy, the
dashboard its own font-family declaration, the UI primitives the float
radius and shadow), so the app was on the right colours and faces. What it
still carried was the previous product's chrome: tracked uppercase labels
(66 across the dashboard, settings and workspace files), monospace figures,
16px to 20px card radii with icon tiles in their corners, extrabold
headings, arrows at the end of link text (14), white-on-green and
white-on-orange status chips, three gradient surfaces, two raw hex
colours, and empty states that said what was missing without offering the
sample deal.

## What changed

### The shell (`components/dashboard/`)

- **Sidebar**: links are 8px controls with the cobalt focus ring and named
  transitions; the active link sits on the accent surface without the inset
  highlight; the deal count is a 4px tag in the figure face and the locked
  "Pro" tag a 4px Geist Mono tag (was a "PRO" pill at 11px). The mobile
  drawer (`dashboard-sheet.tsx`, `.dashboard-mobile-sheet`) reads the navy
  tokens; its close button lost its arbitrary blue halo.
- **Topbar**: the sheet at 90% with a blur and one line (was 80% with a
  heavy blur); the hamburger an 8px control; the search the field (white,
  1px line, 8px) instead of a tinted pill; the New Analysis action a primary
  control with the cobalt-deep hover.
- **StatCard**: a white card at the object radius with the rest shadow; a
  12px medium label; the figure in the display face; a signed change in the
  direction's colour (no arrow glyph, no pill); no icon tile. The sparkline
  colours come from tokens (were four raw oklch values).
- **AIInsights** (behind the dashboard kill switch): a card instead of the
  gradient token; the "PREMIUM" pill is a "Pro" tag; labels in sentence
  case. The `--gradient-*`, `--ai-insights-bg` and `--compare-surface`
  tokens are gone from `globals.css`.

### The pages

- A sweep across 49 files (`components/dashboard`, the My Deals, Compare,
  Templates, Clients and Shortlist clients, the deal-workspace panels,
  `components/settings`, `components/profile`, `app/dashboard`,
  `app/settings`, `app/profile`): uppercase tracked labels to 12px medium;
  `rounded-2xl`/`3xl` to the 12px object radius; `rounded-xl` to the 8px
  control radius; `font-mono` figures to `font-figure` (the share URL and
  file names keep Geist Mono); extrabold to semibold; 11px to 12px;
  arbitrary shadows to the rest shadow; `transition-all` to named
  transitions; the three gradient surfaces to `bg-card`; the hex navy on
  the profile's action to the navy token.
- **Headings** in the display face: My Deals, Compare, Templates, Clients,
  Settings, Branding, Profile and the dashboard home at the section sizes;
  the deal workspace and the shortlist at the H3 step; the route-error
  cards too.
- **Status chips** on the Sign Rule: meets on the positive wash in green,
  misses on the highlight wash in the highlight text colour (the Compare
  chips, the Buy Box verdict card, the Buy Boxes card's "misses" marks, the
  Settings page's Agent Pro badge).
- **Empty states** point at the next action with the sample deal: the
  dashboard home, My Deals (new account) and Compare each offer "Try the
  sample deal" (`/dashboard/new?sample=1`, the flag the homepage already
  forwards for a signed-in click) beside the primary action; the icon tiles
  are gone and the headings are the display face.
- **Tables**: the dashboard deals table and the shortlist tables take a soft
  row hover; focus states are the 3px ring, as before.
- **Link text** carries no trailing arrow (the dashboard home's eleven, the
  insights panel, the compare link, the Buy Boxes card). Arrows that are
  data (a stage change, an axis label, a calculation) stay.
- **Toasts, menus, tooltips** were already on the float radius and shadow
  from Phase 2 and are unchanged. There is no `cmdk` palette in the app.

### The auth screens (`components/auth/auth-shell.tsx`)

The paper split layout stays (the form in a 5/12 column, the aside in the
7/12 column from 1024px); the aside now carries the live mini instrument,
the homepage's sample-deal sheet (`HeroSheet`, server-rendered at the
ceiling from the precomputed sweep, the price scrubber hydrating onto it)
above the three trust rows. The forms are unchanged (the field, the Google
button, the 44px toggles and the `$0 today · no card` summary are pinned).

### Left as they are, and why

- `rehab-estimator-card.tsx`'s default rendering is byte-pinned to the
  signed-in checkpoint.
- The agent branding form's default colour (`TRUECAP_BLUE`) is the brand's
  data value, not a token.
- The hex fallbacks on `var(--metric-positive, #16a34a)` in two chart
  tooltips are fallbacks for a token that exists.
- Arrows inside data (`A → B` stage changes, the risk/return axis label,
  the compare calculation line) are not link text.

## Verification

- `tsc`, `lint`: clean.
- Unit: 533 files, 8,998 tests, green (the harness file's two cases are
  skipped unless `HARNESS_OUT` is set; they are a tool, not product tests).
- E2E, public project against the local production build:
  `site-overhaul-conversion.spec.ts` and `public-product.spec.ts`, 35
  passed (the login and sign-up screens render with the sheet; the sample
  flow; axe AA on the homepage and pricing). The signed-in specs
  (`authenticated-*.spec.ts`, 3 projects) need the isolated Supabase that
  CI starts (`browser-regressions` in `ci.yml`); this machine has no Docker
  or Supabase CLI, so they are the pull request's check, not a local run.
- Re-anchored (each named in its commit): `dashboard-methodology-cohorts`
  (12px pill), `batch-triage-ui-guards` (the table frame's radius),
  `saved-deal-durable-reopen` (the 8px control radius; the 44px floor is
  unchanged), `saved-deal-selection` ("Review deal" without the arrow).
  No truth pin changed: the copy, hrefs, `prefetch`, analytics, the 44px
  targets, the 16px fields, the sidebar's "Main menu" label contrast and
  the deals-table reachability are asserted as before.
- Detector, rendered: `/auth/login` and `/auth/sign-up` at 1440 and 390
  (`detector-before/`, `detector-after/`): 0 findings before; after, one
  layout note at 1440 on the login page (the aside with the sheet runs
  taller than the first viewport beside the short form column; the sheet
  is the point of the aside, so this is accepted) and 0 elsewhere. The
  harness-rendered shell: 0 findings at 390; at 1440 one colour note on
  the rail's logo divider, since moved to the navy line token.
- No Lighthouse this phase: the signed-in routes cannot be audited without
  a session, and the public routes are unchanged from Phase 5.

## Captures

- `before/` and `after/`: `/auth/login`, `/auth/sign-up` and
  `/auth/forgot-password` at 375, 768, 1095 and 1440 (the auth screens are
  public routes on the local build).
- `harness/`: the dashboard shell with a stat grid and the login screen,
  rendered with mock data to HTML beside the built stylesheet and
  screenshotted at 1440×900 and 390×844 (`../tools/render-harness.test.tsx`,
  `../tools/static-shot.mjs`). No local Supabase or Docker exists on this
  machine, so the signed-in pages themselves are exercised by the
  authenticated e2e specs in CI, not captured here.
