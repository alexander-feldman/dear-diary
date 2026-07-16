-- Idempotent setup. First create the two users manually in Supabase Auth or with a
-- one-time server-side/admin script. Then run this SQL with placeholder values; do
-- not commit real email addresses.
--
-- psql "$DATABASE_URL" \
--   -v tali_email='tali@example.com' \
--   -v alex_email='alex@example.com' \
--   -v journal_name='Dear Diary' \
--   -f supabase/migrations/202607160002_link_authenticated_users.sql
with target_users as (
  select u.id as user_id, 'tali'::public.person_key as person_key, 'Tali'::text as display_name
  from auth.users u where lower(u.email) = lower(:'tali_email')
  union all
  select u.id as user_id, 'alex'::public.person_key as person_key, 'Alex'::text as display_name
  from auth.users u where lower(u.email) = lower(:'alex_email')
), user_count as (
  select count(*) as found_users from target_users
), created_journal as (
  insert into public.journals (name)
  select :'journal_name'
  where (select found_users from user_count) = 2
    and not exists (select 1 from public.journals where name = :'journal_name')
  returning id
), target_journal as (
  select id from created_journal
  union
  select id from public.journals where name = :'journal_name'
  limit 1
), upsert_profiles as (
  insert into public.profiles (user_id, display_name, person_key)
  select user_id, display_name, person_key from target_users
  where (select found_users from user_count) = 2
  on conflict (user_id) do update set display_name = excluded.display_name, person_key = excluded.person_key
  returning user_id
)
insert into public.journal_members (journal_id, user_id, person_key)
select tj.id, tu.user_id, tu.person_key
from target_journal tj cross join target_users tu
where (select found_users from user_count) = 2
on conflict (journal_id, user_id) do update set person_key = excluded.person_key;
