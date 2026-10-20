# TrueCap UI overhaul — brief for Claude Code

> **How to run this.** Save this file at the repo root as `OVERHAUL.md`. Open Claude Code in the repo, switch to plan mode, and send:
>
> *"Read OVERHAUL.md and run it. Start with Phase 0, and stop at every ⛔ checkpoint for my approval."*

---

## 0. The decision — read this before CLAUDE.md §9 and DESIGN.md

**Founder decision, 2026-10-20:** the current look, "The Underwriter's Ledger" in `DESIGN.md` (Newsprint paper, Archivo condensed + DM Mono, rules instead of cards, no shadows, no dark surfaces, one motion per page), is retired. It is correct but it reads as a beige spreadsheet: flat, text-heavy, static, and nothing on it responds to the visitor. Replace it with a modern, premium, engaging fintech interface that still answers the question at a glance.

This brief **supersedes the aesthetic decisions** in `DESIGN.md`, `.impeccable/design.json`, and the design rules in `CLAUDE.md` §9 (no motion, no cards, no shadows, no dark surfaces, "one motion moment", the avoid list, the Impeccable-only rule where it conflicts below). Rewriting those files is part of this job, so future sessions follow the new system instead of dragging the site back to the old one.

It does **not** supersede product truth, trust, SEO, accessibility, performance, security or engineering rules. Those are in §2 and do not move.

This is a **redesign, not a refinement**: treat the current look as evidence of what is wrong, not as something to polish. Keep the product truth, the facts in the copy, every function and every flow.

---

## 1. What "awesome, engaging and still functional" means here

Engagement comes from **the product doing something in front of the visitor**, never from decoration and never from fake proof. TrueCap has no testimonials, logos or usage counters it can show, and must not invent any. The test for every effect: *does it make a number, a source or a decision easier to understand or more satisfying to explore?* If not, cut it.

Target feel: Wise's "the product is the hero", Stripe and Mercury's polish and depth, Linear's crisp interactions. Calm and trustworthy (this is money), but alive: things respond to the cursor and the thumb, numbers move when they change, sections have depth and rhythm, and the brand has real color.

**Success criteria**

- A first-time visitor understands what TrueCap does from the first screen without reading a paragraph.
- A visitor can touch something meaningful on the homepage (drag, toggle, tap a figure) before the second section.
- Homepage word count drops by roughly 40% with no fact lost: detail moves into disclosures, popovers and the pages that already hold it.
- The analyzer result feels like a reveal, not a form submission.
- Marketing site, analyzer and dashboard read as one product (fixes the light/navy "two products" whiplash in `TRUECAP_UX_AUDIT.md`).
- Lighthouse, axe and every non-visual test stay green.

---

## 2. Guardrails that do not move

Read `CLAUDE.md`, `PRODUCT.md` and `docs/voice.md` in full before starting. Their product and engineering rules still apply. The ones that matter most here:

### Never touch (UI work only reads from these)

`lib/calc-analysis.ts`, `lib/verdict.ts`, `lib/deal-score.ts`, `lib/max-allowable-offer.ts`, entitlements (`lib/entitlements*.ts`), prices and the plan catalog, Stripe code and the webhook, auth, Supabase clients and migrations, the `lib/share-link.ts` payload, server-action return shapes, analytics event names and properties, `proxy.ts`. Keep every `data-*` attribute, id and test hook that tests or analytics use (grep before removing one). If a UI idea needs any of this to change, stop and propose it.

### Truth and trust

- Every figure on a marketing page comes from the engine (`calculateSampleDealOutcome()`, `lib/sample-deal.ts`) or the catalog. Never type a number by hand.
- No fabricated proof: no testimonials, customer logos, "trusted by", star ratings, user counts, deals-analyzed tickers, press strips. The proof components stay mounted and keep rendering nothing until real, consented proof exists.
- No speed claims ("in 60 seconds"), and no claim that a competitor cannot do something.
- The founder is never named or pictured.
- Exactly one `<Disclaimer />` per marketing page, text unchanged.
- No new email capture, newsletter or lead-magnet surfaces.
- Prices render from the catalog, never hard-coded.

### Pinned copy

