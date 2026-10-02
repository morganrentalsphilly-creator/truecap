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
| `signup_completed` | Sign-up form success (email); OAuth callback (google, server) | `method` |
| `trial_started` | Right after `signup_completed` — every new account starts the no-card free trial | `method` |
| `checkout_started` | Pricing plan buttons before the Stripe redirect | `plan` (plan slug), `interval` (monthly / annual) |
| `checkout_completed` | Stripe webhook, server-side, once per successfully synced checkout | `plan`, `interval` |
| `report_exported` | Analyzer PDF export and the saved-deal PDF download | `report_type` |
| `deal_saved` | First save of a new deal (not subsequent updates) | `property_type` |
| `compare_used` | A completed side-by-side comparison | `count_bucket` |
| `testimonial_prompt_shown` | The in-product testimonial prompt, once per user | `source` |
| `testimonial_submitted` | The prompt's submit succeeded | `consent` |
| `cookie_consent_choice` | The cookie banner's Accept or Reject (the X and Escape count as reject), from `components/analytics/vercel-analytics.tsx`, which listens for the banner's decision event. Not sent from a document where Vercel Analytics is off: share, portal and embed routes, and any URL that carries a sensitive query parameter (for example `next` on the sign-up link, or `price`, `rent`, `address`, `code`, `token`), until the next full page load | `choice` (granted / denied) |
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

Vercel Web Analytics is cookieless and runs on every page (`components/analytics/vercel-analytics.tsx`, which also strips sensitive URLs and removes the ad click ids `gclid`, `gbraid`, `wbraid`, `dclid` and `msclkid` from the page URL in every analytics payload; `utm_*` is kept). `lib/sentry/client-init.ts` does the same for the browser Sentry event and span fields it walks, which leaves out stack frames. The landing request itself, and the `Referer` header of same-origin requests from that page, still reach Vercel, which hosts the site, with the full URL. GTM and the Google Ads tag load only after the visitor accepts cookies in the banner (`components/analytics/google-measurement.tsx`), and `track()` pushes to `dataLayer` only when the stored decision is `granted`. Rejecting keeps the funnel measurable through Vercel alone.

`cookie_consent_choice` is how the consent rate is read: granted divided by granted plus denied, over the same seven days. A visitor who never answers the banner sends neither, and an answer given on one of the pages above is not counted.

## Verifying locally

Run the site, open the console after a sample run, and read `window.__tcEvents`. The Playwright spec `e2e/site-overhaul-conversion.spec.ts` asserts `analysis_started` and `analysis_completed` on the sample flow; `lib/__tests__/stripe-webhook-route-binding.test.ts` asserts `checkout_completed` from the webhook.
