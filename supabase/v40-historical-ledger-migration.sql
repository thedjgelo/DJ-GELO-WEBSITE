-- DJ GELO v40 historical ledger support
-- Run once after the v39 gig ledger migration.

alter table public.bookings
  add column if not exists historical_key text,
  add column if not exists data_quality text not null default 'complete',
  add column if not exists include_financial_totals boolean not null default true,
  add column if not exists source_notes text;

do $$ begin
  alter table public.bookings add constraint bookings_data_quality_check
    check (data_quality in ('complete','partial','estimated'));
exception when duplicate_object then null; end $$;

create unique index if not exists bookings_historical_key_unique
  on public.bookings(historical_key)
  where historical_key is not null;
