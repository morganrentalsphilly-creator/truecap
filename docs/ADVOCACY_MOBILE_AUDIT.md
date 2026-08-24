# Advocacy decision-path responsive audit

Audit date: 2026-08-24

Scope: local development build with non-secret placeholder provider configuration. No production data, live Stripe session, payment, email, migration, or provider purchase was used.

## Deterministic path exercised

1. Opened the anonymous homepage.
2. Activated **Try a synthetic sample rental** through the visible UI.
3. Verified that the calculator populated the shared synthetic fixture and completed the analysis.
4. Verified the focused result showed the $236,000 Offer Ceiling, the $750/month cash-flow target, the 1.25 DSCR target, the binding cash-flow constraint, and non-advice language.
5. Verified that the post-analysis email prompt did not open over the initial result after the analyzer's automatic scroll.
6. Accepted the local cookie-consent choice only to inspect the unobstructed result. No personal data was entered or transmitted.
7. Audited the focused result at 320, 360, 390, 768, 1024, and 1280 CSS pixels.
8. Audited `/sample-decision-memo` at the same widths.

## Results

| Surface | Widths | Horizontal overflow | Visible undersized meaningful controls | Required decision order |
| --- | --- | --- | --- | --- |
| Focused sample result | 320, 360, 390, 768, 1024, 1280 | None | None after fixes | Rule fit, target criteria, Offer Ceiling, binding constraint, and readiness precede secondary analysis |
| Public sample memo | 320, 360, 390, 768, 1024, 1280 | None | None | Synthetic disclosure, rule fit, Offer Ceiling, target/version, and binding constraint precede supporting metrics |
| Public pricing | 390, 768, 1280 | None | None | Unsupported guarantee/founding claims absent in the rendered local page |

The initial audit reproduced an email-capture overlay over the first decision viewport. The cause was a race between the results auto-scroll and the prompt's scroll-depth listener. The listener now arms after layout settles and requires an additional 240 CSS pixels of downward movement. A clean-origin browser retest confirmed the prompt remained closed through the initial result.

## Screenshot artifacts

- [Focused decision — 320 px](./audit-artifacts/advocacy-focused-decision-320.png)
- [Focused decision — 360 px](./audit-artifacts/advocacy-focused-decision-360.png)
- [Focused decision — 390 px](./audit-artifacts/advocacy-focused-decision-390.png)
- [Sample memo — 320 px](./audit-artifacts/advocacy-sample-memo-320.png)
- [Sample memo — 390 px](./audit-artifacts/advocacy-sample-memo-390.png)
- [Sample memo — 1280 px](./audit-artifacts/advocacy-sample-memo-1280.png)

## Limits requiring manual release verification

- The private internal-cohort gate was not bypassed for browser testing. Its richer contract is covered by unit/source tests; an authenticated allowlisted staging account still needs a manual visual pass before rollout.
- CSS reflow was checked down to 320 px and at a 640 px proxy for a 1280 px viewport at 200% scale. Actual browser zoom at 200% was not independently driven.
- Focus styles, accessible names, heading order, live-region source contracts, and target sizes were inspected, but a full keyboard-only traversal and VoiceOver/NVDA session remain manual release checks.
- Share creation/retrieval and paid Pack retrieval require authenticated test infrastructure and are not claimed as browser-passed here.
- Public recurring prices intentionally resolve from Stripe. The placeholder local environment had no live price configuration, so actual recurring amount rendering and checkout were not browser-tested; no checkout was started.
