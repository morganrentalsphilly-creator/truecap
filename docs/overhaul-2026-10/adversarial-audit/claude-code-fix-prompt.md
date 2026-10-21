# Claude Code prompt: the trust and timing pass on usetruecap.com

Paste everything below the line into Claude Code, opened at the root of the truecap repo.

---

You are fixing what an adversarial audit of the live site found on 2026-10-21. The evidence (screenshots, JSON measurements, the scripts that took them) is in `docs/overhaul-2026-10/adversarial-audit/`. Read `audit.md` there first, then `benchmarks.md` for the patterns (P1…P20) this prompt borrows. Each fix below names its finding (A1…A26).

## Questions for the founder

Ask these in one message before you start. Change nothing a question covers until it is answered.

1. **The signed-in home.** The audit could not sign in. The code (`DashboardHome.tsx`) opens on a "Portfolio overview" of stat cards labelled in Title Case. Should it open on the deal list instead, with the gap to asking as a signed column (P9)?
2. **Pricing presentation** (A13, `CLAUDE.md` §8). On `/pricing`, Pro shows as $29.99 in the stage list and $25 in the cards, which default to annual. Which do you want: the stage list follows the toggle, the stage list drops its prices, or the toggle moves above both into the first screen? Should the toggle name the saving from the catalog (P10)? Should Agent Pro annual read "$49.17/mo" or "$590/yr"?
3. **The phone hero** (A8, pinned copy). On phones, may the price track and the Offer Ceiling sit directly under the address form, with the helper lines below the sheet? The H1, the investor cue and the CTA stay. May "See the sample deal" become a secondary button beside "Analyze a deal free" (P3)?
4. **When no target binds** (A7). A cash purchase with only break-even cash flow shows an Offer Ceiling of $1,296,500 on a $250,000 asking price. Should the card say "No price limit under these targets; add a cap-rate or cash-on-cash target" when the ceiling passes some multiple of asking? If so, which multiple?
5. **The sample's rate.** Fix 1 dates the sample's 6.6% (25 Aug 2026). Should the fixture move to a current FRED observation instead? That would change every sample figure and its regression snapshot.
6. **Sentry's cost** (A20, near `CLAUDE.md` §8 item 7). The Sentry chunk costs about 400 ms of script time on a throttled phone. May the browser SDK initialise after the first input, with sample rates and `ignoreErrors` unchanged?

## Context

TrueCap is a rental-property analyzer. The primary user is a real estate agent with investor clients, on a phone at a showing; the secondary user is a buy-and-hold investor arriving on a phone from an ad. They paste a listing, or an address with the asking price and a bedroom count, and get a verdict:
- whether the deal meets a Buy Box;
- the Offer Ceiling (the highest price that still meets it);
- cash flow, DSCR, cap rate, cash-on-cash and a Deal score;
- a memo the client opens without an account.

Free runs the analysis. Pro ($29.99/mo or $300/yr) and Agent Pro add saved deals, co-branding, compare, PDF and the client roster. The stack is Next.js 16.3 (webpack), React 19.2, Tailwind v4, Radix, Motion for React and NumberFlow. These APIs differ from your training data: read `node_modules/next/dist/docs/` before anything Next-specific.

Since 2026-10-20 the site runs on a design system called Blueprint: a drafting sheet with a faint cobalt grid, graphite ink, one cobalt for actions, one warm highlight stroke under the Offer Ceiling, Hanken Grotesk with tabular figures, and Geist Mono for metadata. A polish pass followed. The hero is a live instrument (drag the price and every figure rolls), and the result has a what-if price track.

Read, in order: `DESIGN.md`, `PRODUCT.md`, `CLAUDE.md` §1, §8 and §9, `OVERHAUL.md`, `docs/overhaul-2026-10/polish/README.md`, `docs/overhaul-2026-10/phase-8/README.md` and `docs/overhaul-2026-10/test-reanchor-list.md`.

