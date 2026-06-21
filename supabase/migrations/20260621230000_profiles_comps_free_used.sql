-- One free comps lookup for free users.
--
-- Free users get a single live RentCast comps lookup as a taste, then are
-- gated to Pro. This flag tracks whether they've spent it. Cached views do
-- NOT set this (they cost no API quota); only a live lookup does. Default
-- false = freebie available.

alter table public.profiles
  add column if not exists comps_free_used boolean not null default false;

comment on column public.profiles.comps_free_used is
  'True once a free user has spent their single free RentCast comps lookup. Pro users are unlimited and ignore this.';
