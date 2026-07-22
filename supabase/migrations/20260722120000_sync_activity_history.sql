begin;

create table if not exists public.activity_sources (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  did text not null check (char_length(did) between 1 and 128),
  upstream_uid text,
  country_code text not null check (country_code ~ '^[a-z]{2}$'),
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, did)
);

create index if not exists activity_sources_user_recent_idx
  on public.activity_sources (user_id, last_used_at desc);

create table if not exists public.activity_launches (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  did text not null,
  task_id text not null check (char_length(task_id) between 1 and 128),
  scenario_id text not null check (char_length(scenario_id) between 1 and 128),
  scenario_title text,
  recipient_name text,
  recipient_phone text,
  launched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, task_id),
  foreign key (user_id, did)
    references public.activity_sources (user_id, did)
    on delete cascade
);

create index if not exists activity_launches_user_match_idx
  on public.activity_launches (user_id, did, scenario_id, launched_at desc);

create table if not exists public.hidden_activity_records (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  row_key text not null check (char_length(row_key) between 1 and 320),
  hidden_at timestamptz not null default now(),
  unique (user_id, row_key)
);

create index if not exists hidden_activity_records_user_idx
  on public.hidden_activity_records (user_id, hidden_at desc);

drop trigger if exists activity_sources_touch_updated_at on public.activity_sources;
create trigger activity_sources_touch_updated_at
before update on public.activity_sources
for each row execute function private.touch_updated_at();

drop trigger if exists activity_launches_touch_updated_at on public.activity_launches;
create trigger activity_launches_touch_updated_at
before update on public.activity_launches
for each row execute function private.touch_updated_at();

alter table public.activity_sources enable row level security;
alter table public.activity_launches enable row level security;
alter table public.hidden_activity_records enable row level security;

drop policy if exists activity_sources_select_own on public.activity_sources;
create policy activity_sources_select_own
on public.activity_sources for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists activity_sources_insert_own on public.activity_sources;
create policy activity_sources_insert_own
on public.activity_sources for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists activity_sources_update_own on public.activity_sources;
create policy activity_sources_update_own
on public.activity_sources for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists activity_sources_delete_own on public.activity_sources;
create policy activity_sources_delete_own
on public.activity_sources for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists activity_launches_select_own on public.activity_launches;
create policy activity_launches_select_own
on public.activity_launches for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists activity_launches_insert_own on public.activity_launches;
create policy activity_launches_insert_own
on public.activity_launches for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists activity_launches_update_own on public.activity_launches;
create policy activity_launches_update_own
on public.activity_launches for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists activity_launches_delete_own on public.activity_launches;
create policy activity_launches_delete_own
on public.activity_launches for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists hidden_activity_records_select_own on public.hidden_activity_records;
create policy hidden_activity_records_select_own
on public.hidden_activity_records for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists hidden_activity_records_insert_own on public.hidden_activity_records;
create policy hidden_activity_records_insert_own
on public.hidden_activity_records for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists hidden_activity_records_delete_own on public.hidden_activity_records;
create policy hidden_activity_records_delete_own
on public.hidden_activity_records for delete to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.activity_sources from anon, authenticated;
revoke all on table public.activity_launches from anon, authenticated;
revoke all on table public.hidden_activity_records from anon, authenticated;
revoke all on sequence public.activity_sources_id_seq from anon, authenticated;
revoke all on sequence public.activity_launches_id_seq from anon, authenticated;
revoke all on sequence public.hidden_activity_records_id_seq from anon, authenticated;

grant select, insert, update, delete on table public.activity_sources to authenticated;
grant select, insert, update, delete on table public.activity_launches to authenticated;
grant select, insert, delete on table public.hidden_activity_records to authenticated;
grant usage, select on sequence public.activity_sources_id_seq to authenticated;
grant usage, select on sequence public.activity_launches_id_seq to authenticated;
grant usage, select on sequence public.hidden_activity_records_id_seq to authenticated;

alter table public.activity_sources replica identity full;
alter table public.activity_launches replica identity full;
alter table public.hidden_activity_records replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activity_sources'
    ) then
      execute 'alter publication supabase_realtime add table public.activity_sources';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activity_launches'
    ) then
      execute 'alter publication supabase_realtime add table public.activity_launches';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'hidden_activity_records'
    ) then
      execute 'alter publication supabase_realtime add table public.hidden_activity_records';
    end if;
  end if;
end $$;

commit;