The audit checked the open items the polish pass left:
- The story still crossfades (A16).
- The sample shows an empty form for 2 to 5.5 s on live, not 350 ms (A2).
- Blocking time on one test host was 574 and 567 ms locally and 931 and 804 ms live. The Mac's 152 and 181 ms aren't comparable.
- Safari is still unexercised.
- "$49.17/mo" is live.
- Ten text blocks precede the instrument at 390 (A8).
- New: the live font swap fails the CLS gate (A4).

## Guardrails

- **Never touch** `lib/calc-analysis.ts`, `lib/verdict.ts`, `lib/deal-score.ts`, `lib/max-allowable-offer.ts`, entitlements, prices and the plan catalog, Stripe and the webhook, auth, Supabase, `lib/share-link.ts`'s payload, server-action return shapes, analytics event names, or `proxy.ts`. Stop and ask before anything in `CLAUDE.md` §8.
- **Keep every `data-*` attribute and id** the tests or analytics use; grep before removing one. These include `data-hero-ledger`, `data-price-scrubber`, `data-hero-sample-link`, `data-inform-submit`, `data-decision-metric`, `data-reveal-step`, `data-result-reveal`, `data-cadence` and `#decision-summary-title`.
- **Pinned copy stays:**
  - the H1 "Stop forwarding listings. Start sending deals that already pencil.";
  - the CTA "Analyze a deal free";
  - the title-tag core "Rental Property Calculator & Max Offer | TrueCap";
  - the nav;
  - the investor cue above the hero form;
  - "Send it co-branded with Pro.";
  - "from an address, the asking price and a bedroom count".
- **Trust rules:** exactly one `<Disclaimer />` per marketing page; no new email capture; the founder is never named; no fabricated proof, counts, logos or speed claims. Every marketing figure comes from the engine (`calculateSampleDealOutcome()`) or the catalog.
- **Tokens over raw values:** no hex, raw `rgba`, or arbitrary shadow or duration values. Radius by role: 4, 8, 12, 16. No eyebrows, no "→" in links, no trailing arrow icons. Sentence case.
- **Motion:** Motion for React only through `components/motion/*`, and never a static `"motion/react"` import elsewhere (one once put the whole runtime in every route). NumberFlow (`AnimatedNumber`) for every changing figure. Animate only transform and opacity. The resting state is the complete page, and reduced motion always wins. No GSAP, Lenis, Three.js, Lottie, particles, cursor followers or autoplay video.
- **Homepages:** `app/page.tsx` stays static, and what it renders must also work in `app/home-authed/page.tsx`.
- **Build-chain guard:** no new dependency and no edits to the guarded build files (`CLAUDE.md` §7).

## The fixes, in order

Items 1 to 6 are the pass; the rest follow if they fit. Each item lists its change, the pattern it borrows, and a check a script can run.

**1. A1 (P0): one provenance for the sample.** Add a display-only provenance map (source, basis, as-of `SAMPLE_DEAL_ANALYSIS_DATE`) beside `SAMPLE_DEAL_FIXTURE`. Render it everywhere the sample appears:
- the hero chips and popovers (`components/home/hero-sheet.tsx`, `price-scrubber.tsx`);
- the receipts (`receipt-flow.tsx`);
- the memo;
- the analyzer's tags when it runs the sample (`lib/input-confidence.ts`, `input-confidence-card.tsx`).

Real deals keep their labels. The rate chip reads "Rate 6.6% · FRED, 25 Aug 2026", and its popover says this is the sample's rate, not today's.
- *Borrows:* P18, freshness on the figure.
- *Check:* `/`, `/analyze?sample=1` and `/sample-decision-memo` show the same source and date for rent and rate, and nothing on the sample result reads "Your entered rent" or "Your rate estimate".

