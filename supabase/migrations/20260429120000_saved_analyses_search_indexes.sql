create index if not exists idx_saved_analyses_address
  on public.saved_analyses (address);

create index if not exists idx_saved_analyses_title
  on public.saved_analyses (title);

create index if not exists idx_saved_analyses_property_type
  on public.saved_analyses (property_type);

create index if not exists idx_saved_analyses_search
  on public.saved_analyses
  using gin (
    to_tsvector(
      'simple',
      coalesce(address, '') || ' ' || coalesce(title, '') || ' ' || coalesce(property_type::text, '')
    )
  );
