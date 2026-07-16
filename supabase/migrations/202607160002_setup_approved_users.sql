-- Idempotent setup. Replace the psql variables at execution time; do not commit real email addresses.
-- Example:
-- psql "$DATABASE_URL" -v tali_email='tali@example.com' -v alex_email='alex@example.com' -f supabase/migrations/202607160002_setup_approved_users.sql
insert into public.approved_emails (email, person_key, display_name)
values (lower(:'tali_email'), 'tali', 'Tali'), (lower(:'alex_email'), 'alex', 'Alex')
on conflict (email) do update set person_key = excluded.person_key, display_name = excluded.display_name;
