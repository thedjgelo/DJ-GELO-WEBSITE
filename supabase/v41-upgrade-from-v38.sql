-- DJ GELO v41 complete upgrade from v38
-- Run once in Supabase SQL Editor. Safe/idempotent where noted.


-- ===== supabase/v39-gig-ledger-migration.sql =====

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


-- ===== supabase/v40-historical-ledger-migration.sql =====

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


-- ===== supabase/v41-stable-base-migration.sql =====

-- DJ GELO v41 stable-base migration
-- Run after v37, v39 and v40 migrations.

alter table public.events
  add column if not exists archive_visible boolean not null default true,
  add column if not exists public_category text not null default 'other';

do $$ begin
  alter table public.events add constraint events_public_category_check
    check (public_category in ('club','concert','school','b2tb','other'));
exception when duplicate_object then null; end $$;

update public.events
set public_category = case
  when event_brand = 'b2tb' then 'b2tb'
  when lower(coalesce(event_type,'')) ~ 'concert|opening' then 'concert'
  when lower(coalesce(event_type,'') || ' ' || coalesce(name,'')) ~ 'school|prom|homecoming|winter ball|college' then 'school'
  when lower(coalesce(event_type,'') || ' ' || coalesce(name,'')) ~ 'club|night|lounge|bar' then 'club'
  else coalesce(nullif(public_category,''),'other')
end;

alter table public.bookings
  add column if not exists archived boolean not null default false,
  add column if not exists contract_status text not null default 'not_needed',
  add column if not exists b2tb_dj_costs numeric(10,2) not null default 0,
  add column if not exists b2tb_staff_costs numeric(10,2) not null default 0,
  add column if not exists b2tb_venue_costs numeric(10,2) not null default 0,
  add column if not exists b2tb_marketing_costs numeric(10,2) not null default 0,
  add column if not exists b2tb_other_costs numeric(10,2) not null default 0,
  add column if not exists client_id uuid;

do $$ begin
  alter table public.bookings add constraint bookings_contract_status_check
    check (contract_status in ('not_needed','not_sent','sent','signed'));
exception when duplicate_object then null; end $$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  alter table public.bookings
    add constraint bookings_client_id_fkey foreign key (client_id) references public.clients(id) on delete set null;
exception when duplicate_object then null; end $$;

drop trigger if exists clients_updated_at on public.clients;
create trigger clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

alter table public.clients enable row level security;
drop policy if exists "admin manage clients" on public.clients;
create policy "admin manage clients"
on public.clients for all to authenticated
using ((auth.jwt() ->> 'email') = 'thedjgelo@gmail.com')
with check ((auth.jwt() ->> 'email') = 'thedjgelo@gmail.com');

grant select, insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;


-- ===== supabase/v40-import-historical-gigs.sql =====

-- DJ GELO historical gig import (v40)
-- Safe to rerun: records upsert by historical_key.

