begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

do $$
begin
  create type public.user_role as enum ('user', 'admin');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.call_status as enum (
    'scheduled',
    'queued',
    'running',
    'completed',
    'failed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default '',
  avatar_url text,
  role public.user_role not null default 'user',
  credits integer not null default 3 check (credits >= 0),
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  request_id uuid not null,
  scenario_id text not null check (char_length(scenario_id) between 1 and 120),
  scenario_title text not null check (char_length(scenario_title) between 1 and 200),
  locale_code text not null check (locale_code ~ '^[a-zA-Z]{2}([_-][a-zA-Z]{2})?$'),
  recipient_name text not null check (char_length(recipient_name) between 1 and 120),
  recipient_phone text not null check (recipient_phone ~ '^\+[1-9][0-9]{7,14}$'),
  scheduled_for timestamptz not null default now(),
  status public.call_status not null default 'scheduled',
  credit_cost integer not null default 1 check (credit_cost in (0, 1)),
  upstream_did text,
  upstream_uid text,
  upstream_task_id text,
  recording_id text,
  recording_url text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, request_id)
);

create table if not exists public.credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null check (delta <> 0),
  balance_after integer not null check (balance_after >= 0),
  reason text not null check (char_length(reason) between 1 and 240),
  call_session_id uuid references public.call_sessions (id) on delete set null,
  actor_id uuid references auth.users (id) on delete set null,
  idempotency_key uuid,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  actor_email text not null,
  target_user_id uuid references public.profiles (id) on delete set null,
  target_user_email text not null,
  action text not null check (char_length(action) between 1 and 80),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists call_sessions_user_created_idx
  on public.call_sessions (user_id, created_at desc);
create index if not exists call_sessions_status_schedule_idx
  on public.call_sessions (status, scheduled_for);
create index if not exists credit_ledger_user_created_idx
  on public.credit_ledger (user_id, created_at desc);
create index if not exists credit_ledger_call_session_idx
  on public.credit_ledger (call_session_id)
  where call_session_id is not null;
create index if not exists credit_ledger_actor_idx
  on public.credit_ledger (actor_id)
  where actor_id is not null;
create index if not exists admin_audit_target_created_idx
  on public.admin_audit_log (target_user_id, created_at desc);
create index if not exists admin_audit_actor_idx
  on public.admin_audit_log (actor_id);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'::public.user_role
      and not is_suspended
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated, service_role;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.touch_updated_at() from public;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function private.touch_updated_at();

drop trigger if exists call_sessions_touch_updated_at on public.call_sessions;
create trigger call_sessions_touch_updated_at
before update on public.call_sessions
for each row execute function private.touch_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_name text;
  resolved_avatar text;
begin
  resolved_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Sentinel user'
  );
  resolved_avatar := nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), '');

  insert into public.profiles (id, email, display_name, avatar_url)
  values (new.id, coalesce(new.email, ''), resolved_name, resolved_avatar)
  on conflict (id) do update
    set email = excluded.email,
        display_name = case
          when nullif(trim(public.profiles.display_name), '') is null then excluded.display_name
          else public.profiles.display_name
        end,
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        updated_at = now();

  insert into public.credit_ledger (
    user_id,
    delta,
    balance_after,
    reason,
    idempotency_key
  )
  values (
    new.id,
    3,
    3,
    'Starter calls',
    new.id
  )
  on conflict (user_id, idempotency_key) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function private.handle_new_user();

insert into public.profiles (id, email, display_name, avatar_url)
select
  id,
  coalesce(email, ''),
  coalesce(
    nullif(trim(raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(email, ''), '@', 1), ''),
    'Sentinel user'
  ),
  nullif(trim(raw_user_meta_data ->> 'avatar_url'), '')
from auth.users
on conflict (id) do nothing;

insert into public.credit_ledger (
  user_id,
  delta,
  balance_after,
  reason,
  idempotency_key
)
select id, credits, credits, 'Starter calls', id
from public.profiles
where credits > 0
on conflict (user_id, idempotency_key) do nothing;

alter table public.profiles enable row level security;
alter table public.call_sessions enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.admin_audit_log enable row level security;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_admin())
);

