# Supabase foundation

## Required environment variables

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

No service-role key is used by the app.

## Schema

Migrations in `supabase/migrations` create:

- `approved_emails`: private allowlist for the two approved addresses and their `person_key`.
- `profiles`: one row per Supabase auth user with `person_key` (`tali` or `alex`) and display name.
- `journals`: shared journal containers.
- `journal_members`: membership join table with unique journal/user and journal/person constraints.
- `days`: one `date`-typed journal day per journal/date, with shared `starred` state.
- `entries`: one entry per day/author, editable only by its author.
- `entry_revisions`: prior body snapshots for future audit/history work.

## RLS policies

Every application table has RLS enabled. Policies are membership-scoped and contain no unconditional `USING (true)` or `WITH CHECK (true)` clauses.

- Anonymous users cannot read or write journal data.
- Authenticated users can read only journals where they are members.
- Both members can read both entries in their shared journal.
- A member can create or update only entries where `author_user_id = auth.uid()`.
- Either member can star/unstar days in their shared journal.
- There is no client policy for adding journal members, so users cannot add themselves.

Security uncertainty to review in Supabase: the login form checks `approved_emails` before sending OTP. Keep that table limited to the two placeholder-driven rows and do not add broad select policies.

## Manual Supabase setup steps

1. Create a Supabase project.
2. Apply the migrations in order from `supabase/migrations`.
3. Insert the two allowlisted email addresses without committing them:
   ```sh
   psql "$DATABASE_URL" -v tali_email='tali@example.com' -v alex_email='alex@example.com' -f supabase/migrations/202607160002_setup_approved_users.sql
   ```
4. In Supabase Auth, ensure email OTP/magic-link sign-in is enabled.
5. Have each approved user request and verify an OTP in the app once.
6. Link the two authenticated users to one journal:
   ```sh
   psql "$DATABASE_URL" -v journal_name='Dear Diary' -f supabase/migrations/202607160003_link_authenticated_users.sql
   ```
7. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the deployment environment.

## Testing both accounts

1. Open the app signed out. You should see the minimal Dear Diary login screen.
2. Request an OTP for the Tali-approved email and sign in. The journal should show Tali first and editable.
3. Sign out from the discreet header settings area.
4. Request an OTP for the Alex-approved email and sign in. The journal should show Alex first and editable.
5. Confirm the partner entry is visible as read-only and cannot be edited in the UI.
6. For database RLS, run `supabase test db` locally after applying migrations.