Copy may get shorter and change tone; these strings and facts may not change:

- Homepage H1: "Stop forwarding listings. Start sending deals that already pencil."
- Primary CTA on `/` and `/for-agents`: "Analyze a deal free".
- Investor cue "Buying for your own portfolio? Same analyzer, your own Buy Box." stays in the hero's first screen at 390px and above the address form.
- The hero subhead ends "Send it co-branded with Pro."
- Title tag core phrase: "Rental Property Calculator & Max Offer | TrueCap".
- Topical nouns: rental listing, Buy Box, Offer Ceiling, cash flow, cap rate, CoC, DSCR.
- Header nav: Analyze · For agents · For investors · Pricing · Learn. Nothing added.
- `/for-agents` and `/for-investors` open with the homepage's one-field address form.
- The settled phrase is "from an address, the asking price and a bedroom count", never "from an address" alone.

Follow `docs/voice.md` for every word you write. Grep the guard tests for a string before changing it.

### Architecture

- `app/page.tsx` stays static/ISR: no `cookies()` or `headers()`. Sections stay server components; interactivity lives in small `"use client"` islands. Any new `InvestCalcPage` prop goes to both homepages (`app/page.tsx` and `app/home-authed/page.tsx`).
- This repo runs Next 16.3 and React 19.2, whose APIs differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before using anything Next-specific, view transitions especially.
- Tokens over raw values: color, type, radius, elevation, and motion durations and easings live in `app/globals.css` (`@theme`) and one motion module. No hex, no arbitrary `shadow-[…]` or color values in components. Fixes land in a token or a shared component, never a page-local override.

### Performance budgets

From `lighthouserc.json` (mobile, 390×844, simulated throttling). Measure before Phase 2 and after every phase.

| Route | Budget |
|---|---|
| `/` | Accessibility ≥ 0.95 and CLS ≤ 0.05 (both fail the build); LCP ≤ 2.5s; TBT ≤ 200ms; script ≤ 256KB; total ≤ 900KB |
| `/analyze`, `/pricing` | Accessibility ≥ 0.95; CLS ≤ 0.05 |

Also run `npm run perf:homepage`. The LCP element (the H1) is never hidden by an entrance animation; nothing above the fold starts at opacity 0. Animate transform and opacity only, and never cause layout shift.

### Accessibility (WCAG 2.1 AA)

Contrast ≥ 4.5:1 for text and 3:1 for UI on every surface, including text on the brand color and on dark bands. 44×44px targets. A visible focus ring on every control. Every interactive demo works by keyboard alone. `prefers-reduced-motion` is respected everywhere: `MotionConfig reducedMotion="user"`, CSS media queries, number animations off, auto-plays replaced by the end state. Interactive figures announce changes politely and only when a drag ends, not on every tick. Pinch zoom stays.

### Build-chain guard

`package.json` and `package-lock.json` are hash-pinned in `scripts/build-integrity-manifest.json`. Add dependencies in their own commit, read the diff line by line, run `node scripts/verify-build-integrity.mjs --update`, and commit the manifest bump on its own with a message naming each dependency and why. Do not edit `next.config.mjs`, `postcss.config.mjs` or `eslint.config.mjs` unless a phase truly needs it; if you do, follow the same procedure.

### Tests

About 40 test files pin marketing markup (`lib/__tests__/*design-pass*`, `shared-chrome-design-guards`, `shared-visual-guards`, `homepage-ledger`, `vs-design-pass`, `for-agents-design-pass`, `auth-design-pass`, `embed-design-pass`, `mobile-layout-guards`, `e2e/site-overhaul-conversion.spec.ts` and others).

- You **may** re-anchor assertions about class names, markup structure and visual rules to the new design system, in the same commit as the change, with a `Re-anchored: <file> — <reason>` line in the commit message.
- You **may not** delete or weaken assertions about facts, copy truth, prices, links, structured data, metadata, accessibility, analytics, privacy or security.
- A test that only enforced the retired aesthetic (bans on shadows, motion, cards) gets rewritten to enforce the new `DESIGN.md`, not deleted.
- Never skip or `.only` a test to get green.

---

## 3. Research — study these first (Phase 0)