**2. A2 (P1): the sample's answer arrives with the HTML.**
- In `app/analyze/page.tsx`, prerender a static decision card from `calculateSampleDealOutcome()` with the parts `focused-decision-summary.tsx` uses, minus the what-if. Keep it hidden by default.
- A tiny head script sets `data-sample` on `<html>` when the query has `sample=1`; CSS then shows the card and hides the form before first paint. The CSP is report-only with `'unsafe-inline'`; note the script for the future nonce policy.
- When the analyzer's own sample result mounts, swap it in the same box with the same figures. Only the live card carries `#decision-summary-title`, and the reveal never replays a result that is already on screen.
- *Borrows:* P14, P4.
- *Check:* `tools/sample-flash.mjs iphone slow4g` finds no frame with the form and no card, and CLS ≤ 0.05 on `/analyze?sample=1`.

**3. A3 (P1): the glide only when seen, never after a touch.** In `components/home/price-scrubber.tsx`:
- Observe the 44 px track at 0.6, not the scrubber root.
- Skip the glide if hydration lands more than 1,000 ms after first contentful paint.
- Skip it if a `pointerdown` already reached the server-rendered diamond; an inline handler sets an attribute the island reads.
- Never jump the handle to asking. Instead, draw the meets-range fill from the asking marker to the ceiling (`scaleX`, `--duration-draw`, `--ease-out`).
- *Borrows:* P1.
- *Check:* `tools/glide-check.mjs` shows it playing on load at 1095×760 and 1280×720, with no `aria-valuenow` above the ceiling before a drag. `tools/early-drag.mjs` shows no movement. `qa-reduced-motion` still rests at 236,000.

**4. A4 (P1): fallback faces that exist on Android and Linux.** `next/font` emits only `src: local("Arial")`. In `app/globals.css`, add fallback faces for Roboto and Liberation Sans, with `ascent-override`, `descent-override`, `line-gap-override` and `size-adjust` computed against Hanken Grotesk (and Geist Mono) by a script you commit. List them in the three family declarations.
- *Borrows:* P19.
- *Check:* Lighthouse with `lhci-running-server.json` on Linux without Arial reports CLS ≤ 0.05 on all three routes.

**5. A5 (P1): explain a change where the number moves.** In `investcalc-page.tsx`, when the lookup changes an input the preview already uses, add a line under the preview's cash-flow figure: "Rate updated to FRED 7.40% (Oct 15) from the 6.75% default · Undo". The figure rolls, and the line stays until dismissed. Fills of empty fields keep the toast.
- *Borrows:* P2.
- *Check:* a Playwright spec under `AUDIT_ENRICHMENT_MOCK=1` finds the line, and Undo restores 6.75.

**6. A6 (P1): a typed 0 is an answer.** In the adoption path (`mayAdoptStartingBenchmark`, the rent fill), decide "empty" from dirty state, not from the value. Write the unit test first.
- *Check:* `tools/zero-rent.mjs` keeps "0" after 3 s and after Run.

**7. A7 (P1, after Q4).** Render the agreed state in `focused-decision-summary.tsx` and on the what-if track. When no target binds, show no key figure on the stroke; the engine's number is untouched.
- *Check:* `tools/break-analyzer.mjs desktop cash-purchase` shows no seven-digit ceiling.

**8. A9, A11 (P2): the analyzer on the system.**
- The sample's address field and titles show `shortAddress` (display only; grep the truth pins first).
- Remove the sparkle icon from `property-details-section.tsx`.
- "Try a sample rental" becomes a secondary control at 8 px with no float shadow.
- Assumption rows use the text face with `font-figure`; Geist Mono only for the source tag.
- The analysis type becomes a row.
- *Check:* nothing visible on the sample contains "Synthetic", no `Sparkles` import remains in `components/investcalc/`, and the detector finds nothing new on `/analyze`.

**9. A12 (P2): a decision card that says each thing once.** In `focused-decision-summary.tsx`:
- The dimension labels carry ceiling, gap and asking; the repeating sentence goes.
- "Best next step", "Verify next" and "Fastest paths" become one block on the 2 px cobalt rule.
- Beside a miss, the Deal score reads "Base economics at asking, 0–100".
- "Mark verified" becomes a quiet row action.
- *Borrows:* P9.
- *Check:* the card is at least 15% shorter at 390, post-run focus still lands on `#decision-summary-title`, and the 390×844 fold test passes.

