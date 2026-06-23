# TrueCap — Analysis Dashboard UX Improvement Plan

> Generated with the **UI/UX Pro Max** skill (installed at `.claude/skills/ui-ux-pro-max/`),
> grounded in the actual code of `components/investcalc/analysis-dashboard.tsx`
> (2,338 lines) and the app's design tokens in `app/globals.css`.
>
> Scope: the **analysis dashboard** (the tabbed result view — verdict → numbers →
> details). This is the implementation/visual layer. It is complementary to
> `TRUECAP_UX_AUDIT.md`, which covers higher-level product/packaging UX.
>
> Every item respects Morgan's standing directive (CLAUDE.md §1): no new required
> inputs, no new top-level nav, invisible-until-useful. These are polish and
> correctness changes to an already-strong surface — not a redesign.

---

## The surface is already well-built

Worth saying up front: the dashboard has a deliberate, calm information
hierarchy (verdict card → metric grid → tabbed detail), a real token system
(`--brand-green`, `--brand-blue-light`, `--metric-positive`, `--metric-negative`),
consistent `rounded-2xl` / `border-border` / `bg-card` framing, glossary tooltips,
and skeleton loading states. The recommendations below sharpen what's there; they
don't rebuild it.

---

## P0 — Dark mode is broken on the verdict/risk states

**This is a correctness bug, not a preference.** The app ships a dark theme
(`app/globals.css` defines `.dark`, and `theme-provider.tsx` is wired up), but the
dashboard's verdict states are painted with **raw, light-only Tailwind palette
values that have no `dark:` variant**:

- Recommendation card (`analysis-dashboard.tsx` ~L842–852): `neutral` →
  `bg-amber-50 border-amber-200`, `risky` → `bg-orange-50 border-orange-200`,
  `avoid` → `bg-red-50 border-red-200`. The `strong-buy` / `buy` states correctly
  use tokens (`--brand-green-light`, `--brand-blue-light`); the negative states do not.
- Across the file there are **~60 raw `*-50/100/200/700/800` usages**
  (amber/orange/red/blue) and **zero paired `dark:` variants**. In dark mode these
  render as pale panels with dark-on-light text floating on a dark page — low
  contrast and visually broken.

Skill guideline (pre-delivery checklist): *light-mode text contrast 4.5:1 minimum*
— and dark-mode must reach parity, not fall back to light swatches.

**Fix (the clean way):** add a semantic verdict scale to `app/globals.css` with
`.dark` overrides, then replace the raw palette with the tokens. One source of
truth, both themes correct:

```css
/* app/globals.css — :root */
--verdict-neutral-bg: oklch(0.97 0.03 85);   --verdict-neutral-fg: oklch(0.45 0.10 75);
--verdict-risky-bg:   oklch(0.96 0.05 55);   --verdict-risky-fg:   oklch(0.50 0.14 45);
--verdict-avoid-bg:   oklch(0.95 0.05 25);   --verdict-avoid-fg:   oklch(0.50 0.16 25);
/* .dark — same names, dark-appropriate values (deep, desaturated bg; light fg) */
```

Then `bg-amber-50` → `bg-[var(--verdict-neutral-bg)]`, `text-amber-700` →
`text-[var(--verdict-neutral-fg)]`, etc. (This mirrors how `strong-buy`/`buy`
already work, so it's consistent with the existing pattern.)

**Impact:** high (whole dark-mode experience on the most-viewed surface). **Effort:** medium.

---

## P1 — Interactive affordances are inconsistent

The file has **11 `onClick` handlers but only 3 `cursor-pointer`** declarations,
and the custom `<button>` elements (e.g. "Show all / Show fewer" at ~L928, strategy
toggles) rely on default cursor and have no explicit focus ring.

Skill checklist items, verbatim: *cursor-pointer on all clickable elements* ·
*focus states visible for keyboard nav* · *hover states with smooth transitions
(150–300ms)* · *prefers-reduced-motion respected*.

**Fix:** a small shared `className` for interactive non-`<Button>` elements —
`cursor-pointer transition-colors duration-200 focus-visible:outline-none
focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` — applied
to the raw buttons and clickable cards. Add a global
`@media (prefers-reduced-motion: reduce)` block that neutralizes transitions/animations.

**Impact:** medium-high (accessibility + perceived quality). **Effort:** low.

---

## P1 — Charts show data but not the "so-what"

Ties directly to `TRUECAP_UX_AUDIT.md` P1. The tabs render strong charts (cash-flow
crossing positive, tax shield decay, equity growth) but rarely state the takeaway in
words. A `panel-insight.tsx` shared component already exists
(`analysis-panels/shared/`) — it's the right home for a one-line, plain-English
read per chart ("Cash-flow turns positive in year 8" / "Your tax shield shrinks as
the loan amortizes").

Skill guideline (UX → Content): pair every visualization with a labeled,
human-readable interpretation; never make the user infer the conclusion.

**Impact:** high (this is the product's whole promise — a *verdict*, not a
spreadsheet). **Effort:** medium (compute the inflection points from the existing
projection arrays; no new inputs).

---

## P2 — Polish (do after the above)

- **Number formatting.** Skill flags long unformatted numbers. Confirm
  `analysis-panels/shared/formatters.ts` is used everywhere, and abbreviate large
  values in the tight metric cards (`$1.2M`, `$184K`) so a 6–7 digit figure never
  overflows the `text-xl sm:text-2xl` slot at 375px.
- **Token consistency.** Today positive verdicts use `--brand-*` tokens while
  negative verdicts use raw palette. After P0, unify everything onto the semantic
  verdict scale so the verdict color language is one system.
- **Label legibility.** The metric/summary labels are `text-[10px]` uppercase
  (`summary-card-grid.tsx` L41, metric card L333). At 10px, letter-spaced uppercase
  is near the comfortable floor — bump to `text-[11px] sm:text-xs`.
- **Responsive sweep.** Skill checklist breakpoints: 375 / 768 / 1024 / 1440.
  The verdict headline (`text-2xl sm:text-3xl`, ~L885) + 48px icon + long labels
  like "Strong Buy" should be checked at 375px for wrapping.

---

## Suggested sequence

1. **P0 dark-mode tokens** — highest correctness payoff, self-contained.
2. **P1 interactive affordances** — fast, broad quality lift.
3. **P1 chart insight lines** — the biggest *product* win; do once the visual base is solid.
4. **P2 polish** — formatting, token unification, legibility, responsive pass.

## Executing this with the skill

The skill is installed and auto-activates in Claude Code on UI/UX requests. For
this surface, in your repo:

```bash
# Persist a project design system the skill (and you) can reference across sessions
python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "real estate investment analytics dashboard light and dark mode" \
  --design-system --persist -p "TrueCap" --page "analysis-dashboard"
```

Then, in Claude Code with hot reload, work the list top-down — that's where the
skill is strongest, because you can see each change render live.