insert into public.bookings (
  historical_key,
  client_name,
  client_email,
  client_phone,
  gig_kind,
  status,
  event_type,
  event_date,
  location,
  event_hours,
  guest_count,
  agreed_price,
  deposit_amount,
  paid_amount,
  ticket_revenue,
  tips_amount,
  expenses_amount,
  payment_method,
  notes,
  data_quality,
  include_financial_totals,
  source_notes
) values
  ('hist-2023-05-25-ssfhs-rally', 'SSFHS Rally', null, null, 'dj_gig', 'completed', 'School Event', '2023-05-25', 'South San Francisco High School', null, null, 100, 0, 100, 0, 0, 0, null, 'Invoice note references making the rally memorable. Exact event date remains unconfirmed.', 'estimated', true, 'Invoice: invoice.pdf; actual event date not printed, date inferred from invoice due date 2023-05-25.'),
  ('hist-2024-02-03-ssfhs-winter-ball', 'SSFHS Winter Ball', null, null, 'dj_gig', 'completed', 'School Event', '2024-02-03', 'South San Francisco High School', null, null, 500, 0, 500, 0, 0, 0, null, null, 'complete', true, 'Invoice #20240203 + user confirmation that this was Winter Ball.'),
  ('hist-2025-01-25-ssfhs-winter-ball', 'SSFHS Winter Ball', null, null, 'dj_gig', 'completed', 'School Event', '2025-01-25', 'South San Francisco High School', null, null, 500, 0, 500, 0, 0, 0, null, null, 'complete', true, 'Invoice #20250125 + user confirmation that this was Winter Ball.'),
  ('hist-2025-09-27-college-night-market', 'College Night Market', null, null, 'dj_gig', 'completed', 'School / Community Event', '2025-09-27', 'San Jose, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram feed post: College Night Market hosted by Culture Night Market / EMLN Exclusive / Popup SJ, 9/27.'),
  ('hist-2025-09-27-temaki-bar-1-year-anniversary', 'Temaki Bar 1-Year Anniversary', null, null, 'dj_gig', 'completed', 'Bar / Club', '2025-09-27', 'Temaki Bar, San Jose, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram feed post explicitly says debut at Temaki Bar 1-year anniversary on 9/27.'),
  ('hist-2025-10-02-birthday-party', 'Birthday Party', null, null, 'dj_gig', 'completed', 'Private Event', '2025-10-02', '226 Thrift St, San Francisco, CA', '6:00 PM - 11:00 PM', null, 700, 0, 700, 0, 0, 0, null, null, 'complete', true, 'Invoice: DJ INVOICE.pdf'),
  ('hist-2025-10-04-ssfhs-homecoming', 'SSFHS Homecoming', null, null, 'dj_gig', 'completed', 'School Event', '2025-10-04', 'South San Francisco High School', null, null, 500, 0, 500, 0, 0, 0, null, null, 'complete', true, 'Invoice #20251004 + user confirmation that this was Homecoming.'),
  ('hist-2025-10-09-delta-gamma-fundraiser', 'Delta Gamma Fundraiser', null, null, 'dj_gig', 'completed', 'School / Greek Event', '2025-10-09', '360 E Reed St, San Jose, CA', '6:00 PM - 8:30 PM', null, 250, 0, 250, 0, 0, 0, 'Check', null, 'complete', true, 'Invoice: Delta Gamma Invoice.pdf + Instagram story.'),
  ('hist-2025-10-23-kalan-frfr-at-nexus', 'Kalan.FrFr at Nexus', null, null, 'dj_gig', 'completed', 'Concert / Opening Set', '2025-10-23', 'Nexus, San Jose, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram post: Kalan.FrFr 10/23 hosted by Nexus / Five Percent Studios.'),
  ('hist-2025-10-24-outdoor-party', 'Outdoor Party', null, null, 'dj_gig', 'completed', 'Private Event', '2025-10-24', '2635 Boren Drive', '11:00 PM - 1:00 AM', null, 300, 0, 300, 0, 0, 0, 'Zelle', null, 'complete', true, 'Invoice: DJ INVOICE 10:24:25.pdf'),
  ('hist-2025-10-28-tap-in-tuesdays', 'Tap In Tuesdays', null, null, 'dj_gig', 'completed', 'Club', '2025-10-28', 'The Valencia Room, San Francisco, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram post/story: Tap In Tuesdays at Valencia Room, sounds by DJ GELO and others.'),
  ('hist-2025-11-22-yhung-t-o-sob-x-rbe', 'Yhung T.O / SOB x RBE', null, null, 'dj_gig', 'completed', 'Concert / Opening Set', '2025-11-22', 'Tiki Pete, San Jose, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram post later states opened for Yhung T.O / SOB x RBE on 11/22/25 in San Jose; reel promoted Tiki Pete.'),
  ('hist-2025-11-29-debut', 'Debut', null, null, 'dj_gig', 'completed', 'Debut / Birthday', '2025-11-29', 'Newark DoubleTree', '6:00 PM - 11:00 PM', null, 700, 0, 700, 0, 0, 0, null, null, 'complete', true, 'Invoice: DJ DEBUT INVOICE.pdf'),
  ('hist-2025-12-14-private-christmas-party', 'Private Christmas Party', null, null, 'dj_gig', 'completed', 'Private / Corporate Event', '2025-12-14', 'The Ameswell Hotel, Mountain View', '5:00 PM - 10:00 PM', null, 950, 0, 950, 0, 0, 0, 'Check', null, 'complete', true, 'Invoice: Ameswell Hotel Invoice.pdf + user confirmation.'),
  ('hist-2026-01-02-new-year-party-club-event', 'New Year Party / Club Event', null, null, 'dj_gig', 'completed', 'Club / Venue Event', '2026-01-02', '739 Bryant St, San Francisco, CA', null, null, 400, 200, 400, 0, 0, 0, 'Zelle', null, 'complete', true, 'Invoice: INVOICE AND SERVICE AGREEMENT 1:2:26.pdf'),
  ('hist-2026-01-16-the-bayz-backyard-dj-battle', 'The Bayz Backyard DJ Battle', null, null, 'dj_gig', 'completed', 'DJ Battle / Club', '2026-01-16', 'Origin Nightclub, San Francisco, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram posts/reels documenting Bayz Backyard DJ Battle; date reconstructed from contemporaneous promotion.'),
  ('hist-2026-01-24-ssfhs-culture-fest', 'SSFHS Culture Fest', null, null, 'dj_gig', 'completed', 'School Event', '2026-01-24', 'South San Francisco High School', null, null, 500, 0, 500, 0, 0, 0, 'Check', null, 'complete', true, 'Invoice: DJ Invoice for SSFHS Culture Fest.pdf'),
  ('hist-2026-02-14-steady-r-b-valentine-s-event', 'Steady R&B Valentine’s Event', null, null, 'dj_gig', 'completed', 'R&B / Club', '2026-02-14', null, null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'partial', false, 'Instagram reels/stories: spinning for Steady R&B Valentine’s Day.'),
  ('hist-2026-02-27-the-bayz-backyard', 'The Bayz Backyard', null, null, 'dj_gig', 'completed', 'Club', '2026-02-27', 'Origin Nightclub, San Francisco, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram post explicitly says playing Bayz Backyard 2/27/26; follow-up reel describes 18+ club in SF.'),
  ('hist-2026-02-28-college-social-event', 'College Social Event', null, null, 'dj_gig', 'completed', 'School / Social Event', '2026-02-28', 'ICA Art Gallery, San Jose, CA', null, null, 175, 0, 175, 0, 0, 0, 'Zelle', null, 'complete', true, 'Invoice: DJ INVOICE 2:28.pdf + Instagram story indicating private event after club night.'),
  ('hist-2026-03-07-birthday-party-hella-mas', 'Birthday Party / Hella Mas', null, null, 'dj_gig', 'completed', 'Birthday / Private Event', '2026-03-07', 'Oakley, CA', '5:00 PM - 12:00 AM', null, 950, 475, 950, 0, 0, 0, 'Zelle', null, 'complete', true, 'Invoice: DJ INVOICE 3:7:26.pdf + Instagram + user confirmation these were the same event.'),
  ('hist-2026-03-21-neon-valley', 'Neon Valley', null, null, 'dj_gig', 'completed', 'Club', '2026-03-21', 'San Jose, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram stories/reels tagged Neon Valley around 3/21.'),
  ('hist-2026-03-28-abby-s-debut', 'Abby''s Debut', null, null, 'dj_gig', 'completed', 'Debut / Birthday', '2026-03-28', 'San Ramon Community Center, San Ramon, CA', '5:00 PM - 11:00 PM', null, 900, 450, 900, 0, 0, 0, 'Zelle', null, 'complete', true, 'Invoice: ABBY DEBUT INVOICE.pdf'),
  ('hist-2026-04-18-club-night-at-zo', 'Club Night at ZOË', null, null, 'dj_gig', 'completed', 'Club', '2026-04-18', 'ZOË Cocktail Bar, San Francisco, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram story tagged ZOË and DJ GELO on 4/18.'),
  ('hist-2026-04-19-steady-r-b', 'Steady R&B', null, null, 'dj_gig', 'completed', 'R&B / Club', '2026-04-19', null, null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'partial', false, 'Instagram story tagged Steady R&B and DJ GELO on 4/19.'),
  ('hist-2026-04-25-prom-on-a-yacht', 'Prom on a Yacht', null, null, 'dj_gig', 'completed', 'School Event / Prom', '2026-04-25', null, null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'partial', false, 'Instagram story explicitly thanks promoter for prom gig on a yacht.'),
  ('hist-2026-04-26-debut', 'Debut', null, null, 'dj_gig', 'completed', 'Debut / Birthday', '2026-04-26', 'AC Hotel Pleasanton', '5:00 PM - 8:00 PM', null, 800, 400, 800, 0, 0, 0, 'Zelle', null, 'complete', true, 'Invoice: DJ INVOICE 4:26:26.pdf + Instagram story.'),
  ('hist-2026-05-01-invite-only-dayger', 'Invite Only Dayger', null, null, 'dj_gig', 'completed', 'Day Party', '2026-05-01', 'San Jose, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram story schedule lists May 1 Invite Only Dayger, SJ.'),
  ('hist-2026-05-02-trevor-magno-birthday', 'Trevor Magno Birthday', null, null, 'dj_gig', 'completed', 'Birthday / Private Event', '2026-05-02', 'Belmont, CA', null, null, 900, 450, 900, 0, 0, 0, 'Zelle', null, 'complete', true, 'Invoices: DJ INVOICE 5:2:26.pdf and duplicate Magno, Trevor invoice 5.2.2026.pdf; counted once.'),
  ('hist-2026-05-07-27-north-community-pool-party', '27 North Community Pool Party', null, null, 'dj_gig', 'completed', 'School / Community Event', '2026-05-07', '27 North, 6th Street, San Jose, CA', '7:00 PM - 10:00 PM', null, 500, 250, 500, 0, 0, 0, 'Zelle', null, 'complete', true, 'Invoice: DJ INVOICE 5:7:26.pdf + Instagram schedule story.'),
  ('hist-2026-05-09-private-event', 'Private Event', null, null, 'dj_gig', 'completed', 'Private Event', '2026-05-09', null, null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'partial', false, 'Instagram story says setting up for private event, then club in SF that night. Financials unknown.'),
  ('hist-2026-05-09-southside-spirit-sf-bar-gig', 'Southside Spirit SF Bar Gig', null, null, 'dj_gig', 'completed', 'Bar / Club', '2026-05-09', 'Southside Spirit, San Francisco, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram story tagged @southsidesf; user identified this as Southside Spirit SF bar gig.'),
  ('hist-2026-05-10-project-x-event', 'Project X Event', null, null, 'dj_gig', 'completed', 'Club / Event', '2026-05-10', 'Pete Be Center, San Jose, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram schedule story lists Project X Event, Pete B Center.'),
  ('hist-2026-05-15-the-bayz-backyard', 'The Bayz Backyard', null, null, 'dj_gig', 'completed', 'Club', '2026-05-15', 'Origin Nightclub, San Francisco, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram story says Bayz Backyard in SF; user confirmed May 15 was Bayz Backyard.'),
  ('hist-2026-05-17-baby-shower', 'Baby Shower', null, null, 'dj_gig', 'completed', 'Private Event', '2026-05-17', 'Burlingame Community Center', '12:00 PM - 3:00 PM', null, 600, 300, 600, 0, 0, 0, 'Zelle', null, 'complete', true, 'Invoice: DJ INVOICE 6:20:26.pdf (event date inside invoice is 2026-05-17).'),
  ('hist-2026-05-22-fuze-club-gig', 'Fuze Club Gig', null, null, 'dj_gig', 'completed', 'Club', '2026-05-22', 'Fuze, San Jose, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram stories tagged Fuze that night.'),
  ('hist-2026-05-22-school-gig', 'School Gig', null, null, 'dj_gig', 'completed', 'School Event', '2026-05-22', null, null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'partial', false, 'Instagram story explicitly says school gig now, Fuze SJ tonight.'),
  ('hist-2026-05-30-san-rafael-hs-prom', 'San Rafael HS Prom', null, null, 'dj_gig', 'completed', 'School Event', '2026-05-30', 'Great American Music Hall, San Francisco, CA', null, null, 600, 0, 600, 0, 0, 0, 'Check', null, 'complete', true, 'Invoice: DJ INVOICE PROM.pdf + Instagram schedule story.'),
  ('hist-2026-06-20-live-dj-set-recording-at-zo', 'Live DJ Set Recording at ZOË', null, null, 'dj_gig', 'completed', 'Club / Live Set', '2026-06-20', 'ZOË Cocktail Bar, San Francisco, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram story + existing public event archive.'),
  ('hist-2026-07-02-neon-valley', 'Neon Valley', null, null, 'dj_gig', 'completed', 'Club', '2026-07-02', null, null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'partial', false, 'Instagram story tagged Neon Valley and DJ GELO.'),
  ('hist-2026-07-17-nothin-but-slapz', 'Nothin But Slapz', null, null, 'dj_gig', 'completed', 'Club', '2026-07-17', 'Delirium Cocktails, San Francisco, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram story tags Delirium Cocktails / Nothin But Slapz / DJ GELO.'),
  ('hist-2026-07-24-steady-r-b', 'Steady R&B', null, null, 'dj_gig', 'completed', 'R&B / Club', '2026-07-24', 'Fuze, San Jose, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram story tags Fuze / Steady R&B / DJ GELO.'),
  ('hist-2026-07-25-kalan-frfr-live-in-san-jose', 'Kalan.FrFr Live in San Jose', null, null, 'dj_gig', 'completed', 'Concert / Opening Set', '2026-07-25', 'Myth Lounge, San Jose, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram promotion and recap for Kalan.FrFr at Myth SJ.'),
  ('hist-2026-07-26-karri-day-party', 'Karri Day Party', null, null, 'dj_gig', 'completed', 'Day Party', '2026-07-26', 'Fuze, San Jose, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram stories/reel around @4karri day party; existing public archive.'),
  ('hist-2026-08-09-1800-rendezvous', '1800 Rendezvous', null, null, 'dj_gig', 'completed', 'Club / Event', '2026-08-09', null, null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'partial', false, 'Existing public event archive; Instagram-derived historical list.'),
  ('hist-2026-08-14-after-hrs', 'AFTER HRS', null, null, 'dj_gig', 'completed', 'Club', '2026-08-14', 'Fuze, San Jose, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram story: on at 11:30 @afterhrs.live @fuzesj.'),
  ('hist-2026-08-15-27-north-welcome-week', '27 North Welcome Week', null, null, 'dj_gig', 'completed', 'School / Community Event', '2026-08-15', '27 North, San Jose, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'User confirmed Aug 15 was the 27 North Welcome Week gig. Invoice not located in uploaded invoice archive, so financials left unknown.'),
  ('hist-2026-08-21-last-friday-night', 'Last Friday Night', null, null, 'dj_gig', 'completed', 'Club', '2026-08-21', 'Fuze, San Jose, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram post explicitly promotes Last Friday Night at Fuze on Aug 21.'),
  ('hist-2026-08-22-hometown-bowl', 'Hometown Bowl', null, null, 'dj_gig', 'completed', 'Club / Event', '2026-08-22', 'Hometown Bowl, South San Francisco, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Existing public event archive.'),
  ('hist-2026-08-28-kalan-frfr-at-pete-be-center', 'Kalan.FrFr at Pete Be Center', null, null, 'dj_gig', 'completed', 'Concert / Opening Set', '2026-08-28', 'Pete Be Center, San Jose, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram giveaway + stories; third time DJing for Kalan.FrFr.'),
  ('hist-2026-08-29-b2tb-back-2-the-2000s', 'B2TB: Back 2 the 2000s', null, null, 'b2tb_event', 'completed', 'B2TB / Club', '2026-08-29', 'ZOË Cocktail Bar, San Francisco, CA', null, null, 450, 0, 450, 0, 0, 0, 'Zelle', null, 'complete', true, 'Invoice: DJ-GELO-Invoice-09-01-2026-ZOE-Management.pdf + Instagram.'),
  ('hist-2026-09-18-university-preparatory-academy-homecoming', 'University Preparatory Academy Homecoming', null, null, 'dj_gig', 'completed', 'School Event', '2026-09-18', 'School Amphitheater, UPA High School', '6:00 PM - 9:00 PM', null, 950, 475, 950, 0, 0, 0, null, null, 'complete', true, 'Invoice: DJ-GELO-Invoice-08-27-2026 UPA.pdf + user confirmation all uploaded invoices were fully paid.'),
  ('hist-2026-09-19-nothin-but-slapz-at-hometown-bowl', 'Nothin But Slapz at Hometown Bowl', null, null, 'dj_gig', 'completed', 'Club / Event', '2026-09-19', 'Hometown Bowl, South San Francisco, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram story/reel tagged Nothin But Slapz / Hometown Bowl.'),
  ('hist-2026-09-26-sweet-17-birthday', 'Sweet 17 Birthday', null, null, 'dj_gig', 'completed', 'Birthday / Private Event', '2026-09-26', 'Blackhawk / Danville, CA', null, null, 1150, 575, 1150, 0, 0, 0, null, null, 'complete', true, 'Invoice: DJ-GELO-Invoice-09-09-2026-Sweet-17-Danville.pdf'),
  ('hist-2026-09-27-fuze-day-party', 'Fuze Day Party', null, null, 'dj_gig', 'completed', 'Day Party', '2026-09-27', 'Fuze, San Jose, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram story tagged MF.ZORG / Fuze; user confirmed this was a day party gig at Fuze.'),
  ('hist-2026-10-02-dj-performance-at-zo', 'DJ Performance at ZOË', null, null, 'dj_gig', 'completed', 'Club', '2026-10-02', 'ZOË Cocktail Bar, San Francisco, CA', null, null, 450, 0, 450, 0, 0, 0, 'Zelle', null, 'complete', true, 'Invoice: DJ-GELO-Invoice-10-06-2026-ZOE-Management.pdf'),
  ('hist-2026-10-03-san-rafael-hs-homecoming', 'San Rafael HS Homecoming', null, null, 'dj_gig', 'completed', 'School Event', '2026-10-03', 'San Rafael High School', '7:00 PM - 8:00 PM', null, 500, 250, 500, 0, 0, 0, 'Check', null, 'complete', true, 'Invoice: DJ-GELO-Invoice-08-19-2026-San-Rafael-High-School.pdf'),
  ('hist-2026-10-10-midway-sf-gig', 'Midway SF Gig', null, null, 'dj_gig', 'completed', 'Club', '2026-10-10', 'The Midway, San Francisco, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Instagram story tags The Midway SF / Pauz Presents.'),
  ('hist-2026-10-11-midway-sf-gig', 'Midway SF Gig', null, null, 'dj_gig', 'completed', 'Club', '2026-10-11', 'The Midway, San Francisco, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'User confirmed Oct 11 was a Midway SF gig; Instagram story that day tagged Yens/Fomo Room.'),
  ('hist-2026-10-24-st-timothy-annual-halloween-bash', 'St. Timothy Annual Halloween Bash', null, null, 'dj_gig', 'completed', 'School / Private Event', '2026-10-24', 'St. Timothy Catholic School', null, null, 975, 487.5, 975, 0, 0, 0, null, null, 'complete', true, 'Invoice: DJ-GELO-Invoice-10-01-2026-St-Timothy-Catholic-School.pdf'),
  ('hist-2026-10-25-after-hrs', 'AFTER HRS', null, null, 'dj_gig', 'completed', 'Club', '2026-10-25', null, null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'partial', false, 'Instagram-derived historical list; exact venue not retained in current evidence.'),
  ('hist-2026-11-06-back-2-the-booth-r-bay', 'Back 2 The Booth: R&Bay', null, null, 'b2tb_event', 'completed', 'B2TB / Club', '2026-11-06', 'ZOË Cocktail Bar, San Francisco, CA', null, null, 0, 0, 0, 0, 0, 0, null, 'Historical gig reconstructed from Instagram/user records. Financial amount not confirmed; excluded from financial totals.', 'complete', false, 'Existing public event archive; past as of 2026-11-17.')
on conflict (historical_key) where historical_key is not null do update set
  client_name = excluded.client_name,
  client_email = excluded.client_email,
  client_phone = excluded.client_phone,
  gig_kind = excluded.gig_kind,
  status = excluded.status,
  event_type = excluded.event_type,
  event_date = excluded.event_date,
  location = excluded.location,
  event_hours = excluded.event_hours,
  guest_count = excluded.guest_count,
  agreed_price = excluded.agreed_price,
  deposit_amount = excluded.deposit_amount,
  paid_amount = excluded.paid_amount,
  ticket_revenue = excluded.ticket_revenue,
  tips_amount = excluded.tips_amount,
  expenses_amount = excluded.expenses_amount,
  payment_method = excluded.payment_method,
  notes = excluded.notes,
  data_quality = excluded.data_quality,
  include_financial_totals = excluded.include_financial_totals,
  source_notes = excluded.source_notes;
