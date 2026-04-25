-- M0 Foundation: audit_log baseline (append-only, immutable, RLS deny-all reads).
-- Writes go through public.log_audit() SECURITY DEFINER function only.
-- No client-side INSERT, UPDATE, DELETE possible.

create table if not exists public.audit_log (
  id              bigserial primary key,
  actor_user_id   uuid references auth.users(id) on delete set null,
  entity_type     text not null,
  entity_id       text not null,
  action          text not null,
  before_json     jsonb,
  after_json      jsonb,
  ts              timestamptz not null default now()
);

create index if not exists audit_log_entity_idx
  on public.audit_log (entity_type, entity_id, ts desc);
create index if not exists audit_log_actor_idx
  on public.audit_log (actor_user_id, ts desc);
create index if not exists audit_log_ts_idx
  on public.audit_log (ts desc);

alter table public.audit_log enable row level security;

-- Hard append-only: no role except service_role can read or mutate the table directly.
revoke all on public.audit_log from anon;
revoke all on public.audit_log from authenticated;
revoke all on public.audit_log from public;

-- No SELECT/INSERT/UPDATE/DELETE policies — RLS denies all access. Service role bypasses RLS.

-- Sequence privileges align with table.
revoke all on sequence public.audit_log_id_seq from anon;
revoke all on sequence public.audit_log_id_seq from authenticated;
revoke all on sequence public.audit_log_id_seq from public;

-- log_audit: only sanctioned write path. Runs as postgres (BYPASSRLS) — controlled INSERT.
create or replace function public.log_audit(
  p_entity_type text,
  p_entity_id   text,
  p_action      text,
  p_before      jsonb default null,
  p_after       jsonb default null
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id bigint;
  v_actor uuid;
begin
  if p_entity_type is null or length(p_entity_type) = 0 then
    raise exception 'log_audit: entity_type required';
  end if;
  if p_entity_id is null or length(p_entity_id) = 0 then
    raise exception 'log_audit: entity_id required';
  end if;
  if p_action is null or length(p_action) = 0 then
    raise exception 'log_audit: action required';
  end if;

  v_actor := (select auth.uid());

  insert into public.audit_log (actor_user_id, entity_type, entity_id, action, before_json, after_json)
  values (v_actor, p_entity_type, p_entity_id, p_action, p_before, p_after)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.log_audit(text, text, text, jsonb, jsonb) from public;
grant execute on function public.log_audit(text, text, text, jsonb, jsonb) to authenticated, service_role;

-- Block UPDATE/DELETE at the table level via event trigger as a second line of defence.
-- (Even superuser must explicitly drop this trigger to mutate existing rows.)
create or replace function public.audit_log_block_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log is append-only — UPDATE/DELETE forbidden';
end;
$$;

drop trigger if exists audit_log_no_update on public.audit_log;
create trigger audit_log_no_update
  before update on public.audit_log
  for each row execute function public.audit_log_block_mutation();

drop trigger if exists audit_log_no_delete on public.audit_log;
create trigger audit_log_no_delete
  before delete on public.audit_log
  for each row execute function public.audit_log_block_mutation();
