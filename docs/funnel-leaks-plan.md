# Funnel leaks plan (Phase 0 discovery)

Status: built 2026-10-03 after "go". All four features ship dark behind their flags; nothing has been applied to the database, deployed, or sent. See section 4 for what was built and section 5 for the rollout order.

## 1. What exists today

**Anonymous `/analyze`.** `app/analyze/page.tsx` is static and mounts the analyzer (`components/investcalc/investcalc-page.tsx`); the result renders in `analysis-dashboard.tsx`. The deal snapshot is **not stored server-side**. `claimAnonymousDecisionAction` (`app/actions/anonymous-decision.ts`) sets a signed HttpOnly cookie (`lib/anonymous-decision-grant.ts`, 21 days, 5 claims/hour/IP) that binds the browser to a hash of the inputs; the values stay in the browser. A server PDF renderer exists (`app/actions/generate-report-pdf.ts`, DOM-free) and already accepts the anonymous grant. `/sample-decision-memo` is an HTML page over the sample fixture, not a per-deal memo.

**Trial.** `product_evaluations` + `product_evaluation_usage` (migration `20260827090000`). A trigger on `auth.users` insert creates the row (21 days, 3 deals, 1 comparison). Enforcement is the `consume_product_evaluation_usage` RPC, called from `app/actions/product-evaluation.ts` (deals, from the analyzer's Run handler) and `app/actions/compare.ts`. Constants in `lib/product-access.ts`. At the limit the user gets only a toast ("Free trial complete").

**Lifecycle email.** Daily cron `/api/cron/send-lifecycle-emails` (14:00 UTC). `LIFECYCLE_EMAILS_MODE`: `off` (default) no-op, `dry` returns a JSON preview and sends/logs nothing, `live` sends. Pure engine `lib/lifecycle-emails.ts`, renderer `lib/email/render-lifecycle.ts` (JSON content → `emails/lifecycle-email.tsx`), instant path `lib/email/send-lifecycle.ts`. Log: `lifecycle_email_log`, unique `(user_id, email_key)`, claim-before-send. Existing sequences:

- Accounts: `welcome` (instant on confirm), `drip_1..30` (daily, free users), `pro_nudge` (day 31) and `winback_21d` (both require `profiles.marketing_emails = true`), legacy `trial_day1/10` (old Stripe trial, effectively dead).
- Anonymous: post-analysis checklist (5 emails via Resend `scheduled_at`, `app/actions/post-analysis-email-capture.ts`; its UI `PostAnalysisEmailPrompt` is **mounted nowhere**) and the `/playbook` lead magnet.
- Suppression: `email_suppressions` (hashed address) + `email_drip_schedules`, signed one-click `/email/unsubscribe` (drip scope by hash, marketing scope by user id). Rate limiting: `email_capture_guard` (per email / IP / global, Postgres).
- Gaps: account lifecycle sends carry no `List-Unsubscribe` header and no postal address. `EMAIL_POSTAL_ADDRESS` exists but only the feedback email reads it. `NEWSLETTER_PAUSED` is read only by the retired weekly-digest route.

**Coupons.** `POST_ANALYSIS_COUPON_CODE` (+ `POST_ANALYSIS_COUPON_ID`) → `lib/post-analysis-offer.ts`; `createCheckoutSessionAction` resolves `?offer=` against that whitelist; Pro only. Checkout has one discount slot: pack credit > campaign offer > `STRIPE_ANNUAL_DISCOUNT_COUPON_ID` (pro_annual only). **`ABANDONED_CART_COUPON_CODE` is referenced nowhere in the code.**

**Shared deals.** `/s/[token]` → `resolvePublicShare` (`lib/public-share.ts`): opaque token, hashed at rest in `public_shares`, 180-day expiry, minting requires a signed-in owner. Rendered by `SharedDealShell`, whose CTAs all link to `/` with no tracking. `SHARE_LINK_SECRET` does not sign `/s` links; it keys the anonymous grant cookie, legacy `/d` attribution, portal/embed/unsubscribe tokens (`lib/signed-token.ts`) and PDF attestation.

**Analytics.** `track()` (`lib/analytics/site-events.ts`) → Vercel Web Analytics always, GTM/GA4 `dataLayer` after consent, test buffer. `trackServer()` for server events. Google Ads via `trackConversion`. PostHog (`trackEvent`, `captureServerEvent`) with `canonical_analytics_event_claims` for dedupe. No Microsoft UET. Google tags are deliberately not loaded on `/s`.

**Turnstile.** Wired only into the Supabase auth forms; Supabase verifies the token. There is no server-side `siteverify` in this codebase.

## 2. Proposed design (smallest extension)

**A. Memo capture.** New `memo_leads` table holding the validated input snapshot (jsonb) — required because nothing is stored for anonymous users. New server action modelled on `capturePostAnalysisEmail`: reuses `claimEmailCaptureSlot` (new surface key), `email_suppressions`, `escapeHtml`, and adds a Turnstile `siteverify` helper. Memo numbers come from `calculateAnalysis` + the existing sensitivity/Offer Ceiling modules, never from client-supplied figures. The email links to a new read-only route `/memo/[token]` (signed with `lib/signed-token.ts`, rendered by the existing read-only view) rather than minting an ownerless `/s` row, which `public-share.ts` forbids. PDF: link to download from that page; no attachment in v1. Form mounts in the anonymous result only, fails soft. Signup hook (auth callback + email sign-up) sets `converted_user_id` by email match.

**B. Sequences.** Extend `lib/lifecycle-emails.ts` with a pure step selector for `L1–L4` and `T0–T6`; the same cron loads `memo_leads` alongside users; same renderer, with JSON content in `emails/lifecycle-content/` (investor + agent variants) plus token substitution for per-deal numbers. L0/T0 use the instant path. Add unsubscribe header, footer link and postal address to these sends. One log: add nullable `lead_id` to `lifecycle_email_log` with a partial unique index `(lead_id, email_key)`. T-sequence **replaces** `drip_N` and `pro_nudge` for accounts when the flag is on (otherwise users get both). Trial-end offer: `?offer=` resolves to `TRIAL_END_ANNUAL_COUPON` in `billing.ts` only when plan is annual and `product_evaluations.started_at` is 18–23 days old. Agent intent stored in auth `user_metadata` at signup (nothing records it today).

**C. Upgrade nudge.** Replace the toast with an inline card in the result when `dealsUsed === 3` (and at `LIMIT_REACHED`), using the existing `MomentOfValueUpsell` slot. Flag `FUNNEL_UPGRADE_NUDGE`.

**D. Shared-deal CTA.** Point `SharedDealShell` CTAs at `/analyze?utm_source=shared_deal…` with one primary button. Flag `FUNNEL_SHARED_CTA`.

**Instrumentation.** New typed events in `SiteEventProps` (`memo_requested`, `memo_sent`, `sequence_email_sent`, `upgrade_nudge_shown/clicked`, `shared_cta_clicked`, `trial_offer_redeemed`), server ones via `trackServer` + PostHog. No new pipeline.

**Migrations (new files, SQL shown for review before applying):** `memo_leads`; `lifecycle_email_log.lead_id` + index; no others.

**Env vars to set:** `FUNNEL_MEMO_CAPTURE`, `FUNNEL_SEQUENCES`, `FUNNEL_UPGRADE_NUDGE`, `FUNNEL_SHARED_CTA`, `TRIAL_END_ANNUAL_COUPON`, `TURNSTILE_SECRET_KEY`, `EMAIL_POSTAL_ADDRESS`, and `LIFECYCLE_EMAILS_MODE` moved `dry` → `live` when ready.

## 3. Decisions (founder, 2026-10-03)

1. **Newsletter stays paused.** `NEWSLETTER_PAUSED=1` stays, no Resend audience is recreated, and memo leads are not added to one. The `memo_lead` tag goes on each send (`audience` tag) instead.
2. **Sequences are not blocked by `NEWSLETTER_PAUSED`.** They are per-recipient lifecycle sends controlled by `FUNNEL_SEQUENCES` and `LIFECYCLE_EMAILS_MODE`.
3. **Everyone has consented.** The trial sequence goes to all trial accounts and is not gated on `profiles.marketing_emails`. `profiles.marketing_opt_out` and `email_suppressions` are honored on every send.
4. **The trial sequence replaces the 30-day drip**, the legacy welcome (T0 takes its place) and the day-31 pro nudge. Win-back is unchanged.
5. **Trial-end offer is 50% off the first year, Pro annual only.** It takes checkout's single discount slot ahead of `STRIPE_ANNUAL_DISCOUNT_COUPON_ID`; it does not stack.
6. **Unconverted leads are deleted after 180 days** (measured from their last memo request). The memo link expires on the same clock.
7. `ABANDONED_CART_COUPON_CODE` is out of scope (it is not in the code). "Day N" means the first 14:00 UTC cron run on or after day N.

## 4. What was built

Built first on a checkout that turned out to be 681 commits behind `main`, then replayed onto current `main` (branch `funnel/memo-capture-and-sequences`). Sections 1 and 2 above describe the older tree; where they differ from `main`, this section is right.

| Feature | Flag | Main files |
| --- | --- | --- |
| A. Memo capture | `FUNNEL_MEMO_CAPTURE` | `app/actions/memo-lead-capture.ts`, `components/marketing/memo-email-capture.tsx`, `app/memo/[token]/page.tsx`, `lib/memo-lead.ts`, `lib/memo-summary.ts`, `lib/email/memo-email.ts`, `lib/turnstile.ts` |
| B. Sequences | `FUNNEL_SEQUENCES` | `lib/funnel-sequences.ts` (pure scheduler), `lib/email/sequence-cron.ts`, `lib/email/send-sequence.ts`, `lib/email/render-sequence.ts`, `emails/lifecycle-content/sequences/*.json`, `lib/trial-end-offer.ts`, the lifecycle cron route |
| C. Upgrade card | `FUNNEL_UPGRADE_NUDGE` | `components/marketing/trial-upgrade-nudge.tsx`, `app/actions/product-evaluation.ts` |
| D. Shared-deal CTA | none | Already on `main`: the "Analyze a deal free" block in `components/investcalc/read-only-analysis-view.tsx`, UTM-tagged. Nothing was added. |

Things worth knowing:

- **The sequences use `main`'s lifecycle send gate** (`lib/email/lifecycle-compliance.ts`): nothing sends unless `LIFECYCLE_EMAILS_MODE=live`, `EMAIL_POSTAL_ADDRESS` is set, and the unsubscribe link can be signed. They also use its opt-out read, its pacing and its 429 handling (`lib/email/resend-pacing.ts`).
- **The trial-end offer is 50% off the first year of Pro annual** (founder decision 2026-10-03; it replaced "two months free"). The coupon needs no code in the URL: it is applied at Pro annual checkout when the buyer's own `product_evaluations.started_at` is 18–23 days old. T4/T5 mention the offer only when `TRIAL_END_ANNUAL_COUPON` is set, and only in the investor variant. The Stripe coupon must be 50% off, applied once.
- **The memo (L0) sends whenever `FUNNEL_MEMO_CAPTURE` is on**, regardless of the lifecycle mode and without a postal address: the visitor asked for it. L1–L4 and T0–T6 go through the send gate.
- **Agent framing** comes from `user_metadata.signup_intent`, set when sign-up carries `?plan=agent-pro`. Google sign-ups do not carry it and get the investor copy. Leads get agent copy when the capture's referrer is `/for-agents` or its `utm_campaign` contains "agent".
- **Unsubscribe.** Accounts use the signed account opt-out every lifecycle email carries (`profiles.marketing_opt_out`); leads use the hashed drip link (`email_suppressions`). A lead email's footer says why they got it and has no account-settings link.
- **Catch-up guard.** A step can send from its day through two days later; after that it is retired, never sent late. Turning the flag on cannot replay the sequence at old accounts.
- **The memo page** reuses `SharedDealShell`. It is `noindex`, `no-referrer`, never cached, disallowed in `robots.ts`, and treated as a sensitive route by the analytics and Sentry URL scrubbers. `next.config.mjs` was not edited (it is in the build-integrity manifest).
- **L1's CTA** ("re-run with your assumptions") lands on `/analyze`. A lead who changes the inputs in the same browser within 21 days has used the no-signup decision and will be asked to create a free account.
- **The upgrade card** renders above the result of the third trial deal, and in place of a result when a fourth is refused.

Not done: Playwright coverage for the new form and card; a preview entry in `/admin/email-preview` for the sequence emails (the cron's `dry` mode returns subjects and the first email's HTML).

## 5. Rollout order

1. Apply `supabase/migrations/20261003120000_memo_leads.sql`, then `20261003121000_lifecycle_email_log_leads.sql`.
2. Set `TURNSTILE_SECRET_KEY` if the Turnstile site key is set. Create the Stripe coupon (50% off, once) and set `TRIAL_END_ANNUAL_COUPON`.
3. `FUNNEL_MEMO_CAPTURE=on`, redeploy, request a memo to your own address.
4. `FUNNEL_UPGRADE_NUDGE=on` is independent and can go any time.
5. Sequences need `EMAIL_POSTAL_ADDRESS` (a PO box or virtual mailbox is enough). Then `FUNNEL_SEQUENCES=on` with `LIFECYCLE_EMAILS_MODE=dry`; call the cron and read the `sequences` block. Then `live`.
