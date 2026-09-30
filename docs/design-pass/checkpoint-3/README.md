# Checkpoint 3: the homepage, before rollout (2026-09-30)

The chosen direction ("The expandable ledger", checkpoint 2) built on the
homepage only, with every change in tokens and shared components. Branch
`design/ledger-pass`; the "before" is the copy pass at `de81b02`
(`../baseline/`). Measured on local production builds with the isolated env
(fake Supabase, paid providers blanked), same harness as the baseline.

The build ran code-led: `.impeccable/config.json` records `buildPath: "comp"`
as the brief set it, but no image generation is configured here
(`OPENAI_API_KEY` unset), so no comp round existed. The checkpoint-2
directions were drawn in code and serve as the critique reference.

## Numbers

### Lighthouse 12.8.2, median of 3 runs each (baseline rerun under the same conditions)

| | Perf | A11y | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| before `/` mobile | 0.86 | 1.00 | 0.96 | 1.00 | 4.1 s | 0.003 | 40 ms |
| **after `/` mobile** | **0.88** | **1.00** | **0.96** | **1.00** | **3.9 s** | **0.002** | 47 ms |
| before `/` desktop | 1.00 | 1.00 | 0.96 | 1.00 | 0.80 s | 0.002 | 0 ms |
| **after `/` desktop** | **0.99** | **1.00** | **0.96** | **1.00** | **0.83 s** | **0.001** | 0 ms |

Best practices is 0.96 on both for the local-only `/_vercel/insights` 404.
Mobile runs spread widely (before 0.80–0.89, 3.8–5.5 s; after 0.87–0.90,
3.6–4.1 s); desktop LCP 800 vs 825 ms is inside the baseline's own
800–1,100 ms spread. The hero's largest paint is now text, not an image.

### Lab vitals with interactions (`local/vitals-home.json`, 3 runs per profile)

| | INP desktop | INP mobile | LCP desktop | LCP mobile | CLS desktop | CLS mobile |
|---|---|---|---|---|---|---|
| before | 48–56 ms | 72–88 ms | 60–96 ms | 136–280 ms | 0.0019 | 0 |
| **after** | **48–56 ms** | **80 ms** | **52–96 ms** | **136–140 ms** | **0.0011** | **0** |

The FAQ interaction now targets the FAQ's own rows (`#questions`): since this
pass the walkthrough ledger's rows are `<details>` too.

### Slop scores on `/`

| Tool | before | after |
|---|---|---|
| slop-detect 0.5.2, design | 25/100, Mild, C | **16/100, Mild, B** |
| slop-detect 0.5.2, copy | 4, Clean | 4, Clean (`rule_of_three`: real lists) |
| design-slop-cop | 7/100, Clean | 7/100, Clean |

