# Weekly Digest Content Files — Archived

> **These files do not send automatically.** The founder canceled the marketing
> newsletter on 2026-07-15, the former Resend audience was deleted, and the
> weekly-digest cron was removed from `vercel.json`.

The JSON files in this directory are retained historical content. Their
`YYYY-MM-DD.json` filenames and `publishedAt` values describe the former content
date only; neither field authorizes or triggers a send.

Do not add a production schedule, run the broadcast-scheduling scripts, invoke
the retired digest route against a real audience, recreate an audience, or
publish these drafts without explicit founder approval. See
`docs/NEWSLETTER-SCHEDULING.md` for the revival gate.

## Retained schema reference

Historical files generally contain:

- `subject` and `preheader`;
- `publishedAt` and optional `weekLabel`;
- `marketSnapshot.headline`, `.body`, and `.stats[]`;
- one to three `dealSpotter[]` entries; and
- optional `blogFeature`, `qa`, and `shipNote` sections.

The schema is not a claim that the content is current or approved. Before any
future use, every market statistic, example, recommendation, product feature,
price, plan entitlement, trial term, and proof statement must be revalidated
against dated sources and the released product. Illustrative examples must be
labeled as such, and preliminary screens must not be presented as appraisals,
lender approvals, or investment recommendations.

Lifecycle emails, rate and rent alerts, and the per-user weekly summary are
separate systems and are not governed by these archived newsletter files.
