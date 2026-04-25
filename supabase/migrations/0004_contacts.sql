-- M1.1 CRM: contacts table.
-- Fails closed if M0 baseline helpers or companies are missing.

do $$
begin
  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'M1.1 precondition failed: public.set_updated_at() is missing';
  end if;

  if to_regprocedure('public.log_audit(text,text,text,jsonb,jsonb)') is null then
    raise exception 'M1.1 precondition failed: public.log_audit(text,text,text,jsonb,jsonb) is missing';
  end if;

  if to_regclass('public.companies') is null then
    raise exception 'M1.1 precondition failed: public.companies is missing';
  end if;
end $$;

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  is_private_customer boolean not null default false,
  notes text,
  created_by uuid references auth.users(id) on delete set null default (select auth.uid()),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_first_name_not_empty check (length(trim(first_name)) > 0),
  constraint contacts_last_name_not_empty check (length(trim(last_name)) > 0)
);

create index contacts_company_id_idx on public.contacts (company_id);
create index contacts_name_idx on public.contacts (last_name, first_name);
create index contacts_created_by_idx on public.contacts (created_by);

alter table public.contacts enable row level security;

revoke all on public.contacts from anon;
revoke all on public.contacts from public;
grant select, insert, update, delete on public.contacts to authenticated;

create policy "contacts_authenticated_select"
  on public.contacts
  for select
  to authenticated
  using (true);

create policy "contacts_authenticated_insert"
  on public.contacts
  for insert
  to authenticated
  with check ((select auth.uid()) is not null);

create policy "contacts_authenticated_update"
  on public.contacts
  for update
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "contacts_authenticated_delete"
  on public.contacts
  for delete
  to authenticated
  using ((select auth.uid()) is not null);

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row
  execute function public.set_updated_at();
