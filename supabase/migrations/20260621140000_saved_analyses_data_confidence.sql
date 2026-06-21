-- Data confidence (per-input provenance) for saved deals.
--
-- Records where each enrichable input came from so the UI can show a
-- High / Medium / Low confidence badge with per-field detail
-- ("rent from HUD FMR, rate from FRED, verified <date>").
--
-- Shape (app-validated; see lib/data-confidence.ts):
--   {
--     "fields": {
--       "monthlyRent":    { "source": "hud-safmr", "fetchedAt": "2026", "verified": false, "detail": "Philadelphia County" },
--       "interestRate":   { "source": "fred", "fetchedAt": "2026-06-19", "verified": false },
--       "propertyTaxPct": { "source": "state-static", "verified": false }
--     },
--     "level": "high",          -- high | medium | low
--     "computedAt": "2026-06-21T…Z"
--   }
--
-- Populated from enrich-property meta at save time. Null for deals saved
-- before this feature (the badge falls back to a completeness read, and
-- the column is simply absent → treated as "unknown"). Not gated — a
-- transparency signal is free for everyone. No index: confidence is read
-- per-row alongside the deal, never filtered server-side.

alter table public.saved_analyses
  add column if not exists data_confidence jsonb;

comment on column public.saved_analyses.data_confidence is
  'Per-input provenance + overall confidence level (high/medium/low). Populated from enrich-property meta at save. See lib/data-confidence.ts.';
