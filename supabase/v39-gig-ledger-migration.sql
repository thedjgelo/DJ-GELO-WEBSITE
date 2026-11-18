-- DJ GELO v39 master gig ledger migration
-- Run once after v37. Safe to run again.

alter table public.bookings
  alter column client_email drop not null;

alter table public.bookings
  add column if not exists gig_kind text not null default 'dj_gig',
  add column if not exists ticket_revenue numeric(10,2) not null default 0,
  add column if not exists tips_amount numeric(10,2) not null default 0,
  add column if not exists expenses_amount numeric(10,2) not null default 0,
  add column if not exists payment_method text;

do $$ begin
  alter table public.bookings add constraint bookings_gig_kind_check check (gig_kind in ('dj_gig','b2tb_event'));
exception when duplicate_object then null; end $$;

-- Existing bookings remain regular DJ gigs by default.
-- You can change any self-produced event to B2TB Event from the admin editor.
