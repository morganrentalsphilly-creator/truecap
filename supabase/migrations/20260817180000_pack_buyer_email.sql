-- SURFACED FOR REVIEW — do not let tooling auto-apply.
-- Idempotent; safe to run over a partially-applied state.
--
-- WHY: the Grand Slam Offer rollout (founder-approved 2026-08-17) captures
-- the Deal Decision Pack buyer's checkout email. Stripe always collects one
-- for payment-mode sessions, but the app discarded it, so Pack buyers were
-- unreachable for the credit-countdown email and receipt follow-ups.
-- verifyOneTimePdfPaymentAction now stores session.customer_details.email
-- here at consumption time (best-effort; the code degrades gracefully with
-- a column-missing retry until this migration is applied).
--
-- The existing integrity trigger governs the checkout-binding, purchase-fact,
-- and pro_credit_* columns; buyer_email is deliberately outside it — it is
-- contact metadata, not a purchase fact.

alter table public.one_time_pdf_purchase_claims
  add column if not exists buyer_email text;

comment on column public.one_time_pdf_purchase_claims.buyer_email is
  'Stripe checkout customer email, captured at claim consumption (2026-08-17 offer rollout). Contact metadata only — not a purchase fact.';

-- Verification: expect 1 row.
select count(*) as buyer_email_column_present
from information_schema.columns
where table_schema = 'public'
  and table_name = 'one_time_pdf_purchase_claims'
  and column_name = 'buyer_email';
