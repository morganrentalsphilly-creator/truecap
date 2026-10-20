# Lighthouse after Phase 4 (2026-10-20)

Same harness as the baseline and Phase 3 (`tools/lhci-running-server.json`,
mobile 390×844, simulated throttling, medians of 3), against the local
production build on a quiet machine. A first run taken right after the e2e
suite, with the load average near 6, read `/analyze` at 200 to 451 ms TBT;
the three quiet runs below read 46 to 51 ms, so the loaded run is not
reported.

| Route | Perf | A11y | LCP | TBT | CLS | Script KB | Total KB |
|---|---|---|---|---|---|---|---|
| `/` Phase 3 | 0.89 | 1.00 | 3.8 s | 9 ms | 0.000 | 430 | 637 |
| `/` Phase 4 | 0.89 | 1.00 | 3.8 s | 10 ms | 0.000 | 424 | 625 |
| `/analyze` Phase 3 | 0.84 | 1.00 | 4.5 s | 43 ms | 0.002 | 639 | 794 |
| `/analyze` Phase 4 | 0.87 | 1.00 | 4.0 s | 48 ms | 0.002 | 624 | 798 |
| `/pricing` Phase 3 | 0.92 | 1.00 | 3.3 s | 9 ms | 0.002 | 437 | 598 |
| `/pricing` Phase 4 | 0.88 | 1.00 | 3.9 s | 19 ms | 0.002 | 432 | 587 |

`lhci assert`: the build-failing assertions (accessibility ≥ 0.95, CLS ≤ 0.05)
pass on every route; the warnings are the ones the baseline already carried
(LCP over 3 s on `/` and `/analyze`, script over 256 KB on `/analyze`).
