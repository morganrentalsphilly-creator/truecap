# Lighthouse CI baseline (2026-10-20)

Median of 3 runs per route, mobile 390x844, simulated throttling, local production build on 127.0.0.1:3100 (config: tools/lhci-running-server.json). Warnings from the assert step: / LCP 3.8 s (budget 2.5 s, warn), / script 408 KB (budget 256 KB, warn), /analyze LCP 4.1 s (budget 3.0 s, warn). No errors: accessibility and CLS pass on all three routes.

| Route | Perf | A11y | LCP | TBT | CLS | Script KB | Total KB |
|---|---|---|---|---|---|---|---|
| `/` | 0.89 | 1.00 | 3.8 s | 10 ms | 0.000 | 408 | 651 |
| `/analyze` | 0.86 | 1.00 | 4.1 s | 58 ms | 0.002 | 615 | 841 |
| `/pricing` | 0.91 | 1.00 | 3.5 s | 28 ms | 0.002 | 416 | 648 |