Capture each with Playwright at 1440 and 390 into `docs/overhaul-2026-10/references/`, and write one line each in the brief: what to take, what to leave.

| Site | What to take |
|---|---|
| wise.com | The product is the hero: a live calculator that answers immediately with exact numbers. TrueCap's hero should be an interactive deal, not a paragraph. |
| stripe.com | Product UI rendered in code with layered depth; gradient used sparingly; obsessive micro-interaction detail; a long page that stays scannable. |
| mercury.com | Realistic product previews with believable numbers; a premium light and dark pairing; restraint. |
| ramp.com | Shows the math explicitly; short looping feature demos instead of static screenshots. |
| plaid.com | Animated data-flow diagrams: the model for "where every number comes from". |
| linear.app | Crisp, fast micro-interactions; dark product sections; scroll-revealed product frames; typographic hierarchy. |
| dealcheck.io, BiggerPockets calculators | The competition. TrueCap must look clearly more modern and more trustworthy than both. |

More patterns: saasframe.io (fintech and real estate filters), awwwards.com, godly.website, mobbin.com (app patterns for the analyzer and dashboard), refero.design.

Also read `TRUECAP_UX_AUDIT.md`. Its presentation-only findings (theme whiplash, ROI labels, unreconciled cards) are in scope; anything that changes scoring or logic is a proposal.

---

## 4. Tooling

### Runtime (keep the bundle lean; one animation library)

- **`motion` (Motion for React)**, the only animation library. Use `LazyMotion` with `m` components and `domAnimation` (about 5KB initial plus about 24KB of features, gzipped), `strict` on. Load `domMax` lazily only where drag or layout animation is needed. Wrap each island in `MotionConfig reducedMotion="user"`. Server components stay server; motion lives in client leaves.
- **`@number-flow/react`** for every changing figure (cash flow, DSCR, CoC, prices, the plan price toggle): animated, locale-formatted, tabular. No animation under reduced motion.
- **React `<ViewTransition>`** for route continuity: the hero address field morphs into the analyzer's address field, a deal row into its deal page, tabs crossfade, the header stays anchored. Read `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` and confirm the import works with the installed React. If it doesn't, skip view transitions; do not upgrade React for them.
- **CSS scroll-driven animations** (`animation-timeline: view()`) for simple scroll reveals and progress, with zero JavaScript. Chrome and Safari 26+ support them; Firefox stable does not yet. Write the final visible state as the default, and put the animation inside `@supports (animation-timeline: view())` and `@media (prefers-reduced-motion: no-preference)`.
- **Existing dependencies:** Radix primitives (keep them; they carry the accessibility), `cmdk`, Recharts (restyle; animate the first draw only), `lucide-react` (functional icons with one consistent stroke, not decoration).
- **Registry components** (Magic UI, React Bits, Aceternity, 21st.dev) may be pulled through the shadcn CLI as source for a specific effect, then rewritten to the tokens, given a reduced-motion fallback (most ship without one) and stripped of unused code. Never install a whole library for one effect.

### Do not add

GSAP (a second animation library), Lenis or any smooth-scroll or scroll-jacking, Three.js/WebGL/Spline, Lottie, particle/aurora/beam backgrounds, cursor followers, auto-playing hero video. They cost LCP and TBT on the paid-ad phone traffic this site depends on, and they read as a template.

### Process

- **Impeccable** (`.claude/skills/impeccable`) in redesign mode: run `impeccable context` once, then follow its new-work reference to choose the replacement world. Use `shape` to plan pages; `bolder`, `colorize`, `animate`, `delight`, `typeset` and `layout` for passes; `critique` and `audit` to review; `polish` to finish. Its detector stays the slop gate, measured against the new `DESIGN.md`.
- **Playwright** and the capture harness `docs/design-pass/tools/capture.mjs` (375, 768, 1095, 1440) for before and after screenshots. Look at every screenshot you produce.
- **Measurement:** `npm run perf:lighthouse`, `npm run perf:homepage`, axe in the e2e suite.
- **Optional:** the Vercel view-transitions agent skill (`npx skills add vercel-labs/agent-skills --skill vercel-react-view-transitions`) if you build route transitions.
- **Review:** each PR gets a Vercel preview for the founder.

