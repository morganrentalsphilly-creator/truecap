# Design pass baseline (2026-09-30, before any design edit)

Recorded before the design pass touched a token or a component. The design pass starts from the copy pass (`marketing/agent-first-gated` at `cbf35b0`, PRs #147 + #148), which is not deployed yet, so the baseline has two sources:

- **local**: the copy-pass branch as a production build (`next build --webpack`, then `next start` on `127.0.0.1:3140`) with the loopback overrides from `scripts/dev-isolated.sh` (fake Supabase, paid providers blanked, Sentry off). This is the "before" that checkpoint 3 compares against.
- **live**: usetruecap.com as deployed (main `a37125c`, old homepage copy). Reference only.

One local deviation from production: Agent Pro has no Stripe Price in the local `.env`, so the build ran with a render-only `STRIPE_PRICE_AGENT_PRO_*` id. `isAgentProConfigured()` only checks presence, so the nav, `/for-agents` and the Agent Pro cards render as production does; the Agent Pro price itself fails closed to the catalog fallback, as it would during a Stripe outage.

## Numbers

### Lighthouse 12.8.2 (mobile preset unless marked)

| Page | Perf | A11y | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| live `/` | 0.83 | 1.00 | 1.00 | 1.00 | 4.2 s | 0.003 | 160 ms |
| live `/` desktop | 1.00 | 1.00 | 1.00 | 1.00 | 0.6 s | 0.014 | 0 ms |
| local `/` | 0.88 | 1.00 | 0.96 | 1.00 | 3.9 s | 0.003 | 38 ms |
| local `/` desktop | 0.99 | 1.00 | 0.96 | 1.00 | 0.8 s | 0.002 | 0 ms |
| local `/for-agents` | 0.91 | **0.97** | 0.96 | 1.00 | 3.5 s | 0.003 | 38 ms |
| local `/pricing` | 0.80 | 1.00 | 0.96 | 1.00 | 3.6 s | 0.003 | 37 ms |
| local `/for-buy-and-hold` | 0.91 | 1.00 | 0.96 | 1.00 | 3.5 s | 0.003 | 13 ms |
| local `/sample-decision-memo` | 0.90 | 1.00 | 0.96 | 1.00 | 3.6 s | 0.003 | 38 ms |

- Local best practices is 0.96 on every page for one reason that only exists locally: `/_vercel/insights/script.js` 404s outside Vercel. Not a site defect.
- **`/for-agents` accessibility 0.97 is a real defect introduced by the copy pass (PR #147).** Three 10px bold uppercase labels at `opacity-80` on Signal Blue ("Billed annually", "Month to month", "To start") measure 4.2:1 against a 4.5:1 minimum. The Lighthouse CI gate only audits `/` and `/analyze`, so CI will not catch it. The design pass removes these labels, but if #147 merges first the regression ships.

### Lab Core Web Vitals with interactions (`vitals-home.json`)

Playwright Chromium with the web-vitals attribution build, three runs per profile. The interactions: typing an address, opening the phone menu, opening an FAQ answer. The mobile profile throttles CPU 4x and does not throttle the network, so these LCP values are much lower than Lighthouse's simulated slow-4G LCP.

| | INP desktop | INP mobile | LCP desktop | LCP mobile | CLS desktop | CLS mobile |
|---|---|---|---|---|---|---|
| local `/` | 48–56 ms | 72–88 ms | 60–96 ms | 136–280 ms | 0.0019 | 0 |
| live `/` | 40–56 ms | 72–80 ms | 312–392 ms | 484–528 ms | 0.0106 | 0 |

### External slop scores on the homepage

| Tool | live | local (copy pass) |
|---|---|---|
| slop-detect 0.5.2, design axis | 25/100, Mild, grade C: `slop_fonts` (Plus Jakarta on 98% of text), `colored_glows`, `centered_hero`, `all_caps_labels`, `faq_accordion`, `nested_cards` | 25/100, same six |
| slop-detect 0.5.2, copy axis | 0, Clean | 4, Clean: `rule_of_three` |
| design-slop-cop (was ai-design-checker) | 7/100, Clean: `faq_accordion` | 7/100, same |

Neither tool models the second-generation tells named in the brief (eyebrows, arrow suffixes, identical radius grids), which is why their scores sit near clean. The before/after at checkpoint 3 reports both anyway.

### Impeccable detector (engine 0.1.5, against the old DESIGN.md)

- **Source scan** of the marketing components and the five pages: 0 primary findings, 8 advisories (`design-system-font-size`). This is the "clean detector" the brief describes.
- **Rendered scan** of local `/` at 1440×900: 50 primary findings: 28 `line-length`, 7 `undersized-ui-text`, 5 `nested-cards`, 3 `cramped-padding`, 2 `kicker-above-heading`, 2 `low-contrast`, 1 `ai-color-palette` (the cyan hero gradient), 1 `tiny-text`, 1 `overused-font` (Plus Jakarta Sans). At 390×844: 21 primary.

The source scan is clean because most of the tells live in computed layout, not in class strings.

## Humanizer pass on the homepage copy (findings only; no copy changed)

Source: `local/home-copy.txt` (the `<main>` text of the copy-pass homepage, FAQ answers expanded). Strongest first:

1. **Not X but Y (§1).** The H2 "The calculator isn't the hard part. The offer is." is a staged contrast. The structure proposal replaces this section, so the line goes with it. "Co-branded, not white-label" and "screened against their targets, not yours" are kept: both halves carry information.
2. **Fragment rows and closers (§2).** "Fast starting point. Transparent assumptions. Final control stays with you. This is what you show a client who asks where a number came from." is three fragments plus a closer that explains the section. "Visible sources. Editable assumptions." as an H2 is the same shape. "Free. No account. Your first full decision is included." is functional microcopy and can stay.
3. **Forced triads (§6).** Three questions, then "three steps", then "The defaults lean conservative, every assumption is editable, and every formula is published." The sequence is structural, not accidental. The walkthrough proposal removes the numbered-three frame. slop-detect's `rule_of_three` hits ("email, phone, and website" and similar) are real lists and stay.
4. **Dashes (§8).** Two em dashes are rendered: "…when available—a starting benchmark…" (Rent source row) and "1.1% of purchase price — replace it…" (`lib/product-facts.ts`). Ranges like "0–100" are correct usage.
5. **Formatting by rule (§19).** Uppercase labels: ANALYZE / SCREEN / CEILING, PRO, AGENT PRO, RENT / MORTGAGE RATE / PROPERTY TAX, FOR AGENTS / FOR INVESTORS, FIRST DECISION / PAID PLAN. The chrome rules remove all of them.
6. **Repetition.** The Offer Ceiling is defined in the hero and again inside three FAQ answers, and trial terms appear in four places. The FAQ trim in the structure proposal removes most of this.

## Other defects noticed while measuring (not fixed here)

- `/for-agents` renders two disclaimers (the page's card-tone `<Disclaimer />` at `app/for-agents/page.tsx` plus the footer's), against the one-per-page rule.
- `e2e/public-product.spec.ts` still expects the old H1 "Know your walk-away price before you make the offer." (copy-pass follow-up).
- Full-page screenshots of the copy-pass homepage came out with blank sections until they were retaken with reduced motion: the scroll-driven `tc-reveal` sections never reach their visible state in a one-frame full-page capture. They do reveal for a person scrolling.

## Files

- `local/screens/`, `live/screens/`: `{page}-{width}-first.webp` (first screen, first visit, cookie banner showing) and `{page}-{width}-full.webp` (full page, consent answered, reduced motion; local only). Widths 375, 768, 1095 (the founder's laptop window) and 1440, DPR 1. `facts.json` holds each page's title, H1, overflow, count of arrow-suffixed links and small uppercase text.
- `summary.json`: every number above in one file.
- `local/vitals-home.json`, `live/vitals-home.json`: per-run INP/LCP/CLS.
- `live/slop-*.json`, `local/slop-*.json`, `impeccable-detect-source.json`, `local/impeccable-detect-home-*.json`: raw tool output.
- `local/home-copy.txt`, `local/pricing-copy.txt`: the rendered copy the humanizer pass read.
- Lighthouse HTML/JSON reports are kept on disk next to these files but are git-ignored (about 1 MB each); `summary.json` carries their numbers.
- Harness: `../tools/capture.mjs` (screenshots), `../tools/vitals.mjs` (INP/LCP/CLS), `../tools/pagetext.mjs` (rendered copy), `../tools/oklch.mjs` (palette contrast).
