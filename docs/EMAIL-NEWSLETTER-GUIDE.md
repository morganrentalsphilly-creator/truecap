# Weekly Email Newsletter — Archived Workflow

> **Canceled system — not built, scheduled, or authorized for current sends.**
> The founder canceled the newsletter on 2026-07-15. The former Resend audience
> was deleted, newsletter signup surfaces are dark, and
> `/api/cron/send-weekly-digest` is absent from `vercel.json`.

This file replaces the former Monday/Tuesday scheduling instructions, which
contradicted each other and no longer described production. There is currently
no weekly marketing-newsletter cron. Content files under `emails/content/` are
archived drafts and do not auto-send.

## Current state

| Surface                                                    | Current status                              |
| ---------------------------------------------------------- | ------------------------------------------- |
| Marketing-newsletter signup                                | Dark                                        |
| Former Resend audience                                     | Deleted                                     |
| Weekly-digest Vercel cron                                  | Removed                                     |
| `/api/cron/send-weekly-digest` code                        | Retained only for possible approved revival |
| `emails/content/*.json`                                    | Historical content; no send authority       |
| Lifecycle, rate/rent alert, per-user weekly-summary emails | Separate systems                            |

Do not register a weekly-digest cron, schedule broadcasts, invoke the retained
route against a real audience, import contacts, or restore signup surfaces
without the founder's explicit approval. Do not infer approval from a content
date, an environment variable, a working preview, or the retained route.

## Safe maintenance boundary

Read-only inspection and local rendering are allowed for maintenance. Treat all
historical copy as unapproved until it has been checked for:

- dated, authoritative sources for market, tax, rate, insurance, and outcome
  claims;
- current prices, no-card evaluation terms, and plan entitlements;
- released-versus-gated feature status;
- explicit labels on hypothetical examples; and
- preliminary-screen limitations, including no appraisal, lender approval, or
  investment recommendation.

Do not test with the deleted or a reconstructed production audience. A route
that can create a broadcast is a sending surface even when its cron is absent.

## Revival checklist

Only after explicit founder approval:

1. define cadence and obtain matching subscriber consent;
2. approve sender identity, reply handling, physical address, privacy, and
   unsubscribe behavior with appropriate compliance review;
3. create a permissioned audience rather than reconstructing the deleted list;
4. audit every retained content file against current sources and product facts;
5. test render and delivery using a non-production audience;
6. review idempotency, authorization, observability, failure handling, and the
   kill switch; and
7. add an intentional, reviewed `vercel.json` schedule only after the preceding
   gates pass.

Until then, the correct operating procedure is to leave the newsletter canceled.
