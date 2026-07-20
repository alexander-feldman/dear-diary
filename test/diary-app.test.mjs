import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/app/diary-app.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../src/app/journal/page.tsx", import.meta.url), "utf8");
const loginForm = readFileSync(new URL("../src/app/auth/login-form.tsx", import.meta.url), "utf8");

test("empty journal is accepted without fictional production data", () => {
  assert.match(app, /initialEntries = \[\]/);
  assert.doesNotMatch(app, /initialEntries: Entry\[\] =|Fictional local sample data/);
});
test("loads and normalizes both members' entries", () => {
  assert.match(page, /entries\(id, author_user_id, body, is_done, updated_at\)/);
  assert.match(page, /people\.get\(value\.author_user_id\)/);
});
test("saving always attributes an entry to the authenticated user", () => {
  assert.match(app, /author_user_id: currentUserId/);
  assert.match(app, /\.eq\("author_user_id", currentUserId\)/);
  assert.doesNotMatch(app, /author_user_id: currentPerson/);
});
test("partner entry remains read-only", () => {
  assert.match(app, /entry, read only/);
  assert.match(app, /readOnly value=\{entry\[partner\]\}/);
});
test("autosave waits 800ms and reports confirmed success or failure", () => {
  assert.match(app, /setTimeout\([^;]+, 800\)/);
  assert.match(app, /if \(result\.error\) throw result\.error/);
  assert.match(app, /setSaveState\("Saved"\)/);
  assert.match(app, /setSaveState\(navigator\.onLine \? "Error" : "Offline"\)/);
});
test("local drafts are recovered and only removed after success", () => {
  assert.match(app, /localStorage\.getItem\(key\)/);
  assert.match(app, /localStorage\.setItem\(draftKey, body\)/);
  assert.match(app, /localStorage\.removeItem\(draftKey\); setSaveState\("Saved"\)/);
});
test("Done is persisted per user", () => {
  assert.match(app, /update\(\{ body, is_done: isDone \}\)/);
  assert.match(app, /insert\(\{ day_id: dayId, author_user_id: currentUserId, body, is_done: isDone \}\)/);
});
test("starring is shared through the days row", () => {
  assert.match(app, /from\("days"\)\.update\(\{ starred \}\)/);
  assert.match(app, /ignoreDuplicates: true/);
  assert.match(app, /ensureDay\(date\)/);
});
test("email OTP accepts a numeric token without assuming its length", () => {
  assert.match(loginForm, /name="token" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="\[0-9\]\*"/);
  assert.doesNotMatch(loginForm, /maxLength=|minLength=/);
  assert.match(loginForm, /const token = String\(formData\.get\("token"\)/);
  assert.match(loginForm, /verifyOtp\(\{ email: email\.trim\(\)\.toLowerCase\(\), token, type: "email" \}\)/);
});
test("email OTP reports invalid, expired, and rate-limited errors", () => {
  assert.match(loginForm, /one-time code is invalid/);
  assert.match(loginForm, /one-time code has expired/);
  assert.match(loginForm, /Too many attempts/);
});
test("optimistic concurrency detects conflicts and preserves local draft", () => {
  assert.match(app, /\.eq\("updated_at", version\)/);
  assert.match(app, /if \(!result\.data\) \{ setSaveState\("Conflict"\); return; \}/);
  assert.match(app, /Your local text is preserved/);
});

test("late-night posts before 2 AM stay on the previous diary day", () => {
  assert.match(app, /const diaryDayCutoffHour = 2/);
  assert.match(app, /export const diaryDayKey = \(now = new Date\(\), cutoffHour = diaryDayCutoffHour\)/);
  assert.match(app, /if \(date\.getHours\(\) < cutoffHour\) date\.setDate\(date\.getDate\(\) - 1\)/);
  assert.match(app, /Late-night writing for yesterday/);
  assert.match(app, /Before 2 AM, new writing is filed under/);
});

test("the Look Back tab exports the complete diary as CSV", () => {
  assert.match(app, /date,alex,tali/);
  assert.match(app, /value\.replaceAll\('\"', '\"\"'\)/);
  assert.match(app, /entries\.filter\(written\)\.sort\(\(a, b\) => a\.date\.localeCompare\(b\.date\)\)/);
  assert.match(app, /new Blob\(\["\\uFEFF", diaryCsv\(entries\)\]/);
  assert.match(app, /link\.download = "dear-diary\.csv"/);
  assert.match(app, />Export CSV</);
});
