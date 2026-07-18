begin;

create table if not exists public.contacts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  phone_number text not null check (phone_number ~ '^\+[1-9][0-9]{7,14}$'),
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, phone_number)
);

create index if not exists contacts_user_recent_idx
  on public.contacts (user_id, last_used_at desc nulls last, name);

drop trigger if exists contacts_touch_updated_at on public.contacts;
create trigger contacts_touch_updated_at
before update on public.contacts
for each row execute function private.touch_updated_at();

alter table public.contacts enable row level security;

drop policy if exists contacts_select_own on public.contacts;
create policy contacts_select_own
on public.contacts
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists contacts_insert_own on public.contacts;
create policy contacts_insert_own
on public.contacts
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists contacts_update_own on public.contacts;
create policy contacts_update_own
on public.contacts
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists contacts_delete_own on public.contacts;
create policy contacts_delete_own
on public.contacts
for delete
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.contacts from anon, authenticated;
revoke all on sequence public.contacts_id_seq from anon, authenticated;
grant select, insert, update, delete on table public.contacts to authenticated;
grant usage, select on sequence public.contacts_id_seq to authenticated;

commit;
