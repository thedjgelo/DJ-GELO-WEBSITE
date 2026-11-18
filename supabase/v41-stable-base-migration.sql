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
