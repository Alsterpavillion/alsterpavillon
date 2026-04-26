-- M2 Catalog & Mapping.
-- Three tables (catalog_items, catalog_dispatch, catalog_classifications) + RLS + auto-classification trigger.
-- Fail-closed precondition checks against missing M0 baseline helpers.

do $$
begin
  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'M2 precondition failed: public.set_updated_at() is missing';
  end if;

  if to_regprocedure('public.log_audit(text,text,text,jsonb,jsonb)') is null then
    raise exception 'M2 precondition failed: public.log_audit(text,text,text,jsonb,jsonb) is missing';
  end if;
end $$;

-- ────────────────────────────────────────────────────────────
-- catalog_items
-- ────────────────────────────────────────────────────────────

create table public.catalog_items (
  id                       uuid primary key default gen_random_uuid(),
  sku                      text unique not null,
  name                     text not null,
  category                 text not null,
  subcategory              text,
  default_price_net_cents  integer not null,
  vat_rate                 numeric not null,
  cost_default_net_cents   integer,
  unit                     text not null,
  is_active                boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid references auth.users(id) on delete set null,
  constraint catalog_items_sku_not_empty
    check (length(trim(sku)) > 0),
  constraint catalog_items_name_not_empty
    check (length(trim(name)) > 0),
  constraint catalog_items_category_not_empty
    check (length(trim(category)) > 0),
  constraint catalog_items_default_price_non_negative
    check (default_price_net_cents >= 0),
  constraint catalog_items_cost_non_negative
    check (cost_default_net_cents is null or cost_default_net_cents >= 0),
  constraint catalog_items_vat_rate_valid
    check (vat_rate in (7, 19)),
  constraint catalog_items_unit_valid
    check (unit in ('piece', 'hour', 'person', 'flat'))
);

create index catalog_items_category_idx   on public.catalog_items (category);
create index catalog_items_is_active_idx  on public.catalog_items (is_active);
create index catalog_items_created_by_idx on public.catalog_items (created_by);

alter table public.catalog_items enable row level security;

revoke all on public.catalog_items from anon;
revoke all on public.catalog_items from public;
grant select, insert, update, delete on public.catalog_items to authenticated;

create policy "catalog_items_authenticated_select"
  on public.catalog_items for select to authenticated using (true);

create policy "catalog_items_authenticated_insert"
  on public.catalog_items for insert to authenticated
  with check ((select auth.uid()) is not null);

create policy "catalog_items_authenticated_update"
  on public.catalog_items for update to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "catalog_items_authenticated_delete"
  on public.catalog_items for delete to authenticated
  using ((select auth.uid()) is not null);

create trigger catalog_items_set_updated_at
  before update on public.catalog_items
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- catalog_dispatch
-- ────────────────────────────────────────────────────────────

create table public.catalog_dispatch (
  id               uuid primary key default gen_random_uuid(),
  catalog_item_id  uuid not null references public.catalog_items(id) on delete cascade,
  dispatch_role    text not null,
  is_primary       boolean not null default false,
  created_at       timestamptz not null default now(),
  constraint catalog_dispatch_role_valid
    check (dispatch_role in ('kitchen', 'service', 'purchase', 'tech', 'operations')),
  constraint catalog_dispatch_unique_role_per_item
    unique (catalog_item_id, dispatch_role)
);

create index catalog_dispatch_item_idx on public.catalog_dispatch (catalog_item_id);
create index catalog_dispatch_role_idx on public.catalog_dispatch (dispatch_role);

alter table public.catalog_dispatch enable row level security;

revoke all on public.catalog_dispatch from anon;
revoke all on public.catalog_dispatch from public;
grant select, insert, update, delete on public.catalog_dispatch to authenticated;

create policy "catalog_dispatch_authenticated_select"
  on public.catalog_dispatch for select to authenticated using (true);

create policy "catalog_dispatch_authenticated_insert"
  on public.catalog_dispatch for insert to authenticated
  with check ((select auth.uid()) is not null);

create policy "catalog_dispatch_authenticated_update"
  on public.catalog_dispatch for update to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "catalog_dispatch_authenticated_delete"
  on public.catalog_dispatch for delete to authenticated
  using ((select auth.uid()) is not null);

-- ────────────────────────────────────────────────────────────
-- catalog_classifications  (1:1 with catalog_items)
-- ────────────────────────────────────────────────────────────

create table public.catalog_classifications (
  catalog_item_id        uuid primary key references public.catalog_items(id) on delete cascade,
  classification_status  text not null default 'pending',
  classified_at          timestamptz,
  classified_by          uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint catalog_classifications_status_valid
    check (classification_status in ('pending', 'classified'))
);

create index catalog_classifications_status_idx
  on public.catalog_classifications (classification_status);

alter table public.catalog_classifications enable row level security;

revoke all on public.catalog_classifications from anon;
revoke all on public.catalog_classifications from public;
grant select, insert, update, delete on public.catalog_classifications to authenticated;

create policy "catalog_classifications_authenticated_select"
  on public.catalog_classifications for select to authenticated using (true);

create policy "catalog_classifications_authenticated_insert"
  on public.catalog_classifications for insert to authenticated
  with check ((select auth.uid()) is not null);

create policy "catalog_classifications_authenticated_update"
  on public.catalog_classifications for update to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "catalog_classifications_authenticated_delete"
  on public.catalog_classifications for delete to authenticated
  using ((select auth.uid()) is not null);

create trigger catalog_classifications_set_updated_at
  before update on public.catalog_classifications
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- Auto-create classification row on catalog_item insert.
-- Invariant: every catalog_item has exactly one classification row,
-- defaulting to status='pending' until classifyCatalogItem flips it to 'classified'.
-- ────────────────────────────────────────────────────────────

create or replace function public.handle_new_catalog_item()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.catalog_classifications (catalog_item_id, classification_status)
  values (new.id, 'pending');
  return new;
end;
$$;

revoke all on function public.handle_new_catalog_item() from public;

create trigger on_catalog_item_created
  after insert on public.catalog_items
  for each row execute function public.handle_new_catalog_item();