---

## 5. Design directions — ⛔ Checkpoint 1 picks one

Build all three as **static comps, not production code**: self-contained HTML files in `docs/overhaul-2026-10/directions/`, with figures generated from `calculateSampleDealOutcome()` by a small `tsx` script. Each comp shows the homepage hero at 1440 and 390, one analyzer result card (Offer Ceiling plus three metrics), one plan card and one dark band. Screenshot them side by side.

**A. Deal Desk (recommended).** A bright, cool white base; deep navy-ink "instrument" panels for product moments, which turns the app's navy rail into a deliberate brand surface and ends the light/navy whiplash; one confident cobalt for actions and the Offer Ceiling; green, red and amber reserved for pass/fail and the sign of a number. Product panels float with soft layered shadows and 12–16px radii over a faint dot grid. Type: Geist Sans with tabular figures for every number (retire DM Mono's code look), Geist Mono only for tiny metadata. Motion: precise and quick, 150–250ms, numbers settle on a spring. References: Mercury, Stripe, Linear.

**B. Blueprint.** Off-white with a faint architectural grid; the property drawn as a clean line schematic that gets annotated as you scroll (rent flows in, expenses flow out, cash flow lands at the bottom); cobalt and graphite with one warm highlight reserved for the Offer Ceiling. Type: a grotesk with character, such as Hanken Grotesk or Schibsted Grotesk, with tabular figures. Motion: lines drawing and annotations appearing. References: architectural drawings, Plaid's flow diagrams.

**C. Big Numbers.** Editorial and loud: oversized figures as the main graphic ($236,000 set huge), full-bleed cobalt and ink color blocks per section, tight expressive display type (for example Bricolage Grotesque for display with a clean sans for text). Motion: figures rolling, color blocks wiping in. References: Wise, Ramp.

For every direction:

- White text on the brand color clears 4.5:1.
- Check each font's tabular figures and its availability in `next/font/google` for the installed Next before proposing it.
- Avoid the generic AI-site look: purple-to-blue gradients, glassmorphism everywhere, sparkle icons, identical icon-tile bento grids, gradient text, Inter on white cards.
- Light is the default surface, because agents read this on a phone in daylight at showings. Dark appears as bands and product panels. Build tokens so a full dark theme is possible later; do not ship a theme toggle in this overhaul.

---

## 6. Homepage — the signature moments

### 1. Hero: "Drag the price"

Left column: H1, subhead, investor cue, address form (pinned copy). Right column: the sample deal as a live instrument.

- A horizontal price track from about $20k below the Offer Ceiling to about $20k above asking, with markers for "Asking $265,000" and "Offer Ceiling $236,000" (rendered from the engine).
- Dragging the handle, or using the arrow keys, moves the price. Cash flow after reserves, DSCR and CoC update with NumberFlow; each target chip flips between "Misses by $X" and "Meets"; the track shades the range that meets the Buy Box; the handle snaps gently at the ceiling and at asking.
- On first view it plays once: the handle glides from asking to the ceiling and "Meets the Buy Box" flips from No to Yes. Then the visitor has control. Under reduced motion it simply rests at the ceiling.
- Every figure opens a source popover on tap or hover (HUD FMR, FRED rate, Your input, TrueCap default), using the existing labels.
- **Data:** precompute at build time in a server component. For each price in $1,000 steps across the range, run the same engine functions the sample-deal ledger already uses, with the sample fixture at that price, and pass the compact array to the client island. No engine code ships to the browser. Add a unit test that the points at asking and at the ceiling equal `calculateSampleDealOutcome()` exactly, and that "Meets" flips exactly at the engine's ceiling.
- **First paint:** the server renders the full card at the ceiling state, so it works without JavaScript and causes no layout shift. The island hydrates onto it.
- **Accessibility:** Radix Slider (already a dependency) with an `aria-valuetext` such as "$250,000: cash flow $650 a month, misses the $750 target", announced when a drag ends.

### 2. "From listing to offer": a sticky scroll story

Replaces the long table walkthrough. One pinned product frame, built from real components with sample data (no fake browser chrome), changes as three steps scroll past:

1. Paste a listing: the starting values fill in with source chips (HUD rent, FRED rate; property tax stays your input and is flagged).
2. The Buy Box check runs and the binding target lights up.
3. The Offer Ceiling resolves and the send-to-client card slides in.

On phones the steps stack with no pinning. The full line-item tables stay available behind a "See every line" disclosure: they are the proof, so don't delete them.

### 3. "Every number has a receipt"

The sources section as an animated flow, in Plaid's manner: HUD → rent, FRED → rate, you → property tax, all flowing into the result. Each node opens what the source is, its date or basis, and what to replace it with.

### 4. "Make it yours": live co-branding preview

The visitor types a name and picks a brand color; a mock share page and PDF cover recolor live, with text color adjusted automatically for contrast. Client-only: nothing is stored or sent, the inputs carry `ph-no-capture` and are masked from session recording, and no analytics read the typed values. It ends by saying plainly that co-branding comes with Pro and Agent Pro.

### 5. Plans

A monthly/annual toggle with NumberFlow prices from the catalog; plan cards with hover depth; the comparison table with a sticky header.

### 6. Built by a rental investor, FAQ, close

Short. The FAQ becomes an animated accordion (the same eight questions, one FAQPage node mirroring exactly what is visible). Close on a bold brand band with the address form again.

### Global chrome

A sticky header that condenses on scroll; a compact cookie banner that does not cover the hero's first screen; the mobile sticky conversion bar restyled. Never more than one auto-playing animation on screen at a time.

---

## 7. Analyzer and app — Operate mode

Clarity beats expression here; the brand shows in precise details.

**Input (`/analyze`, `/dashboard/new`).** A hero-sized address field (the shared-element morph from the homepage). The inputs as a calm stepped flow (Property → Price and rent → Financing → Assumptions) with visible progress and defaults labeled with source chips. Advanced options in a smooth disclosure. On phones, assumptions are edited in a bottom sheet. Do not add required inputs or change validation (CLAUDE.md §1).

**Results.** A choreographed reveal that plays once per run, about one second in total: verdict headline → the Offer Ceiling figure rolls in → a price track shows asking against the ceiling and the gap → metric tiles count up → target chips flip → best next step. After that nothing moves unless the user changes an input; then figures animate between values. A compact summary bar sticks on scroll. Charts (waterfall, projections, sensitivity) animate their first draw only. Skeletons match the final layout; no spinners for content. Relabel ambiguous figures only where it is pure labeling (audit item "anchor the big ROI numbers"). An interactive "what if I offer $X" slider in the app, or written chart takeaways that need new logic, are proposals for the founder, not part of this build.

**Dashboard, saved deals, compare, Buy Boxes, clients, settings, profile.** The same tokens as marketing; the navy rail matches the marketing dark bands; row hover and keyboard focus states; empty states that point to the next action (with the sample deal), not illustrations for their own sake; consistent toasts; the `cmdk` palette styled if present.

**Auth screens.** Split layout: the form on one side, a live mini version of the hero instrument on the other.

**Share page (`/s/[token]`) and `/sample-decision-memo`.** Client-facing and co-branded: a polished document feel, the agent's color applied contrast-safely, figures revealed once, a print stylesheet. Do not change what data the page shows or how it is gated.

**Out of scope:** the PDF generator internals (optionally align its palette and fonts in a last, separate PR verified with `npm run pdf:check -- --branches`), email templates, a dark-mode toggle.

---

## 8. Phases and checkpoints

Work on branch `design/overhaul-2026-10`: one PR per phase, small commits, a Vercel preview per PR. Stop at every ⛔ and wait for the founder.

**Phase 0 — Recon (no code changes).**
- Read the docs listed in §2 and §3; run Impeccable context.
- Inventory every route and shared component that renders UI. List the tests that pin markup, split into "visual, re-anchorable" and "truth, must stay".
- Capture before screenshots of the key routes at 375, 768, 1095 and 1440 into `docs/overhaul-2026-10/before/`; record baseline Lighthouse and `perf:homepage` numbers.
- Capture the references in §3.
- Write `docs/overhaul-2026-10/brief.md`: what is wrong with the current UI (specific, with screenshots), what to take from each reference, the page-by-page plan, the test re-anchor list, the risks.