What slop-detect still flags: `cream_default_bg` (the Newsprint paper
DESIGN.md decided), `faq_accordion` (DESIGN.md's FAQ is `<details>` rows),
`nested_cards` (the band row, the walkthrough grid and the plan cards, none of
which nests a card) and `stat_banner` (the three plan prices).

### Impeccable detector

| | before | after |
|---|---|---|
| Source scan, surface files | 0 primary, 8 advisory | **0 primary, 0 advisory** |
| Rendered `/` at 1440×900 | 50 | **6** |
| Rendered `/` at 390×844 | 21 | **5** |

The remaining rendered findings were each checked in the page: `cream-palette`
(the decided paper), `nested-cards` ×4 (plan-card and banner buttons read as
cards) and one `line-length` estimate (~86; the longest measured line is 79
characters, inside the 68ch measure).

### Reviews run (Impeccable and Vercel)

- **Critique**, dual-agent: 22/32 (heuristics 7 and 10 n/a). Three P1s: the
  1095 fold (fixed), the phone hero and the memo raster (both below, yours).
- **Technical audit**: 15/20, Good. axe 0 violations at 1440 and 390 in six
  states; 329 text nodes, 0 contrast failures; all targets ≥ 44 px; no
  overflow from 320 to 1440. Both P1s fixed and re-measured: focus hidden
  under the sticky and fixed bars (16 of 75 stops before, 0 after) and the
  1.14:1 menu highlight (now an inset 3:1 ring).
- **Vercel web interface guidelines**: the top five fixed except the header
  skeleton (below). Title Case and dark theming were overridden by
  DESIGN.md's decisions.
- **Humanizer**: applied to copy written in this pass only. Copy-pass lines it
  would flag are listed below, unchanged.
- **Finish review** (fresh stand-in agents: the shipped reviewer and
  documenter agent types are not available in this harness), two rounds, the
  unattended budget. Round 2 left only the items below for you.

## Guardrails

| | |
|---|---|
| Primary CTA "Analyze a deal free" | hero, walkthrough, Free plan, close, sticky bar |
| Investor cue in the first screen | 375, 390, 768, 1095, 1280 and 1440, with the consent banner open too; at 1024×768 the banner's second line covers the cue's link line until dismissed |
| "For investors" in the header | yes |
| URL, title tag, H1, topical nouns | unchanged (`public-metadata-contract` passes) |
| One Disclaimer, text unchanged | 1 per page |
| Founder unnamed and unpictured | yes |
| No fabricated proof; proof blocks render nothing | yes |
| No email capture | none added |
| Prices from the catalog | Stripe display price, catalog fallback, as `/for-agents` |
| Type an address, get a verdict | e2e passes (typed address, sample, empty submit) |
| Always light | yes |
| WCAG 2.1 AA, 44 px, 3 px focus, reduced motion | axe 0; focus floor; the one motion is off under reduced motion |
| Calculation, pricing, entitlement, auth, analyzer logic | untouched (diff from `de81b02` is empty on those paths) |

## App key screens at the new tokens (`app/`)

The tokens are global, so the app changed with them. `app/after/` holds the
local build and `app/before-live/` the live site (the baseline captured no app
screens). The dashboard is rendered from its real components with sample-deal
data on a local-only preview route, since no local database exists; its
Offer Ceiling column is empty because the preview does not compute it.

- **Analyzer input**: paper page, white fields (a utility-layer rule turns
  fields that ask for the page background white), 4 px controls, 3 px focus.
  Still unconverted: the Title Case heading, the uppercase "Live screening
  preview" label, arrow icons, the glowing sample button.
- **Verdict Ledger results**: paper, Archivo, the quieter blue wash on the
  Offer Ceiling card. Still unconverted: uppercase labels, cards rather than
  the ledger primitives.
- **Dashboard**: the navy rail kept, paper content, white search field.
  Still unconverted: uppercase table heads and labels, "→" links, tinted
  decision cards.

## TODO(verify)

- A real signed-in pass over the dashboard, deal workspace, compare,
  templates, clients, triage, settings and auth screens (the preview route
  covers only the dashboard home).
- Safari: the `<details>` markers (hidden with `::-webkit-details-marker`)
  and `h-[1lh]` on the disclosure marks.
- `/` now revalidates every 10 minutes instead of hourly, because the plan
  cards read the Stripe display price (its cache TTL is 600 s). Confirm that
  is acceptable, or set the cards to catalog prices to keep hourly.
- The live Stripe display prices on the plan cards (local builds fall back to
  the catalog).

## Decisions (founder, 2026-09-30: "Do what you think is best for the business and website")

Approved; the rollout starts. Decided on that authority:

1. **Phone hero: b.** Below 640px the hero states the ledger's verdict in one
   sentence before the form ("Sample deal. Meets the Buy Box: no at $265,000
   asking, yes at the $236,000 Offer Ceiling."), set from the same engine
   output, and it takes the metrics strip's place there (the strip stays in the
   page and shows from 640px). The phone hero's top padding and form spacing
   tightened by 12px, so the investor cue clears the cookie banner at 375×812
   (726 vs 732 px) and 390×844 (704 vs 764 px).
2. **Memo image: a.** Kept until `public/product` is regenerated in rollout
   step 4, which lands before the rollout's PR merges, so the old capture
   never reaches production.
3. **Header: b.** The shared header takes `anonymousByDefault`; only the
   static homepage passes it (it is anonymous by construction), so its server
   HTML carries Analyze, the menu, Sign in and Create account instead of the
   pulsing placeholder. Other pages are unchanged.
4. **History: a.** Left as is: a force-push of a public branch buys little
   when every commit already carries the author's name.

The two performance items became separate task chips (Sentry idle bundle,
footer prefetch).

## Held for you (as presented at checkpoint 3)

1. **The phone hero.** As approved, the ledger starts just under the fold on
   phones, so a first phone visit shows the claim and the form but no figure,
   and the double rule draws off-screen. With the consent banner up at
   390×844, the ledger caption sits on the banner's top edge. Options: keep
   the approved order; or add a one-line verdict ("Asking $265,000 · No /
   Offer Ceiling $236,000 · Yes") between the subhead and the form on phones.
2. **The memo image.** "What your client receives" shows the 2026-09-06
   capture in the previous app style, including small internal wording.
   Options: keep it until `public/product` is regenerated at the end of the
   rollout; hide the image until then; or regenerate the memo shot now.
3. **The header before hydration.** The static homepage renders a pulsing
   placeholder where Sign in and Create account (desktop) or Analyze and the
   menu (phone) belong, for up to about 1.8 s on a slow phone and with no
   fallback without JS. Fixing it means rendering signed-out chrome by default
   in the shared header, which touches auth-state rendering the brief put out
   of scope, and signed-in visitors on other static pages would see a brief
   Sign in flash.
4. **Two wordmarks in the brand.** The logo image reads "Truecap." while every
   line of copy says "TrueCap". The page now uses the image in both header and
   footer; the asset itself is yours to change.
5. **Performance outside the design pass**, found by the audit: 178 KB gz of
   Sentry loads on idle (including Replay code the config disables), and a
   phone scrolling the page prefetches 622 KB of routes from footer links.
6. **Copy-pass lines the humanizer flags**, left as written per the brief:
   "Fast starting point. Transparent assumptions. Final control stays with
   you…" (fragments and a closer), "Visible sources. Editable assumptions."
   (fragments), "From listing to offer in three steps." over a five-row
   ledger, and the em dash in the property-tax default sentence
   (`lib/product-facts.ts`).
7. **Repository history.** The baseline commit `745c1ae` on this public
   branch contained absolute file paths with your home folder name
   (scrubbed forward in `5b18ab5`). Every public commit also carries your
   full name as author. Rewriting this branch before any PR opens would
   remove the first; the second is a git identity setting.

## Files

- `local/screens/`: `home-{width}-first.webp` (first visit, banner showing)
  and `home-{width}-full.webp` (consent answered, reduced motion) at 375, 768,
  1095 and 1440; `facts.json` (title, H1, overflow, arrow links, small
  uppercase text, fonts, disclaimers).
- `local/vitals-home.json`, `local/slop-*.json`,
  `local/impeccable-detect-*.json`: raw tool output.
- `summary.json`: every number above.
- `app/after/`, `app/before-live/`: app key screens.
- Lighthouse HTML and JSON reports stay local (git-ignored).