drop policy if exists profiles_update_own_public_fields on public.profiles;
create policy profiles_update_own_public_fields
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists call_sessions_select_own_or_admin on public.call_sessions;
create policy call_sessions_select_own_or_admin
on public.call_sessions
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_admin())
);

drop policy if exists credit_ledger_select_own_or_admin on public.credit_ledger;
create policy credit_ledger_select_own_or_admin
on public.credit_ledger
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_admin())
);

drop policy if exists admin_audit_select_admin on public.admin_audit_log;
create policy admin_audit_select_admin
on public.admin_audit_log
for select
to authenticated
using ((select private.is_admin()));

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.call_sessions from anon, authenticated;
revoke all on table public.credit_ledger from anon, authenticated;
revoke all on table public.admin_audit_log from anon, authenticated;

grant usage on schema public to authenticated;
grant usage on type public.user_role, public.call_status to authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, avatar_url) on table public.profiles to authenticated;
grant select on table public.call_sessions to authenticated;
grant select on table public.credit_ledger to authenticated;
grant select on table public.admin_audit_log to authenticated;

-- The dashboard's optional automatic-RLS trigger does not need Data API access.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;

create or replace function private.create_call_session(
  p_request_id uuid,
  p_scenario_id text,
  p_scenario_title text,
  p_locale_code text,
  p_recipient_name text,
  p_recipient_phone text,
  p_scheduled_for timestamptz
)
returns public.call_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_profile public.profiles;
  existing_session public.call_sessions;
  created_session public.call_sessions;
  next_balance integer;
  cost integer;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_request_id is null then
    raise exception 'A request id is required' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_id::text || ':' || p_request_id::text, 0)
  );

  select * into existing_session
  from public.call_sessions
  where user_id = caller_id and request_id = p_request_id;

  if found then
    if existing_session.scenario_id is distinct from trim(p_scenario_id)
       or existing_session.scenario_title is distinct from trim(p_scenario_title)
       or existing_session.locale_code is distinct from p_locale_code
       or existing_session.recipient_name is distinct from trim(p_recipient_name)
       or existing_session.recipient_phone is distinct from p_recipient_phone
       or existing_session.scheduled_for is distinct from p_scheduled_for then
      raise exception 'Request id was already used with different call details' using errcode = '22023';
    end if;
    return existing_session;
  end if;

  if p_scenario_id is null or char_length(trim(p_scenario_id)) not between 1 and 120
     or p_scenario_title is null or char_length(trim(p_scenario_title)) not between 1 and 200
     or p_locale_code is null or p_locale_code !~ '^[a-zA-Z]{2}([_-][a-zA-Z]{2})?$'
     or p_recipient_name is null or char_length(trim(p_recipient_name)) not between 1 and 120
     or p_recipient_phone is null or p_recipient_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Invalid call details' using errcode = '22023';
  end if;

  if p_scheduled_for is null
     or p_scheduled_for < now() - interval '2 minutes'
     or p_scheduled_for > now() + interval '30 days' then
    raise exception 'Scheduled time must be within the next 30 days' using errcode = '22023';
  end if;

  select * into caller_profile
  from public.profiles
  where id = caller_id
  for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if caller_profile.is_suspended then
    raise exception 'Account suspended' using errcode = '42501';
  end if;

  cost := case when caller_profile.role = 'admin'::public.user_role then 0 else 1 end;
  next_balance := caller_profile.credits - cost;

  if next_balance < 0 then
    raise exception 'No call credits remaining' using errcode = 'P0001';
  end if;

  insert into public.call_sessions (
    user_id,
    request_id,
    scenario_id,
    scenario_title,
    locale_code,
    recipient_name,
    recipient_phone,
    scheduled_for,
    credit_cost
  )
  values (
    caller_id,
    p_request_id,
    trim(p_scenario_id),
    trim(p_scenario_title),
    p_locale_code,
    trim(p_recipient_name),
    p_recipient_phone,
    p_scheduled_for,
    cost
  )
  returning * into created_session;

  if cost > 0 then
    update public.profiles
    set credits = next_balance
    where id = caller_id;

    insert into public.credit_ledger (
      user_id,
      delta,
      balance_after,
      reason,
      call_session_id,
      actor_id,
      idempotency_key
    )
    values (
      caller_id,
      -1,
      next_balance,
      'Call session reserved',
      created_session.id,
      caller_id,
      p_request_id
    );
  end if;

  return created_session;
