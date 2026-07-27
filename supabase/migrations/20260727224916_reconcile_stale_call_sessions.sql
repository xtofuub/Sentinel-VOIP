begin;

create or replace function private.complete_stale_call_sessions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  completed_count integer;
begin
  update public.call_sessions
  set status = 'completed'::public.call_status,
      next_attempt_at = null
  where status = 'running'::public.call_status
    and launched_at < now() - interval '10 minutes';

  get diagnostics completed_count = row_count;
  return completed_count;
end;
$$;

revoke all on function private.complete_stale_call_sessions() from public, anon, authenticated;
grant execute on function private.complete_stale_call_sessions() to service_role;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'complete-stale-sentinel-calls';

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end
$$;

select cron.schedule(
  'complete-stale-sentinel-calls',
  '* * * * *',
  $cron$select private.complete_stale_call_sessions();$cron$
);

select private.complete_stale_call_sessions();

commit;
