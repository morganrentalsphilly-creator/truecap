# Funnel analytics

One typed helper, `track()` in `lib/analytics/site-events.ts`, fans every funnel event out to Vercel Web Analytics (cookieless, always on), to GTM/GA4 through `window.dataLayer` (only after the visitor accepts cookies), and to an in-page buffer (`window.__tcEvents`) that browser tests read. Server-only events use `trackServer()` in `lib/analytics/site-events-server.ts`. PostHog keeps its own richer event stream through `trackEvent()`; the two are deliberately separate so the funnel below stays small and stable.

Properties are minimal and never personal: no addresses, emails, prices, or underwriting inputs.

## Events

| Event | Fires where | Properties |
| --- | --- | --- |
| `analysis_started` | The analyzer's Run handler (`components/investcalc/investcalc-page.tsx`), for every run including the sample | `source` (hero / analyze_page / dashboard / sample), `input_type` (address / listing_url / sample / manual) |
| `analysis_completed` | Same handler, once the result is committed to visible state | `verdict` (the tier label), `has_ceiling` |
| `sample_viewed` | Hero "See the sample deal →", the `/analyze?sample=1` entry, and the analyzer's own sample button | `source` (hero / link / analyzer) |
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

## The five weekly ratios

Read Vercel Analytics (Custom Events) or GA4 (the same names arrive through `dataLayer` once GTM forwards them) for the trailing seven days and compute:

1. visit → `analysis_started` — of everyone who landed, how many ran a number.
2. `analysis_started` → `analysis_completed` — how many runs finished (drop = validation friction or missing inputs).
3. `analysis_completed` → `signup_completed` — the free-to-account step.
4. `signup_completed` → `trial_started` — should be ~100 %; anything lower means the trial grant failed.
5. `trial_started` → `checkout_completed` — the paid step.

`visit` is Vercel's page-view count for `/` plus `/analyze`.

## Consent

Vercel Web Analytics is cookieless and runs on every page (`components/analytics/vercel-analytics.tsx`, which also strips sensitive URLs). GTM and the Google Ads tag load only after the visitor accepts cookies in the banner (`components/analytics/google-measurement.tsx`), and `track()` pushes to `dataLayer` only when the stored decision is `granted`. Rejecting keeps the funnel measurable through Vercel alone.

## Verifying locally

Run the site, open the console after a sample run, and read `window.__tcEvents`. The Playwright spec `e2e/site-overhaul-conversion.spec.ts` asserts `analysis_started` and `analysis_completed` on the sample flow; `lib/__tests__/stripe-webhook-route-binding.test.ts` asserts `checkout_completed` from the webhook.