end;
$$;

revoke all on function private.create_call_session(uuid, text, text, text, text, text, timestamptz) from public;
grant execute on function private.create_call_session(uuid, text, text, text, text, text, timestamptz) to authenticated;

create or replace function public.create_call_session(
  p_request_id uuid,
  p_scenario_id text,
  p_scenario_title text,
  p_locale_code text,
  p_recipient_name text,
  p_recipient_phone text,
  p_scheduled_for timestamptz
)
returns public.call_sessions
language sql
security invoker
set search_path = ''
as $$
  select private.create_call_session(
    p_request_id,
    p_scenario_id,
    p_scenario_title,
    p_locale_code,
    p_recipient_name,
    p_recipient_phone,
    p_scheduled_for
  );
$$;

revoke all on function public.create_call_session(uuid, text, text, text, text, text, timestamptz) from public, anon;
grant execute on function public.create_call_session(uuid, text, text, text, text, text, timestamptz) to authenticated;

create or replace function private.admin_adjust_credits(
  p_target_user_id uuid,
  p_delta integer,
  p_reason text,
  p_idempotency_key uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_balance integer;
  next_balance integer;
  existing_delta integer;
  existing_reason text;
  target_email text;
  admin_email text;
begin
  if not private.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_target_user_id is null
     or p_delta is null
     or p_delta = 0
     or abs(p_delta) > 1000
     or p_reason is null
     or char_length(trim(p_reason)) not between 1 and 240
     or p_idempotency_key is null then
    raise exception 'Invalid credit adjustment' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_target_user_id::text || ':' || p_idempotency_key::text, 0)
  );

  select balance_after, delta, reason
  into next_balance, existing_delta, existing_reason
  from public.credit_ledger
  where user_id = p_target_user_id
    and idempotency_key = p_idempotency_key;

  if found then
    if existing_delta is distinct from p_delta
       or existing_reason is distinct from trim(p_reason) then
      raise exception 'Idempotency key was already used for a different adjustment' using errcode = '22023';
    end if;
    return next_balance;
  end if;

  select credits, email into current_balance, target_email
  from public.profiles
  where id = p_target_user_id
  for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  next_balance := current_balance + p_delta;
  if next_balance < 0 then
    raise exception 'Credit balance cannot be negative' using errcode = '22023';
  end if;

  select email into admin_email
  from public.profiles
  where id = auth.uid();

  update public.profiles
  set credits = next_balance
  where id = p_target_user_id;

  insert into public.credit_ledger (
    user_id,
    delta,
    balance_after,
    reason,
    actor_id,
    idempotency_key
  )
  values (
    p_target_user_id,
    p_delta,
    next_balance,
    trim(p_reason),
    auth.uid(),
    p_idempotency_key
  );

  insert into public.admin_audit_log (
    actor_id,
    actor_email,
    target_user_id,
    target_user_email,
    action,
    details
  )
  values (
    auth.uid(),
    admin_email,
    p_target_user_id,
    target_email,
    'credits.adjusted',
    jsonb_build_object('delta', p_delta, 'reason', trim(p_reason), 'balance_after', next_balance)
  );

  return next_balance;
end;
$$;

revoke all on function private.admin_adjust_credits(uuid, integer, text, uuid) from public;
grant execute on function private.admin_adjust_credits(uuid, integer, text, uuid) to authenticated;

create or replace function public.admin_adjust_credits(
  p_target_user_id uuid,
  p_delta integer,
  p_reason text,
  p_idempotency_key uuid
)
returns integer
language sql
security invoker
set search_path = ''
as $$
  select private.admin_adjust_credits(
    p_target_user_id,
    p_delta,
    p_reason,
    p_idempotency_key
  );
$$;

revoke all on function public.admin_adjust_credits(uuid, integer, text, uuid) from public, anon;
grant execute on function public.admin_adjust_credits(uuid, integer, text, uuid) to authenticated;

commit;
