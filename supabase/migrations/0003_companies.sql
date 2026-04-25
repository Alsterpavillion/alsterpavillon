-- M1.1 CRM: companies table.
-- Fails closed if M0 baseline helpers are missing.

do $$
begin
  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'M1.1 precondition failed: public.set_updated_at() is missing';
  end if;

  if to_regprocedure('public.log_audit(text,text,text,jsonb,jsonb)') is null then
    raise exception 'M1.1 precondition failed: public.log_audit(text,text,text,jsonb,jsonb) is missing';
  end if;
end $$;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vat_id text,
  billing_address text,
  notes text,
  created_by uuid references auth.users(id) on delete set null default (select auth.uid()),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_name_not_empty check (length(trim(name)) > 0)
);

create index companies_name_idx on public.companies (name);
create index companies_created_by_idx on public.companies (created_by);

alter table public.companies enable row level security;

revoke all on public.companies from anon;
revoke all on public.companies from public;
grant select, insert, update, delete on public.companies to authenticated;

create policy "companies_authenticated_select"
  on public.companies
  for select
  to authenticated
  using (true);

create policy "companies_authenticated_insert"
  on public.companies
  for insert
  to authenticated
  with check ((select auth.uid()) is not null);

create policy "companies_authenticated_update"
  on public.companies
  for update
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "companies_authenticated_delete"
  on public.companies
  for delete
  to authenticated
  using ((select auth.uid()) is not null);

create trigger companies_set_updated_at
  before update on public.companies
  for each row
  execute function public.set_updated_at();
