# Lighthouse after Phase 5 (2026-10-20)

Same harness as the baseline and the earlier phases
(`tools/lhci-running-server.json`, mobile 390×844, simulated throttling,
medians of 3), against the local production build on a quiet machine.

| Route | Perf | A11y | LCP | TBT | CLS | Script KB | Total KB |
|---|---|---|---|---|---|---|---|
| `/` Phase 4 | 0.89 | 1.00 | 3.8 s | 10 ms | 0.000 | 424 | 625 |
| `/` Phase 5 | 0.89 | 1.00 | 3.8 s | 17 ms | 0.000 | 424 | 625 |
| `/analyze` Phase 4 | 0.87 | 1.00 | 4.0 s | 48 ms | 0.002 | 624 | 798 |
| `/analyze` Phase 5 | 0.86 | 1.00 | 4.2 s | 44 ms | 0.002 | 624 | 797 |
| `/pricing` Phase 4 | 0.88 | 1.00 | 3.9 s | 19 ms | 0.002 | 432 | 587 |
| `/pricing` Phase 5 | 0.88 | 1.00 | 3.9 s | 21 ms | 0.002 | 437 | 611 |

`lhci assert`: the build-failing assertions (accessibility ≥ 0.95, CLS ≤ 0.05)
pass on every route; the warnings are the baseline's (LCP over 3 s, script
over 256 KB on `/analyze`). `/pricing` carries 5 KB more script and 24 KB
more total: the sheet-grid tile under its hero and close, and the ruled rows.