**Phase 1 — Directions. ⛔ Checkpoint 1.** The three comps from §5, side by side, one paragraph each. The founder picks one or a mix.

**Phase 2 — Foundation.**
- Tokens in `app/globals.css`: color (light base, dark bands and panels, brand, semantic), type ramp, radius, elevation, motion durations and easings.
- Fonts through `next/font` in `app/layout.tsx`, and every `font-family` declaration in `app/globals.css` (the root and the dashboard-scoped ones; grep for "Archivo" and "DM Mono").
- A motion system: `lib/motion.ts` (presets) and `components/motion/` (`MotionProvider` with LazyMotion and MotionConfig, `Reveal`, `Stagger`, `AnimatedNumber` on NumberFlow with a reduced-motion fallback, `SourcePopover`).
- Restyle `components/ui/*` and the shared parts: header, footer, `Section`, `page-parts`, `PlanCard`, FAQ, and the ledger primitives as the new result primitives.
- Rewrite `DESIGN.md` as the new decisions file (same front-matter token format), regenerate `.impeccable/design.json`, and update `CLAUDE.md` §9 so its rules describe the new system. Keep the process rules that still serve: tokens over raw values, detect before committing, check the real widths, re-anchor guards in the same commit. Add a decisions-log entry dated 2026-10-20.
- Dependencies through the build-chain-guard procedure in §2.

**Phase 3 — Homepage. ⛔ Checkpoint 2.** The homepage built to §6. Deliver before/after screenshots at four widths, a Playwright video of the hero interaction, Lighthouse and `perf:homepage` numbers against the baseline, and the list of re-anchored tests. Wait for approval before rolling out.

**Phase 4 — Analyzer, results, share page, sample memo.**

**Phase 5 — Marketing rollout through the shared templates, not page by page.** `/for-agents`, `/for-investors` and the persona pages, `/pricing`, `/about`, `/methodology`, `/reviews`, `/why-truecap`, the calculator template (`components/tools/tool-parts.tsx`; calculators must still work chrome-free inside partner `/embed` iframes), the blog article frame, the `/vs` template (`components/marketing/vs-page.tsx`, 38 pages), markets and states, glossary, playbook, 404 and error pages.

**Phase 6 — App.** Dashboard shell and pages, auth screens.

**Phase 7 — Assets.** Redraw the social-card frame (`lib/og/newsprint.tsx` and the templates in `lib/og/`) in the new system, within the `next/og` subset, with hex constants, fonts loaded and the fail-safe kept. Regenerate `public/product/*` with `scripts/capture-screenshots.ts` and the PDF cover shot. Update `theme-color` and the manifest colors if the palette changed.

**Phase 8 — QA. ⛔ Final checkpoint.** `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`, Lighthouse CI, Impeccable detect on changed files and on rendered pages at 1440×900 and 390×844, a reduced-motion pass, a keyboard-only pass of every interactive demo, Firefox (no scroll timelines) and Safari checks, and a throttled slow-4G check of the hero. The final report: a before/after gallery, the budgets table against baseline, dependencies added, tests re-anchored, and open proposals.

---

## 9. Definition of done

- Every page in Phases 3–6 is on the new tokens and shared components; no page-local overrides, no leftover Newsprint or Archivo/DM Mono styling.
- The four homepage moments in §6 work by mouse, touch and keyboard, and degrade to a complete static page without JavaScript and under reduced motion.
- Every figure shown traces to the engine or the catalog; the new scrubber test passes.
- All §2 budgets met or beaten on `/`, `/analyze` and `/pricing`.
- The whole test suite is green, with every re-anchor recorded in a commit message.
- `DESIGN.md`, `.impeccable/design.json` and `CLAUDE.md` §9 describe the new system.

## 10. Stop and ask when

- A change would touch anything under "Never touch" in §2.
- A change alters a fact or a pinned string.
- An idea goes beyond presentation (an in-app what-if price slider, chart takeaways that need new logic, an inline picker on Compare).
- A budget can't be met without cutting a signature moment: show the trade-off with numbers.
- You want to drop a section the founder approved earlier (FAQ items, the founder block): condense it instead, or ask.
