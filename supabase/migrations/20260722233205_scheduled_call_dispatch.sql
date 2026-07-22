begin;

create extension if not exists pg_net;
create extension if not exists pg_cron;

alter table public.call_sessions
  add column if not exists attempt_count integer not null default 0 check (attempt_count >= 0),
  add column if not exists last_attempt_at timestamptz,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists launched_at timestamptz,
  add column if not exists credit_refunded_at timestamptz;

create index if not exists call_sessions_dispatch_idx
  on public.call_sessions (scheduled_for, next_attempt_at)
  where status = 'scheduled'::public.call_status;

create index if not exists call_sessions_stale_queue_idx
  on public.call_sessions (last_attempt_at)
  where status = 'queued'::public.call_status;

create or replace function private.refund_call_session(
  p_session_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_session public.call_sessions;
  next_balance integer;
begin
  select * into target_session
  from public.call_sessions
  where id = p_session_id
  for update;

  if not found
     or target_session.credit_cost = 0
     or target_session.credit_refunded_at is not null then
    return;
  end if;

  update public.profiles
  set credits = credits + target_session.credit_cost
  where id = target_session.user_id
  returning credits into next_balance;

  if next_balance is null then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  update public.call_sessions
  set credit_refunded_at = now()
  where id = target_session.id;

  insert into public.credit_ledger (
    user_id,
    delta,
    balance_after,
    reason,
    call_session_id,
    actor_id
  ) values (
    target_session.user_id,
    target_session.credit_cost,
    next_balance,
    left(coalesce(nullif(trim(p_reason), ''), 'Call credit returned'), 240),
    target_session.id,
    auth.uid()
  );
end;
$$;

revoke all on function private.refund_call_session(uuid, text) from public, anon, authenticated;

create or replace function public.cancel_call_session(p_session_id uuid)
returns public.call_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_session public.call_sessions;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into target_session
  from public.call_sessions
  where id = p_session_id and user_id = caller_id
  for update;

  if not found then
    raise exception 'Scheduled call not found' using errcode = 'P0002';
  end if;

  if target_session.status = 'cancelled'::public.call_status then
    return target_session;
  end if;

  if target_session.status <> 'scheduled'::public.call_status then
    raise exception 'This call can no longer be cancelled' using errcode = '55000';
  end if;

  update public.call_sessions
  set status = 'cancelled'::public.call_status,
      failure_reason = null
  where id = target_session.id;

  perform private.refund_call_session(target_session.id, 'Scheduled call cancelled');

  select * into target_session
  from public.call_sessions
  where id = p_session_id;

  return target_session;
end;
$$;

revoke all on function public.cancel_call_session(uuid) from public, anon;
grant execute on function public.cancel_call_session(uuid) to authenticated;

create or replace function public.claim_due_call_sessions(p_limit integer default 4)
returns setof public.call_sessions
language sql
security definer
set search_path = ''
as $$
  with due as (
    select id
    from public.call_sessions
    where scheduled_for <= now()
      and (
        (
          status = 'scheduled'::public.call_status
          and coalesce(next_attempt_at, scheduled_for) <= now()
        )
        or (
          status = 'queued'::public.call_status
          and last_attempt_at < now() - interval '5 minutes'
        )
      )
    order by scheduled_for, created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit, 4), 1), 12)
  )
  update public.call_sessions as session
  set status = 'queued'::public.call_status,
      attempt_count = session.attempt_count + 1,
      last_attempt_at = now(),
      failure_reason = null
  from due
  where session.id = due.id
  returning session.*;
$$;

revoke all on function public.claim_due_call_sessions(integer) from public, anon, authenticated;
grant execute on function public.claim_due_call_sessions(integer) to service_role;

create or replace function public.claim_call_session(
  p_session_id uuid,
  p_user_id uuid
)
returns public.call_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_session public.call_sessions;
begin
  update public.call_sessions
  set status = 'queued'::public.call_status,
      attempt_count = attempt_count + 1,
      last_attempt_at = now(),
      failure_reason = null
  where id = p_session_id
    and user_id = p_user_id
    and status = 'scheduled'::public.call_status
    and scheduled_for <= now() + interval '30 seconds'
    and coalesce(next_attempt_at, scheduled_for) <= now() + interval '30 seconds'
  returning * into claimed_session;

  return claimed_session;
end;
$$;

revoke all on function public.claim_call_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_call_session(uuid, uuid) to service_role;

