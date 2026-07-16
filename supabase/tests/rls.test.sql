-- Run with Supabase CLI: supabase test db
begin;
select plan(6);

-- These pgTAP tests are intentionally written against the committed RLS contract.
-- They require the initial migrations to be applied in a local Supabase test database.
select policies_are('public', 'days', array['members read days','members star days','members create days'], 'days policies are explicit and membership-scoped');
select policies_are('public', 'entries', array['members read entries','authors create own entries','authors update own entries'], 'entries policies are explicit and ownership-scoped');
select isnt_empty($$select 1 from pg_policy where polrelid = 'public.entries'::regclass and polcmd = 'r' and pg_get_expr(polqual, polrelid) like '%is_journal_member%'$$, 'Tali can read Alex entry because journal members can read entries');
select is_empty($$select 1 from pg_policy where pg_get_expr(coalesce(polqual, polwithcheck), polrelid) = 'true'$$, 'no unconditional RLS policy expressions');
select isnt_empty($$select 1 from pg_policy where polrelid = 'public.entries'::regclass and polcmd = 'w' and pg_get_expr(polqual, polrelid) like '%author_user_id = auth.uid()%'$$, 'Tali cannot edit Alex entry');
select isnt_empty($$select 1 from pg_policy where polrelid = 'public.days'::regclass and polcmd = 'w' and pg_get_expr(polqual, polrelid) like '%is_journal_member%'$$, 'both members can star a day');

select * from finish();
rollback;
