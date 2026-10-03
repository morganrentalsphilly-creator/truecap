# Funnel analytics

One typed helper, `track()` in `lib/analytics/site-events.ts`, fans every funnel event out to Vercel Web Analytics (cookieless, always on), to GTM/GA4 through `window.dataLayer` (only after the visitor accepts cookies), and to an in-page buffer (`window.__tcEvents`) that browser tests read. Server-only events use `trackServer()` in `lib/analytics/site-events-server.ts`. PostHog keeps its own richer event stream through `trackEvent()`; the two are deliberately separate so the funnel below stays small and stable.

Properties are minimal and never personal: no addresses, emails, prices, or underwriting inputs.

## Events

| Event | Fires where | Properties |
| --- | --- | --- |
| `analysis_started` | The analyzer's Run handler (`components/investcalc/investcalc-page.tsx`), for every run including the sample | `source` (hero / analyze_page / dashboard / sample), `input_type` (address / listing_url / sample / manual) |
| `analysis_completed` | Same handler, once the result is committed to visible state | `verdict` (the tier label), `has_ceiling` |
| `sample_viewed` | The `/analyze?sample=1` entry, which the hero's "See the sample deal" link opens, and the analyzer's own sample button. The hero link itself sends nothing, so one click counts once | `source` (link / analyzer) |
| `signup_started` | Sign-up form submit; Google button click | `method` (email / google) |
| `signup_completed` | Sign-up form accepted (email; before the confirmation link is clicked, so unconfirmed accounts are included); OAuth callback (google, server) | `method` |
| `trial_started` | Right after `signup_completed` — every new account starts the no-card free trial | `method` |
| `checkout_started` | Pricing plan buttons before the Stripe redirect | `plan` (plan slug), `interval` (monthly / annual) |
| `checkout_completed` | Stripe webhook, server-side, once per successfully synced checkout | `plan`, `interval` |
| `report_exported` | Analyzer PDF export and the saved-deal PDF download | `report_type` |
| `deal_saved` | First save of a new deal (not subsequent updates) | `property_type` |
| `compare_used` | A completed side-by-side comparison | `count_bucket` |
| `testimonial_prompt_shown` | The in-product testimonial prompt, once per user | `source` |
| `testimonial_submitted` | The prompt's submit succeeded | `consent` |
| `cookie_consent_choice` | The cookie banner's Accept or Reject (the X and Escape count as reject), from `components/analytics/vercel-analytics.tsx`, which listens for the banner's decision event. Not sent from a document where Vercel Analytics is off: share, portal and embed routes, and any URL that carries a sensitive query parameter (for example `price`, `rent`, `address`, `code`, `token`, or a `next` that is not one of the two counted values described under Consent), until the next full page load | `choice` (granted / denied) |
| `primary_cta_clicked` | A click on a primary call to action: the hero and final address forms, the sticky bar, `AnalyzeCtaLink`, `ScrollToFormButton`, and the analyzer button on content pages (`TrackedContentCtaLink`) | `source` (hero_address / hero_listing / final_address / final_listing / sticky_bar / content_inline_cta / the link's own `analyticsSource`, for example vs_hero) |

## The five weekly ratios

Read Vercel Analytics (Custom Events) or GA4 (the same names arrive through `dataLayer` once GTM forwards them) for the trailing seven days and compute:

1. visit → `analysis_started` — of everyone who landed, how many ran a number.
2. `analysis_started` → `analysis_completed` — how many runs finished (drop = validation friction or missing inputs).
3. `analysis_completed` → `signup_completed` — the free-to-account step.
4. `signup_completed` → `trial_started` — should be ~100 %; anything lower means the trial grant failed.
5. `trial_started` → `checkout_completed` — the paid step.

`visit` is Vercel's page-view count for `/` plus `/analyze`.

## Consent

Vercel Web Analytics is cookieless and runs on every page except the sensitive locations in `lib/sensitive-url.ts`: share, portal and embed routes, and any URL that carries a sensitive query parameter (`components/analytics/vercel-analytics.tsx`, which also strips sensitive URLs and removes the ad click ids `gclid`, `gbraid`, `wbraid`, `dclid` and `msclkid` from the page URL in every analytics payload; `utm_*` is kept). `lib/sentry/client-init.ts`, `sentry.server.config.ts` and `sentry.edge.config.ts` do the same for the Sentry event and span fields the strip walks (`lib/sentry/ad-click-ids.ts`), in the browser, on the server and at the edge. That walk includes stack frames, where an inline-script error names the page URL. In both transports a click id carried inside another parameter's value (`return_to=%2Fpricing%3Fgclid%3D...`) is removed as well; a value with a malformed `%` sequence is not decoded, so a click id percent-encoded inside it stays. The landing request itself, and the `Referer` header of same-origin requests from that page, still reach Vercel, which hosts the site, with the full URL. GTM and the Google Ads tag load only after the visitor accepts cookies in the banner (`components/analytics/google-measurement.tsx`), and `track()` pushes to `dataLayer` only when the stored decision is `granted`. Rejecting keeps the funnel measurable through Vercel alone.

Sign-up and login URLs that carry `next` are the one exception to the sensitive-parameter rule, and only for Vercel Web Analytics. `next` is on the sensitive list because it can nest a deal URL, a share token or a search. Every in-product sign-up prompt adds it, so those pages used to load no analytics at all. `isCountedNextLocation` in `lib/sensitive-url.ts` keeps the Vercel mount on when all of these hold: the path is exactly `/auth/sign-up` or `/auth/login`; there is exactly one `next`; its decoded value is exactly `/dashboard/new` or `/pricing?checkout=<plan>#plans`, where `<plan>` is one of `CHECKOUT_PLAN_SLUGS` in `lib/pricing-checkout-resume.ts`; and no other sensitive parameter is present. The comparison is whole-string equality, so a prefix, another origin, a coupon on the pricing return or any other value leaves analytics off as before. `next` is still removed from every URL that is reported (`sanitizeSensitiveUrl`). GTM, the Google Ads tag and PostHog use the strict rule and stay off on every `next` URL, so `signup_started`, `signup_completed` and `trial_started` from those pages reach Vercel only. `lib/__tests__/sensitive-url.test.ts` pins both lists.

`cookie_consent_choice` is how the consent rate is read: granted divided by granted plus denied, over the same seven days. A visitor who never answers the banner sends neither, and an answer given on one of the pages above is not counted.

## Ad URLs

Every ad's landing URL should carry `utm_medium`, written exactly as below. Add it through the ad platform's URL-parameter setting (in Google Ads, the campaign's Final URL suffix), not inside the Final URL itself, which stays free of parameters:

| Where the ad runs | `utm_medium` | First-touch source it is stored as |
| --- | --- | --- |
| Search ads (Google Ads, Microsoft Ads) | `cpc` | `paid_search` |
| Meta ads (Facebook, Instagram) | `paid_social` | `paid_social` |

The convention follows what `classifyFirstTouchReferralSource` in `lib/first-touch.ts` already does with a landing. Its rules, in the order the code applies them:

1. A referrer on a sign-in host (`accounts.google.*`, `myaccount.google.*`, `accounts.youtube.*`, `supabase.co` and its subdomains) is a sign-in round trip, not a landing. Nothing is recorded.
2. A click id in the query (`gclid`, `gbraid`, `wbraid`, `dclid` or `msclkid`; only its presence is read) gives `paid_search`, whatever the referrer or `utm_medium` says.
3. `utm_medium` of `cpc`, `ppc`, `paid_search` or `paidsearch` gives `paid_search`.
4. `utm_medium` of `paid_social`, `paidsocial` or `social_paid` gives `paid_social`.
5. `email` or `newsletter` gives `email`. `organic` gives `organic_ai` when the referrer is an AI host and `organic_search` otherwise. `social` gives `organic_social`. `referral` gives `external_referral`.
6. Any other non-empty `utm_medium` gives `campaign`.
7. With no `utm_medium`, the referrer host decides. No referrer, or our own host, is `direct`. A webmail host is `email`, an AI host `organic_ai`, a search host `organic_search`, a social host `organic_social`, and any other host `external_referral`.

`recordFirstTouchLanding` in `lib/analytics.ts` lower-cases the value and compares it whole. It does not trim it, so `cpc` followed by a space, or `paid-social`, falls to rule 6 and is stored as `campaign`.

Why each value matters:

- Search. With auto-tagging on, the ad platform adds a click id and rule 2 already stores the landing as `paid_search`. `utm_medium=cpc` gives the same answer when the click id is not there, for example with auto-tagging switched off.
- Meta. `fbclid` is not read: it is not in `AD_CLICK_ID_PARAMS`, and `lib/__tests__/first-touch.test.ts` pins that, with the note that Facebook adds it to unpaid links too. That rule is unchanged. A Meta ad click without `utm_medium` therefore falls to rule 7. The audit measured it on production on 2026-10-01: `organic_social` with an `l.facebook.com` referrer. With no referrer, rule 7 stores it as `direct`. `utm_medium=paid_social` is what stores a Meta ad click as `paid_social`.

What the convention does not give you:

- The first-touch record holds a source category and a landing section (plus a version number in app_metadata), nothing else: the `tc_ft` cookie once cookies are accepted, then `app_metadata.tc_first_touch` at sign-up. `utm_source`, `utm_campaign`, `utm_content` and `utm_term` are never read or stored by it. The campaign and the keyword are not kept.
- Nothing in the repository counts paid sign-ups. `seo/scripts/signups.ts` reads `app_metadata.tc_first_touch` back and counts `organic_search` and `organic_ai` only. The one other reader is subscription checkout, described in the next point. The sign-up paths read the `tc_ft` cookie to write that record (`app/actions/auth.ts`, and `app/auth/callback/route.ts` for a new Google account). The source category also goes to PostHog as `referral_source`: from the browser on every event whose allowlist in `lib/analytics-event-dictionary.ts` names it, `account_created` included (`captureRaw` in `lib/analytics.ts`, read from the tab's session record), and from the server on `account_created` and `product_evaluation_started` for a new Google account (`app/auth/callback/route.ts`). PostHog is on hold: the browser sends nothing while `NEXT_PUBLIC_POSTHOG_KEY` is unset (`initAnalytics` in `lib/analytics.ts`; the key is absent on purpose, `lib/sentry/self-noise.ts`), and the server sends only when `POSTHOG_API_KEY` is set (`lib/posthog-server.ts`).
- Revenue by channel in Stripe. When a subscription Checkout Session is created, `createCheckoutSessionAction` in `app/actions/billing.ts` copies the stored source category into the subscription's metadata as `first_touch_source` (`firstTouchSubscriptionMetadata` in `lib/first-touch-server.ts`, read from the signed-in account's `app_metadata`, which only the service role can write). The value is one of the nine categories in `FIRST_TOUCH_REFERRAL_SOURCES`: `direct`, `organic_search`, `organic_ai`, `organic_social`, `paid_search`, `paid_social`, `email`, `external_referral`, `campaign`. The key is absent when the account has no record (the visitor did not accept cookies before signing up, or signed up before the record was introduced) or when the stored value is not one of those nine. The landing section, a click id, a URL and `utm_*` text are never copied. It is set on subscriptions created after this change only; the Checkout Session's own metadata and the Stripe customer are unchanged, and nothing about it is sent to Google or PostHog. `lib/__tests__/checkout-first-touch-metadata.test.ts` pins this.
- The other `utm_*` parameters are free to use. They are kept in the page URL sent to Vercel Web Analytics; the click ids and the sensitive parameters listed in `lib/sensitive-url.ts` are removed from it (see Consent above).

## Verifying locally

Run the site, open the console after a sample run, and read `window.__tcEvents`. The Playwright spec `e2e/site-overhaul-conversion.spec.ts` asserts `analysis_started` and `analysis_completed` on the sample flow; `lib/__tests__/stripe-webhook-route-binding.test.ts` asserts `checkout_completed` from the webhook.
