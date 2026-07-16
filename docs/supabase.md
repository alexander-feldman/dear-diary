# Supabase foundation

## Required environment variables

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

No service-role key is used by the app.

## Authentication model

The normal app login uses Supabase email OTP with `shouldCreateUser: false`. That means the login form cannot create arbitrary users. The two approved users must be created first in Supabase Auth manually or through a one-time server-side/admin setup script.

The login action intentionally returns the same generic success message after an OTP request attempt. It does not query a public allowlist and does not reveal whether the submitted email exists.

## Schema

Migrations in `supabase/migrations` create:

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
- There is no client policy for inserting journal members, so users cannot add themselves.

## Manual Supabase setup steps

1. Create a Supabase project.
2. Apply the migrations in order from `supabase/migrations`.
3. In Supabase Auth, ensure email OTP/magic-link sign-in is enabled.
4. Create the two approved auth users manually in Supabase Auth, or with a one-time admin/server-side script. Do not enable arbitrary public signup for this app.
5. Link the two authenticated users to one journal using placeholder values; do not commit real addresses:
   ```sh
   psql "$DATABASE_URL" \
     -v tali_email='tali@example.com' \
     -v alex_email='alex@example.com' \
     -v journal_name='Dear Diary' \
     -f supabase/migrations/202607160002_link_authenticated_users.sql
   ```
6. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the deployment environment.

## Testing both accounts

1. Open the app signed out. You should see the minimal Dear Diary login screen.
2. Request an OTP for the Tali-approved email and sign in. The journal should show Tali first and editable.
3. Sign out from the discreet header settings area.
4. Request an OTP for the Alex-approved email and sign in. The journal should show Alex first and editable.
5. Confirm the partner entry is visible as read-only and cannot be edited in the UI.
6. Try an unrelated Supabase Auth user that is not in `journal_members`; the app should redirect away from `/journal`, and RLS should return no journal data.

## Database/RLS test commands

Run the pgTAP tests with the Supabase CLI when Docker is available:

```sh
supabase start
supabase db reset
supabase test db
```

The RLS pgTAP file covers anonymous denial, unrelated authenticated-user denial, Tali reading Alex's entry, Tali being unable to edit Alex's entry, Tali editing her own entry, and both members starring/unstarring the shared day.
