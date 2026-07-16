-- Run locally/CI with Docker available:
--   supabase start
--   supabase db reset
--   supabase test db
begin;
select plan(15);

select is_empty($$select 1 from pg_policy where pg_get_expr(coalesce(polqual, polwithcheck), polrelid) = 'true'$$, 'no unconditional RLS policy expressions');

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-0000-0000-0000000000a1', 'tali@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', 'alex@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b1', 'unrelated@example.test', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.profiles (user_id, display_name, person_key)
values
  ('00000000-0000-0000-0000-0000000000a1', 'Tali', 'tali'),
  ('00000000-0000-0000-0000-0000000000a2', 'Alex', 'alex')
on conflict (user_id) do nothing;

insert into public.journals (id, name)
values ('10000000-0000-0000-0000-000000000001', 'Dear Diary')
on conflict (id) do nothing;

insert into public.journal_members (journal_id, user_id, person_key)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'tali'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a2', 'alex')
on conflict (journal_id, user_id) do nothing;

insert into public.days (id, journal_id, entry_date)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', date '2026-07-16')
on conflict (journal_id, entry_date) do nothing;

insert into public.entries (id, day_id, author_user_id, body, is_done)
values
  ('30000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Tali body', true),
  ('30000000-0000-0000-0000-0000000000a2', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a2', 'Alex body', true)
on conflict (day_id, author_user_id) do nothing;

set local role anon;
select is((select count(*) from public.entries), 0::bigint, 'anonymous access denied');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
select is((select count(*) from public.entries), 0::bigint, 'unrelated authenticated user denied');
select lives_ok($$select * from public.journal_members$$, 'unrelated membership lookup does not recurse');
select is((select count(*) from public.journal_members), 0::bigint, 'unrelated user cannot read memberships');
select is((select count(*) from public.profiles where user_id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2')), 0::bigint, 'unrelated user cannot read member profiles');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select lives_ok($$select * from public.journals cross join public.journal_members$$, 'member journal and membership policies do not recurse');
select is((select count(*) from public.journals), 1::bigint, 'member can read the shared journal');
select is((select count(*) from public.journal_members), 2::bigint, 'member can read both memberships');
select is((select count(*) from public.profiles), 2::bigint, 'member can read own and partner profiles');
select is((select body from public.entries where id = '30000000-0000-0000-0000-0000000000a2'), 'Alex body', 'Tali can read Alex entry');
select throws_ok($$update public.entries set body = 'edited by Tali' where id = '30000000-0000-0000-0000-0000000000a2'$$, '42501', null, 'Tali cannot edit Alex entry');
select lives_ok($$update public.entries set body = 'edited by Tali' where id = '30000000-0000-0000-0000-0000000000a1'$$, 'Tali can edit her own entry');
select lives_ok($$update public.days set starred = true where id = '20000000-0000-0000-0000-000000000001'$$, 'Tali can star a shared day');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
select lives_ok($$update public.days set starred = false where id = '20000000-0000-0000-0000-000000000001'$$, 'Alex can unstar a shared day');
reset role;

select * from finish();
rollback;
