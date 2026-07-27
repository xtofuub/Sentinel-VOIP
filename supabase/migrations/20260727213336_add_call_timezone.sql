begin;

alter table public.call_sessions
  add column if not exists time_zone text not null default 'Europe/Helsinki';

drop function if exists public.create_call_session(uuid, text, text, text, text, text, timestamptz);
drop function if exists private.create_call_session(uuid, text, text, text, text, text, timestamptz);

create function private.create_call_session(
  p_request_id uuid,
  p_scenario_id text,
  p_scenario_title text,
  p_locale_code text,
  p_recipient_name text,
  p_recipient_phone text,
  p_scheduled_for timestamptz,
  p_time_zone text default 'Europe/Helsinki'
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

  if p_scenario_id is null or char_length(trim(p_scenario_id)) not between 1 and 120
     or p_scenario_title is null or char_length(trim(p_scenario_title)) not between 1 and 200
     or p_locale_code is null or p_locale_code !~ '^[a-zA-Z]{2}([_-][a-zA-Z]{2})?$'
     or p_recipient_name is null or char_length(trim(p_recipient_name)) not between 1 and 120
     or p_recipient_phone is null or p_recipient_phone !~ '^\+[1-9][0-9]{7,14}$'
     or p_time_zone is null or char_length(trim(p_time_zone)) not between 1 and 100 then
    raise exception 'Invalid call details' using errcode = '22023';
  end if;

  begin
    perform pg_catalog.timezone(trim(p_time_zone), now());
  exception when invalid_parameter_value then
    raise exception 'Invalid time zone' using errcode = '22023';
  end;

  if p_scheduled_for is null
     or p_scheduled_for < now() - interval '2 minutes'
     or p_scheduled_for > now() + interval '30 days' then
    raise exception 'Scheduled time must be within the next 30 days' using errcode = '22023';
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
       or existing_session.scheduled_for is distinct from p_scheduled_for
       or existing_session.time_zone is distinct from trim(p_time_zone) then
      raise exception 'Request id was already used with different call details' using errcode = '22023';
    end if;
    return existing_session;
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
    user_id, request_id, scenario_id, scenario_title, locale_code,
    recipient_name, recipient_phone, scheduled_for, time_zone, credit_cost
  ) values (
    caller_id, p_request_id, trim(p_scenario_id), trim(p_scenario_title), p_locale_code,
    trim(p_recipient_name), p_recipient_phone, p_scheduled_for, trim(p_time_zone), cost
  )
  returning * into created_session;

  if cost > 0 then
    update public.profiles set credits = next_balance where id = caller_id;
    insert into public.credit_ledger (
      user_id, delta, balance_after, reason, call_session_id, actor_id, idempotency_key
    ) values (
      caller_id, -1, next_balance, 'Call session reserved', created_session.id, caller_id, p_request_id
    );
  end if;

  return created_session;
end;
$$;

revoke all on function private.create_call_session(uuid, text, text, text, text, text, timestamptz, text) from public;
grant execute on function private.create_call_session(uuid, text, text, text, text, text, timestamptz, text) to authenticated;

create function public.create_call_session(
  p_request_id uuid,
  p_scenario_id text,
  p_scenario_title text,
  p_locale_code text,
  p_recipient_name text,
  p_recipient_phone text,
  p_scheduled_for timestamptz,
  p_time_zone text default 'Europe/Helsinki'
)
returns public.call_sessions
language sql
security invoker
set search_path = ''
as $$
  select private.create_call_session(
    p_request_id, p_scenario_id, p_scenario_title, p_locale_code,
    p_recipient_name, p_recipient_phone, p_scheduled_for, p_time_zone
  );
$$;

revoke all on function public.create_call_session(uuid, text, text, text, text, text, timestamptz, text) from public, anon;
grant execute on function public.create_call_session(uuid, text, text, text, text, text, timestamptz, text) to authenticated;

commit;