**10. A10, A15 (P2): fields that don't pretend.** Placeholders become "e.g." hints in graphite-2, without the Austin address. The preview names the targets the run will use; change the phrasing in `lib/limiting-factor.ts` only, since thresholds stay in `lib/verdict.ts`.
- *Check:* no placeholder is a bare number.

**11. A16 (P2): one sheet that accumulates.** From 1024 px, replace the crossfading frames (`story-observer.tsx`) with one pinned sheet. Rows enter per step: the inputs with their sources, then the Buy Box rows with the binding one marked, then the Offer Ceiling and the send card. Each row is a CSS scroll-driven reveal inside `@supports (animation-timeline: view())` and `no-preference`, using opacity and `translate` at `--duration-base`. Every row is visible by default. Below 1024 px, keep one frame per step.
- *Borrows:* P5 and P15, driven by scroll rather than autoplay.
- *Check:* `qa-no-js` finds all rows in one sheet with nothing at opacity 0, and the section is at least 25% shorter at 1440.

**12. A14 (P2): the sticky bar docks.** From 1024 px, `sticky-conversion-bar.tsx` becomes a full-width bottom bar with `shadow-float-up`. It hides while the hero, the plans or the close is in view.
- *Check:* `tools/home-full.mjs` finds no frame with the bar over a plan card.

**13. A17 to A19 (P2): the edges.**
- Put the cookie banner after the skip link.
- Add a `<noscript>` line on `/analyze` pointing to `/sample-decision-memo`.
- Server-render the phone header's Analyze link.
- After a run, "Next deal" and a fresh `/analyze` start blank, and the intro stops promising a free first decision once it is used.
- *Check:* `tools/keyboard.mjs` has the skip link at stop 0.

**14. If time remains:** A22, A24, A25, A26.

## How to work

1. Load the Impeccable skill, run `.claude/skills/impeccable/scripts/impeccable context`, read `DESIGN.md`, and read `.claude/skills/impeccable/reference/craft-floor.md` before any edit.
2. Branch `design/trust-pass-2026-10` from `main`. Open one PR, with one commit per surface.
   - Each visual pin you move gets a `Re-anchored: <file> — <reason>` line; `test-reanchor-list.md` says which pins are visual.
   - Truth pins never move. No skipped tests, no `.only`.
3. Before the PR, run and record:
   - `npx tsc --noEmit`, `npm run lint` and `npm test`.
   - `npm run build` with the variables `scripts/dev-isolated.sh` exports, then `bash scripts/dev-isolated.sh start`.
   - The public Playwright project with `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100`, and the autofill spec behind `AUDIT_ENRICHMENT_MOCK=1`.
   - The QA scripts in `docs/overhaul-2026-10/tools/`, and the audit's `tools/` with `BASE=http://127.0.0.1:3100`.
   - The detector on the changed files (no primary findings), and on the rendered `/`, `/analyze`, `/analyze?sample=1` and `/pricing` at 1440x900 and 390x844 (no count above 17/17, 4/2, 26/13, 1/1).
   - Lighthouse via `lhci-running-server.json`. Accessibility ≥ 0.95 and CLS ≤ 0.05 fail the build. Script within a few KB of 430, 631 and 445 KB, and TBT under 200 ms.
   - `npm run perf:homepage` with no budget failure.
   - Captures at 375, 768, 1095 and 1440.
4. Write `docs/overhaul-2026-10/trust-pass/README.md` in the polish report's style: changes per finding, what was left and why, a before/after gallery, and the numbers against the polish pass.

## The pull request

Open it against `main` for the founder to merge after its checks pass. Don't merge it yourself unless the founder says so. Every commit message ends with:

```
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

The PR description ends with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
