# TrueCap — Analysis Dashboard UX Improvement Plan

> Generated with the **UI/UX Pro Max** skill (`.claude/skills/ui-ux-pro-max/`),
> then **verified against the actual code** in
> `components/investcalc/analysis-dashboard.tsx` and `app/globals.css`.
>
> Scope: the **analysis dashboard** (verdict → numbers → details). Implementation/
> visual layer — complementary to `TRUECAP_UX_AUDIT.md` (product/packaging UX).
> Every item respects Morgan's standing directive: no new required inputs, no new
> top-level nav, invisible-until-useful. Polish, not redesign.

---

## Verification corrections (read this first)

An initial draft of this plan flagged findings from a fast code scan. Reading the
real code overturned several of them — recording that honestly so nobody acts on a
phantom:

- **Dark mode is NOT broken — it's intentionally absent.** `app/globals.css`
  (L196–272) documents that the analyzer + dashboard are **always light** ("The app
  has no theme toggle"), and there is no `ThemeProvider`/`next-themes` wired up and
  nothing ever applies the `.dark` class. So the raw `amber-50/orange-50/red-50`
  verdict palette is **correct**, and adding "dark-aware tokens" would be pure churn
  against a documented decision. **Dropped.**
- **`prefers-reduced-motion` is already handled** — global block at
  `app/globals.css` L182–194. **Dropped.**
- **Tap targets already handled** — `touch-action: manipulation` +
  `-webkit-tap-highlight-color` at L148/177, and toggles use `min-h-11`. **Dropped.**

Net: the surface was already in better shape than a grep implied. The lesson —
verify against render/code before assigning severity.

---

## DONE — Interactive affordances on raw buttons ✅ (shipped)

Most `onClick`s sit on shadcn `<Button>` (cursor/focus handled) and the
`<details>/<summary>` toggles already use `cursor-pointer`. The real gap was four
**raw `<button>`** groups missing pointer affordance + a visible keyboard focus
ring (WCAG 2.4.7 Focus Visible):

| Element | Line | Change |
|---|---|---|
| Tab strip | ~1185 | `cursor-pointer` + `focus-visible:ring-2 ring-ring` |
| Strategy chips | ~1448 | `cursor-pointer` + `focus-visible:ring-2 ring-ring` |
| "Show all / fewer" tips | ~953 | `cursor-pointer` + `focus-visible:underline` (mirrors hover) |
| Export-mode rows | ~809 | `cursor-pointer` + `focus-visible:bg-muted` (mirrors hover) + `disabled:cursor-not-allowed` |

Each focus state mirrors that element's existing hover treatment, so it reads as
part of the design rather than a bolt-on. String-literal class edits only — no type
surface touched.

---

## NEXT (highest value) — Chart "so-what" insight lines

Corroborated by `TRUECAP_UX_AUDIT.md` P1. The tabs render strong charts but rarely
state the takeaway in words; the user has to infer "cash-flow turns positive in
year 8" or "the tax shield shrinks as the loan amortizes." A `panel-insight.tsx`
shared component already exists in `analysis-panels/shared/` — it's the right home
for a one-line, plain-English read per chart.

Skill guideline (UX → Content): pair every visualization with a labeled,
human-readable interpretation. This is the product's whole promise — a *verdict*,
not a spreadsheet.

**Effort:** medium — compute inflection points from the existing projection arrays
(no new inputs). **Best done in Claude Code with hot reload** so each insight line
is checked against the actual chart it summarizes.

---

## P2 — Polish (verify, then decide)

These need eyes on the running app; framed as "check," not "defect":

- **Number formatting at 375px.** Confirm `analysis-panels/shared/formatters.ts`
  is used everywhere and that 6–7-digit values abbreviate (`$1.2M`) so they don't
  overflow the `text-xl sm:text-2xl` metric slot on the smallest breakpoint.
- **Label legibility.** The `text-[10px]` uppercase labels are used *deliberately
  and consistently*; only revisit if they test poorly for readability — not a defect.
- **Responsive sweep.** Skill breakpoints 375/768/1024/1440 — check the verdict
  headline (`text-2xl sm:text-3xl`) + 48px icon + "Strong Buy" label for wrapping at 375.

---

## Executing with the skill

Installed and auto-activates in Claude Code on UI/UX requests. To persist a
project design system for reference across sessions:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "real estate investment analytics dashboard" \
  --design-system --persist -p "TrueCap" --page "analysis-dashboard"
```

Then work top-down in Claude Code with hot reload.
