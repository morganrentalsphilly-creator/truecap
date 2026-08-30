# Newsletter Scheduling — Archived Runbook

> **Canceled system — do not schedule or send.** The founder canceled the
> newsletter on 2026-07-15. The former Resend audience was deleted, newsletter
> signup surfaces are dark, and `/api/cron/send-weekly-digest` is not registered
> in `vercel.json`.

There is no active weekly-newsletter cron, automatic fallback, or future send
queue. Files under `emails/content/` are retained historical content, not a
schedule. A filename or `publishedAt` date does not cause delivery.

Do not do any of the following without the founder's explicit approval:

- run `schedule-broadcasts` against a production Resend account;
- register `/api/cron/send-weekly-digest` in `vercel.json`;
- invoke the retired route against a real audience;
- recreate or import a newsletter audience;
- restore newsletter signup surfaces; or
- treat old content dates as send authorization.

The retained route, renderers, scripts, and JSON files document the former
system and may support a separately approved revival. They must not be described
as live or self-sending.

## Historical architecture

Before cancellation, the system combined short-window Resend scheduling with a
Tuesday digest route. That design is archived. It no longer provides a delivery
buffer because no weekly-digest cron is configured and the former audience no
longer exists.

Lifecycle onboarding emails, rate and rent alerts, and the per-user weekly
summary are separate systems. Their presence does not reactivate the marketing
newsletter.

## Revival gate

A revival requires a new, explicit founder decision and a fresh production
review. At minimum, that review must confirm:

1. permissioned audience collection and cadence consent;
2. signup, privacy, unsubscribe, sender-identity, and physical-address copy;
3. sourced and dated market claims plus current product/entitlement facts;
4. schedule ownership, idempotency, kill-switch behavior, and observability;
5. test delivery to a non-production audience before any real broadcast; and
6. an approved `vercel.json` change if recurring delivery is intentionally
   restored.

Until those gates are complete, leave the newsletter canceled.
