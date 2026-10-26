# TrueCap QA — 2026-10-26

Status: release verification in progress. Fixture tests are not customer validation.

| Check | Evidence |
|---|---|
| Safe baseline | Fresh main at `f1d8e418`; old checkout with 379 local edits preserved |
| Baseline unit suite | 9,237 passed; sandbox-blocked loopback test passed both checks with loopback permission |
| First full implementation suite | 9,290 passed, 1 failed, 2 skipped; exact notes-anchor class pin restored; focused tests passed |
| Second full unit suite | 9,287 passed, 4 failed, 2 skipped. Failures were three allowance-source/copy checks after centralization plus their ad-kit aggregate. Updated checks to read the central values and verify action bindings; all 26 affected tests passed. Final full CI run pending |
| Financial references | 8 passed: SFR, duplex, 4-unit, low/negative cash flow, high taxes, missing inputs, conflicting targets. Independent annuity/NOI/cash-flow worksheet reconciles; next $500 increment fails a selected target |
| Trial | Dynamic-ledger tests cover three properties, revisions at exhausted quota, fourth-property refusal, expiry, auth, legacy promotion and failed reads/writes |
| Client data | Tests cover omitted-data preservation, ownership, gates, malformed financing, per-client assumptions, missing metrics, conflicting boxes and no original mutation |
| PDF | Actual six-page jsPDF export text checked; pages 1–3 rendered at 1,400px and visually inspected. Client criteria/financing present; private notes/email absent; no clipped context card |
| TypeScript | Passed after sharing preparation and limit centralization; CI repeats on final commit |
| ESLint | 0 errors; three existing audit-tool warnings; new prefer-const warning corrected |
| Build | Production and final isolated visual builds passed |
| Design | No primary source-detector findings in changed client/financing/evidence UI and pricing |
| Initial responsive pass | Clients and saved deal HTTP 200 at 375,390,768,1095,1440; no horizontal overflow. Final phase-two images pending |
| Hosted preflight | Correct TrueCap project authenticated; existing schema verified. New migrations pending |
| Isolated DB/E2E | Pending CI replay. New Agent Pro test covers two users, two matches/one property, stale-screen rejection, PDF, share/revoke, comparable save/archive/restore and cross-owner denial |
| Deployment / live smoke | Pending |

The read-only loopback fixture drops writes and cannot establish persistence or RLS. CI must replay all migrations and run actual authenticated workflows before production SQL.

Existing tests cover anonymous/free/Pro roles, scenarios, comparisons, Offer Ceiling gates, upload validation, share expiry/revocation, billing ownership, signature-bound webhooks and reconciliation. These tests do not establish live checkout delivery, actual provider licensing or field Core Web Vitals. No real purchase, charge, marketing send or paid data request was performed.

Released model v1/methodology 1.3 remain unchanged. Existing golden references remain intact; model v2 is not activated. Old client matches fail closed for fresh PDF export when methodology differs.