create or replace function public.mark_call_session_running(
  p_session_id uuid,
  p_did text,
  p_upstream_uid text,
  p_task_id text
)
returns public.call_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_session public.call_sessions;
begin
  update public.call_sessions
  set status = 'running'::public.call_status,
      upstream_did = p_did,
      upstream_uid = p_upstream_uid,
      upstream_task_id = p_task_id,
      launched_at = now(),
      next_attempt_at = null,
      failure_reason = null
  where id = p_session_id
    and status = 'queued'::public.call_status
  returning * into target_session;

  if target_session.id is null then
    raise exception 'Queued call not found' using errcode = 'P0002';
  end if;

  insert into public.activity_sources (
    user_id,
    did,
    upstream_uid,
    country_code,
    last_used_at
  ) values (
    target_session.user_id,
    p_did,
    p_upstream_uid,
    lower(left(target_session.locale_code, 2)),
    target_session.launched_at
  )
  on conflict (user_id, did) do update
  set upstream_uid = excluded.upstream_uid,
      country_code = excluded.country_code,
      last_used_at = excluded.last_used_at;

  insert into public.activity_launches (
    user_id,
    did,
    task_id,
    scenario_id,
    scenario_title,
    recipient_name,
    recipient_phone,
    launched_at
  ) values (
    target_session.user_id,
    p_did,
    p_task_id,
    target_session.scenario_id,
    target_session.scenario_title,
    target_session.recipient_name,
    target_session.recipient_phone,
    target_session.launched_at
  )
  on conflict (user_id, task_id) do update
  set scenario_id = excluded.scenario_id,
      scenario_title = excluded.scenario_title,
      recipient_name = excluded.recipient_name,
      recipient_phone = excluded.recipient_phone,
      launched_at = excluded.launched_at;

  return target_session;
end;
$$;

revoke all on function public.mark_call_session_running(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.mark_call_session_running(uuid, text, text, text) to service_role;

create or replace function public.mark_call_session_failed(
  p_session_id uuid,
  p_reason text,
  p_retry_at timestamptz default null
)
returns public.call_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_session public.call_sessions;
begin
  select * into target_session
  from public.call_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Call session not found' using errcode = 'P0002';
  end if;

  if target_session.status <> 'queued'::public.call_status then
    return target_session;
  end if;

  if p_retry_at is not null and target_session.attempt_count < 3 then
    update public.call_sessions
    set status = 'scheduled'::public.call_status,
        next_attempt_at = greatest(p_retry_at, now() + interval '30 seconds'),
        failure_reason = left(coalesce(p_reason, 'Temporary dispatch failure'), 500)
    where id = target_session.id
    returning * into target_session;
  else
    update public.call_sessions
    set status = 'failed'::public.call_status,
        next_attempt_at = null,
        failure_reason = left(coalesce(p_reason, 'Call dispatch failed'), 500)
    where id = target_session.id;

    perform private.refund_call_session(target_session.id, 'Call could not be placed');

    select * into target_session
    from public.call_sessions
    where id = p_session_id;
  end if;

  return target_session;
end;
$$;

revoke all on function public.mark_call_session_failed(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.mark_call_session_failed(uuid, text, timestamptz) to service_role;

create or replace function public.verify_dispatch_token(p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_token is not null and exists (
    select 1
    from vault.decrypted_secrets
    where name = 'sentinel_dispatch_secret'
      and decrypted_secret = p_token
  );
$$;

revoke all on function public.verify_dispatch_token(text) from public, anon, authenticated;
grant execute on function public.verify_dispatch_token(text) to service_role;

alter table public.call_sessions replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'call_sessions'
     ) then
    alter publication supabase_realtime add table public.call_sessions;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'sentinel_dispatch_secret'
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'sentinel_dispatch_secret',
      'Authenticates the scheduled call dispatcher'
    );
  end if;
end
$$;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'dispatch-sentinel-calls';

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end
$$;

select cron.schedule(
  'dispatch-sentinel-calls',
  '* * * * *',
  $cron$
    select net.http_post(
      url := 'https://fnbucfaiekadlqojpgrn.supabase.co/functions/v1/dispatch-calls',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-sentinel-cron', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'sentinel_dispatch_secret'
        )
      ),
      body := jsonb_build_object('source', 'cron'),
      timeout_milliseconds := 55000
    );
  $cron$
);

commit;
