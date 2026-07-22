begin;

drop extension if exists pg_net;
drop schema if exists net cascade;
create extension pg_net with schema extensions;

create or replace function private.cancel_call_session(p_session_id uuid)
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

revoke all on function private.cancel_call_session(uuid) from public, anon;
grant execute on function private.cancel_call_session(uuid) to authenticated;

create or replace function public.cancel_call_session(p_session_id uuid)
returns public.call_sessions
language sql
security invoker
set search_path = ''
as $$
  select private.cancel_call_session(p_session_id);
$$;

revoke all on function public.cancel_call_session(uuid) from public, anon;
grant execute on function public.cancel_call_session(uuid) to authenticated;

commit;
