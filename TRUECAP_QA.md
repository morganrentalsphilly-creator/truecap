# TrueCap QA — 2026-10-26

Status: release verification in progress. Fixture tests are not customer validation.

| Check | Evidence |
|---|---|
| Safe baseline | Fresh main at `f1d8e418`; old checkout with 379 local edits preserved |
| Baseline unit suite | 9,237 passed; sandbox-blocked loopback test passed both checks with loopback permission |
| First full implementation suite | 9,290 passed, 1 failed, 2 skipped; exact notes-anchor class pin restored; focused tests passed |
| Second full unit suite | 9,287 passed, 4 failed, 2 skipped. Failures were three allowance-source/copy checks after centralization plus their ad-kit aggregate. Updated checks to read the central values and verify action bindings; all 26 affected tests passed. Subsequent CI runs 40362070065 and 40364074742 passed the full check job: 9,291 tests passed, 3 skipped |
| Financial references | 8 passed: SFR, duplex, 4-unit, low/negative cash flow, high taxes, missing inputs, conflicting targets. Independent annuity/NOI/cash-flow worksheet reconciles; next $500 increment fails a selected target |
| Trial | Dynamic-ledger tests cover three properties, revisions at exhausted quota, fourth-property refusal, expiry, auth, legacy promotion and failed reads/writes |
| Client data | Tests cover omitted-data preservation, ownership, gates, malformed financing, per-client assumptions, missing metrics, conflicting boxes and no original mutation |
| PDF | Actual six-page jsPDF export text checked; all six pages rendered and visually inspected. Client criteria/financing present; private notes/email absent. Cash stressed DSCR clipping corrected and re-rendered. Three regressions prove missing/wrong market/type cannot be overridden by favorable financials in the main verdict |
| TypeScript | Passed after sharing preparation and limit centralization; CI repeats on final commit |
| ESLint | 0 errors; three existing audit-tool warnings; new prefer-const warning corrected |
| Build | Production and final isolated visual builds passed |
| Design | No primary source-detector findings in changed client/financing/evidence UI and pricing |
| Initial responsive pass | Clients and saved deal HTTP 200 at 375,390,768,1095,1440; no horizontal overflow. Final phase-two captures and 390/1440 confirmation passed |
| Hosted preflight | Correct TrueCap project authenticated; existing schema verified. New migrations pending |
| Isolated DB/E2E | Clean migration replay passed. Run 40364074742: 75 browser tests passed, one new test failed because it clicked the first client after changing a different client. Selectors now identify the client by name; update success is asserted; retry pending. New Agent Pro test covers two users, two matches/one property, stale-screen rejection, PDF, share/revoke, comparable save/archive/restore and cross-owner denial |
| Deployment / live smoke | Pending |

The read-only loopback fixture drops writes and cannot establish persistence or RLS. CI must replay all migrations and run actual authenticated workflows before production SQL.

CI run 40362070065 passed the full check job (lint, typecheck, unit suite, build), build integrity and Lighthouse job. Run 40364074742 also passed check/build integrity/Lighthouse; its browser result and correction are recorded above. Final browser rerun remains pending. Final local captures at all five widths show no horizontal overflow; 390/1440 confirmation also verifies screening returns to a ready button. The fixture lacks document Storage and returns one known Storage 404 per saved-deal capture. Inline text links and existing checkbox icons account for the small-target list. A rendered detector flagged the disabled empty-form Add client button; inactive controls are exempt from WCAG text contrast, so this is not treated as an active-control contrast defect. An unrelated streamed transition held the new screening button busy; operation-local pending state fixes it and E2E now asserts readiness.

Existing tests cover anonymous/free/Pro roles, scenarios, comparisons, Offer Ceiling gates, upload validation, share expiry/revocation, billing ownership, signature-bound webhooks and reconciliation. These tests do not establish live checkout delivery, actual provider licensing or field Core Web Vitals. No real purchase, charge, marketing send or paid data request was performed.

Released model v1/methodology 1.3 remain unchanged. Existing golden references remain intact; model v2 is not activated. Old client matches fail closed for fresh PDF export when methodology differs.

Lighthouse CI published median reports: homepage performance 87/accessibility 100/LCP 3.77s; analyze 86/100/3.55s; pricing 91/100/3.53s. All CLS below 0.003. The 90+ performance and 2.5s LCP targets are not fully met; a passing warning-only Lighthouse job is not evidence that those targets passed. Homepage JS measured 351,203 bytes against the 256,000-byte warning budget. Field CWV remains unmeasured.

Rendered desktop scans retain existing long-line, nested-container and truncation warnings; new source scans are clean. This is a bounded review of the changed workflows, not a claim of zero accessibility issues across every existing page.

Release candidate at `00441db1` includes current main (`f6db7201`). CI run 40367090195 passed 9,292 tests; two source-contract assertions expected the old unconditional Offer Ceiling call. Those assertions are re-anchored to require both the client-scope suppression and the same canonical builder, without relaxing recorded-result protections. The four affected report/contract suites pass locally; final required CI status is recorded on PR #196. The completed production delivery record supplements this release-candidate QA log.

CI run 40368159519 passed the full lint/typecheck/unit/build job after the report guard correction. The authenticated workflow now reaches successful PDF/share creation. Its revocation check raced the mutation: the second GET began 30ms after revocation started, before the 159ms action finished. The corrected test waits for the success toast, checks persisted revoked_at, and verifies the recipient sees the not-found page with no rental-report heading. It checks actual access because Next.js may stream not-found content with HTTP 200. Final browser rerun remains the production gate.

Run 40369589750 again passed all 9,294 unit tests and the production build. The authenticated trace confirmed persisted revocation and the correct share-specific unavailable page. Its assertion expected the generic site 404 heading; corrected to the actual share-specific heading while retaining the no-report assertion. The comparable/RLS tail must still finish in the final browser run.
