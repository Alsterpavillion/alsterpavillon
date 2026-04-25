-- M1.2 Events + Rooms.
-- Fails closed if M0/M1.1 baseline helpers or CRM tables are missing.

do $$
begin
  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'M1.2 precondition failed: public.set_updated_at() is missing';
  end if;

  if to_regprocedure('public.log_audit(text,text,text,jsonb,jsonb)') is null then
    raise exception 'M1.2 precondition failed: public.log_audit(text,text,text,jsonb,jsonb) is missing';
  end if;

  if to_regclass('public.companies') is null then
    raise exception 'M1.2 precondition failed: public.companies is missing';
  end if;

  if to_regclass('public.contacts') is null then
    raise exception 'M1.2 precondition failed: public.contacts is missing';
  end if;
end $$;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  capacity integer,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rooms_name_not_empty check (length(trim(name)) > 0),
  constraint rooms_slug_not_empty check (length(trim(slug)) > 0),
  constraint rooms_slug_unique unique (slug),
  constraint rooms_capacity_positive check (capacity is null or capacity > 0)
);

create index rooms_is_active_sort_order_idx on public.rooms (is_active, sort_order, name);
create index rooms_created_by_idx on public.rooms (created_by);

alter table public.rooms enable row level security;

revoke all on public.rooms from anon;
revoke all on public.rooms from public;
grant select, insert, update, delete on public.rooms to authenticated;

create policy "rooms_authenticated_select"
  on public.rooms
  for select
  to authenticated
  using (true);

create policy "rooms_authenticated_insert"
  on public.rooms
  for insert
  to authenticated
  with check ((select auth.uid()) is not null);

create policy "rooms_authenticated_update"
  on public.rooms
  for update
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "rooms_authenticated_delete"
  on public.rooms
  for delete
  to authenticated
  using ((select auth.uid()) is not null);

create trigger rooms_set_updated_at
  before update on public.rooms
  for each row
  execute function public.set_updated_at();

insert into public.rooms (name, slug, description, capacity, sort_order)
values
  ('Alsterzimmer', 'alsterzimmer', 'Seed room for M1.2 testing.', 80, 10),
  ('Pavillon', 'pavillon', 'Seed room for M1.2 testing.', 120, 20),
  ('Terrasse', 'terrasse', 'Seed room for M1.2 testing.', 60, 30)
on conflict (slug) do nothing;

create table public.event_number_counters (
  year integer primary key,
  last_value integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint event_number_counters_year_valid check (year >= 2000 and year <= 9999),
  constraint event_number_counters_last_value_non_negative check (last_value >= 0)
);

alter table public.event_number_counters enable row level security;

revoke all on public.event_number_counters from anon;
revoke all on public.event_number_counters from authenticated;
revoke all on public.event_number_counters from public;

create trigger event_number_counters_set_updated_at
  before update on public.event_number_counters
  for each row
  execute function public.set_updated_at();

create or replace function public.next_event_number()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_year integer := extract(year from now())::integer;
  v_next integer;
begin
  insert into public.event_number_counters (year, last_value)
  values (v_year, 1)
  on conflict (year) do update
    set last_value = public.event_number_counters.last_value + 1
  returning last_value into v_next;

  return 'EV-' || v_year::text || '-' || lpad(v_next::text, 4, '0');
end;
$$;

revoke all on function public.next_event_number() from anon;
revoke all on function public.next_event_number() from public;
grant execute on function public.next_event_number() to authenticated, service_role;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  event_number text not null,
  company_id uuid references public.companies(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  title text not null,
  event_date date,
  start_time time,
  end_time time,
  guest_count integer,
  status text not null default 'draft',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_event_number_unique unique (event_number),
  constraint events_event_number_not_empty check (length(trim(event_number)) > 0),
  constraint events_title_not_empty check (length(trim(title)) > 0),
  constraint events_guest_count_non_negative check (guest_count is null or guest_count >= 0),
  constraint events_status_valid check (status in ('draft', 'planned', 'cancelled', 'completed')),
  constraint events_time_range_valid check (start_time is null or end_time is null or end_time > start_time)
);

create index events_event_date_idx on public.events (event_date);
create index events_company_id_idx on public.events (company_id);
create index events_contact_id_idx on public.events (contact_id);
create index events_room_id_idx on public.events (room_id);
create index events_status_idx on public.events (status);
create index events_created_by_idx on public.events (created_by);

alter table public.events enable row level security;

revoke all on public.events from anon;
revoke all on public.events from public;
grant select, insert, update, delete on public.events to authenticated;

create policy "events_authenticated_select"
  on public.events
  for select
  to authenticated
  using (true);

create policy "events_authenticated_insert"
  on public.events
  for insert
  to authenticated
  with check ((select auth.uid()) is not null);

create policy "events_authenticated_update"
  on public.events
  for update
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "events_authenticated_delete"
  on public.events
  for delete
  to authenticated
  using ((select auth.uid()) is not null);

create trigger events_set_updated_at
  before update on public.events
  for each row
  execute function public.set_updated_at();
