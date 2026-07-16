import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(new URL("../supabase/migrations/202607160001_initial_schema.sql", import.meta.url), "utf8");
const authActions = readFileSync(new URL("../src/app/actions/auth.ts", import.meta.url), "utf8");

for (const table of ["profiles", "journals", "journal_members", "days", "entries", "entry_revisions"]) {
  test(`${table} has RLS enabled`, () => {
    assert.match(schema, new RegExp(`alter table public\\.${table} enable row level security;`));
  });
}

test("journal days use SQL date and timestamps use time zones", () => {
  assert.match(schema, /entry_date date not null/);
  assert.match(schema, /created_at timestamptz not null default now\(\)/);
});

test("entry ownership policies prevent editing a partner entry", () => {
  assert.match(schema, /author_user_id = auth\.uid\(\)/);
  assert.match(schema, /public\.is_journal_member\(public\.day_journal_id\(day_id\)\)/);
});

test("policies do not use unconditional true expressions", () => {
  assert.doesNotMatch(schema, /using\s*\(\s*true\s*\)/i);
  assert.doesNotMatch(schema, /with check\s*\(\s*true\s*\)/i);
});

test("normal OTP login cannot create arbitrary users or reveal membership", () => {
  assert.match(authActions, /shouldCreateUser:\s*false/);
  assert.doesNotMatch(authActions, /is_email_approved|approved_emails/);
  assert.match(authActions, /If this email has access/);
});
