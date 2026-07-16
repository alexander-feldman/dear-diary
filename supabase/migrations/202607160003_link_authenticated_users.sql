-- Run after both approved users have authenticated at least once.
-- psql "$DATABASE_URL" -v journal_name='Dear Diary' -f supabase/migrations/202607160003_link_authenticated_users.sql
with created_journal as (
  insert into public.journals (name)
  select :'journal_name'
  where not exists (select 1 from public.journals where name = :'journal_name')
  returning id
), target_journal as (
  select id from created_journal union select id from public.journals where name = :'journal_name' limit 1
), approved_users as (
  select u.id as user_id, ae.person_key, ae.display_name
  from auth.users u join public.approved_emails ae on lower(u.email) = ae.email
)
insert into public.profiles (user_id, display_name, person_key)
select user_id, display_name, person_key from approved_users
on conflict (user_id) do update set display_name = excluded.display_name, person_key = excluded.person_key;

insert into public.journal_members (journal_id, user_id, person_key)
select tj.id, au.user_id, au.person_key from target_journal tj cross join approved_users au
on conflict (journal_id, user_id) do update set person_key = excluded.person_key;
