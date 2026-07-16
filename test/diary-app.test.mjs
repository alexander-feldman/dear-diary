import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/app/diary-app.tsx", import.meta.url), "utf8");

test("DiaryApp wires Tali editing to mocked saving states", () => {
  assert.match(source, /editable entry/);
  assert.match(source, /setSaveState\(\"Saving…\"\)/);
  assert.match(source, /setSaveState\(\"Saved\"\)/);
});

test("Alex entry is read-only and opens from collapsed preview or Done", () => {
  assert.match(source, /entry, read only/);
  assert.match(source, /aria-expanded=\{visiblePartner\}/);
  assert.match(source, /setAlexOpen\(true\)/);
});

test("navigation includes feed, calendar, look back, and contextual return", () => {
  assert.match(source, /type DaysView = \"feed\" \| \"calendar\"/);
  assert.match(source, /Back to \{returnContext\.label\}/);
  assert.match(source, /Search &amp; starred/);
});

test("memory and blank-day scope stays intentionally narrow", () => {
  assert.match(source, /On this day/);
  assert.match(source, /recentBlankDays/);
  assert.doesNotMatch(source, /reminder|analytics|streak|mood|tag|photo|AI/);
});
