-- DJ GELO v37 CRM migration
-- Run once in Supabase SQL Editor after the original schema.

alter table public.events
  add column if not exists event_brand text not null default 'djgelo';

do $$ begin
  alter table public.events add constraint events_event_brand_check check (event_brand in ('djgelo','b2tb'));
exception when duplicate_object then null; end $$;

update public.events
set event_brand = 'b2tb'
where lower(name) like '%back 2 the booth%'
   or lower(name) like '%b2tb:%'
   or lower(name) like '%back in the bay%';

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid unique references public.inquiries(id) on delete set null,
  client_name text not null,
  client_email text not null,
  client_phone text,
  event_type text,
  event_date date not null,
  location text,
  event_hours text,
  guest_count text,
  agreed_price numeric(10,2) not null default 0,
  deposit_amount numeric(10,2) not null default 0,
  paid_amount numeric(10,2) not null default 0,
  status text not null default 'confirmed' check (status in ('confirmed','completed','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  invoice_number text not null unique,
  amount numeric(10,2) not null default 0,
  deposit_amount numeric(10,2) not null default 0,
  balance_due numeric(10,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','sent','paid')),
  storage_path text not null,
  file_name text not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists bookings_updated_at on public.bookings;
create trigger bookings_updated_at before update on public.bookings for each row execute function public.set_updated_at();
drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at before update on public.invoices for each row execute function public.set_updated_at();

alter table public.bookings enable row level security;
alter table public.invoices enable row level security;

drop policy if exists "admin manage bookings" on public.bookings;
create policy "admin manage bookings" on public.bookings for all to authenticated
using ((auth.jwt() ->> 'email') = 'thedjgelo@gmail.com')
with check ((auth.jwt() ->> 'email') = 'thedjgelo@gmail.com');

drop policy if exists "admin manage invoices" on public.invoices;
create policy "admin manage invoices" on public.invoices for all to authenticated
using ((auth.jwt() ->> 'email') = 'thedjgelo@gmail.com')
with check ((auth.jwt() ->> 'email') = 'thedjgelo@gmail.com');

grant select, insert, update, delete on public.bookings to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant all on public.bookings, public.invoices to service_role;

-- Private invoice PDF storage bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invoices', 'invoices', false, 10485760, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['application/pdf'];

drop policy if exists "admin read invoice files" on storage.objects;
create policy "admin read invoice files" on storage.objects for select to authenticated
using (bucket_id = 'invoices' and (auth.jwt() ->> 'email') = 'thedjgelo@gmail.com');

drop policy if exists "admin upload invoice files" on storage.objects;
create policy "admin upload invoice files" on storage.objects for insert to authenticated
with check (bucket_id = 'invoices' and (auth.jwt() ->> 'email') = 'thedjgelo@gmail.com');

drop policy if exists "admin update invoice files" on storage.objects;
create policy "admin update invoice files" on storage.objects for update to authenticated
using (bucket_id = 'invoices' and (auth.jwt() ->> 'email') = 'thedjgelo@gmail.com')
with check (bucket_id = 'invoices' and (auth.jwt() ->> 'email') = 'thedjgelo@gmail.com');

drop policy if exists "admin delete invoice files" on storage.objects;
create policy "admin delete invoice files" on storage.objects for delete to authenticated
using (bucket_id = 'invoices' and (auth.jwt() ->> 'email') = 'thedjgelo@gmail.com');
