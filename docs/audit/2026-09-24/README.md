# 2026-09-24 full-site audit — Impeccable critique reports

Assessment A ("design director" review, one isolated sub-agent per page
group, read-only, screenshots at 375/768/1095/1280/1440 + source) for the
production-readiness audit on branch `audit/full-site`. Assessment B (the
Impeccable detector, axe-core and the crawl) lives in `AUDIT.md` §5. The
reports below are verbatim except for the removal of agent preambles; every
claim carries a file:line or screenshot path, and claims the reviewer could
not verify are marked UNVERIFIED. `AUDIT.md` §5 records which findings were
acted on, which were refuted on verification, and which await the founder.

- `critique-marketing.md` — `/`, `/pricing`, `/about`, `/methodology`, persona and comparison pages, markets, states, glossary
- `critique-analyzer-dashboard.md` — `/analyze`, the results view, `/dashboard/*`, settings, profile
- `critique-results-memo-share.md` — the decision card, `/sample-decision-memo`, `/s/[token]`, the PDF section order
- `critique-auth-billing.md` — `/auth/*`, pricing checkout, profile billing
- `critique-blog-tools-embeds.md` — `/blog/*`, `/tools/*`, `/embed/*`, `/search`, `/changelog`

## How the critiques were acted on

`AUDIT.md` §5 is the ledger (acted / refuted / deferred, with the grep-verified
counts). Commits by batch on `audit/full-site`:

- **Batch A — site-wide vocabulary** (all groups): `d5014af` tokens, `6582e55` type ramp / focus / colour / chrome / measure across 336 files.
- **Batch B — analyzer, results, memo, share**: `f431090` pricing badges, `0aeeaab` skeleton status, `55ed5e7` form labels + step rail, `5a82438` dashboard gradients, `7ab956c` sign-up label, `054ab99` one metric rule set (band / card / viewer), `188162f` memo, `213aed0` shared shell, `5a1c1d5` analyzer first screen, `6e4b8d8` targets vocabulary.
- **Batch C — auth and billing**: `d54a4c1` auth forms, `ec6d275` billing status, `91fca7f` pricing pill, `7edc2c9` trial strip.
- **Batch D — blog, tools, embeds**: `6ba12c0` tables, `1e2ab72` embed hub, `11d527c` widget numerals, `c6db5ef` tool footers, `ec37e9b` index order, `cb2a758` guards.

`screenshots/before` (baseline crawl, 2026-09-24 morning) and
`screenshots/after` (final crawl on the rebuilt branch) hold the first screen
of eight key pages at 375px plus `/` and `/analyze` at 1280px.
