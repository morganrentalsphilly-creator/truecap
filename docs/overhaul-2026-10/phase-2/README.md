# Phase 2: foundation (2026-10-20)

The Blueprint tokens, fonts, motion system and shared parts, on branch
`design/overhaul-2026-10-phase-2` (stacked on `design/overhaul-2026-10`). No
page was redesigned yet: every page simply reads the new tokens, so this is
the look of the old layouts on the new system. Phase 3 rebuilds the homepage.

## What changed

- `app/globals.css`: the palette (the sheet, graphite, cobalt, the warm
  highlight, the navy band, the grid), radius by role, three elevation
  steps, motion tokens, the utilities `font-display`, `font-figure`,
  `bg-sheet-grid`, `bg-navy-grid`, `highlight-stroke`. The Archivo fallback
  face is gone. Legacy `--brand-*` and `--metric-*` names resolve to literal
  Blueprint values so the contrast guards keep parsing them.
- `app/layout.tsx`: Hanken Grotesk (display and text) and Geist Mono
  (metadata) through `next/font`.
- `lib/motion.ts`, `components/motion/`: `MotionProvider`, `Reveal`,
  `Stagger`, `AnimatedNumber`, `SourcePopover`. Nothing mounts them yet, so
  the homepage ships no new JavaScript in this phase.
- `components/ui/card.tsx`, `plan-card.tsx`, `ledger-parts.tsx`,
  `header.tsx`: the rest shadow, the hover lift, figures in the figure
  voice, the translucent header.
- `lib/stripe/checkout-branding.ts`: Checkout sends the sheet and cobalt.
- `DESIGN.md`, `.impeccable/design.json`, `CLAUDE.md` §9: the new system.
- Dependencies: `motion` 14.4.0, `@number-flow/react` 0.6.2, in their own
  commit with the manifest bump on its own.

## Tests re-anchored (each in the commit that moved it)

`display-font-fallback`, `accessibility-remediation-guards` (one literal
value), `audit-2026-09-auth-and-content-guards`, `blog-post-frame`,
`checkout-session-branding`. Every truth assertion is unchanged. The full
suite: 532 files, 8,879 tests, green. `npx tsc --noEmit`, `npm run lint` and
`npm run build` pass. Impeccable source detector on the changed files: no
primary findings (advisories name the dashboard's old gradients, which
Phase 6 owns).

## Measurements against the Phase 0 baseline

| Route | Perf | A11y | LCP | TBT | CLS | Script KB | Total KB |
|---|---|---|---|---|---|---|---|
| `/` baseline | 0.89 | 1.00 | 3.8 s | 10 ms | 0.000 | 408 | 651 |
| `/` Phase 2 | 0.90 | 1.00 | 3.6 s | 20 ms | 0.000 | 408 | 576 |
| `/analyze` baseline | 0.86 | 1.00 | 4.1 s | 58 ms | 0.002 | 615 | 841 |
| `/analyze` Phase 2 | 0.84 | 1.00 | 4.5 s | 68 ms | 0.002 | 615 | 766 |
| `/pricing` baseline | 0.91 | 1.00 | 3.5 s | 28 ms | 0.002 | 416 | 648 |
| `/pricing` Phase 2 | 0.89 | 1.00 | 3.8 s | 22 ms | 0.002 | 416 | 572 |

Total bytes fall by about 75 KB per route (one variable font replaces two
families with a width axis). LCP moves within run-to-run noise on this
machine; the script budget is unchanged at 408 KB. `perf:homepage`: HTML
217,676 B, first-party JS 406,667 B, CLS 0, no axe violations, the hero's
address entry above the fold at 390×844. No horizontal overflow on any of
the four captured routes at 390 or 1440 (`facts.json`).

## Captures

`home`, `pricing`, `analyze` and `auth_login` at 390 and 1440, first screen
and full page, as JPEG.
