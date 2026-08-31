# Newsletter Setup — Archived

> **Do not activate this system.** The founder canceled the marketing
> newsletter on 2026-07-15. The former Resend audience was deleted,
> `NewsletterSignup` is intentionally dark, and the weekly-digest cron is not
> present in `vercel.json`.

The former setup steps for creating an audience, adding production environment
variables, redeploying signup forms, and sending monthly broadcasts have been
retired because they contradicted the current product decision. Retained
newsletter actions, components, routes, and templates are dormant machinery,
not authorization to restore the channel.

Do not:

- create or import a TrueCap Newsletter audience;
- set environment variables for the purpose of reviving newsletter capture;
- restore newsletter forms in the footer or blog;
- schedule or send a newsletter broadcast; or
- test a sending route against any real contact list.

An explicit founder decision is required before any revival. If approval is
given later, follow the consent, compliance, copy-review, test-audience,
authorization, idempotency, observability, and kill-switch gates in
`docs/NEWSLETTER-SCHEDULING.md`. Do not reuse the deleted audience or assume old
subscribers can be recovered.

Lifecycle onboarding emails, rate and rent alerts, and the per-user weekly
summary are separate systems; this cancellation does not describe their status.
