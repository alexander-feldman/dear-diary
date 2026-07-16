import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const proxy = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
const home = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const journal = readFileSync(new URL("../src/app/journal/page.tsx", import.meta.url), "utf8");

test("anonymous /journal redirects to /", () => {
  assert.match(proxy, /!error && !data\.user && pathname === "\/journal"[\s\S]*?\? "\/"/);
  assert.match(journal, /if \(!userData\.user\) redirect\("\/"\)/);
});

test("authenticated / redirects to /journal", () => {
  assert.match(proxy, /!error && data\.user && pathname === "\/"[\s\S]*?\? "\/journal"/);
  assert.match(home, /if \(!error && data\.user\) redirect\("\/journal"\)/);
});

test("authenticated /journal renders journal data", () => {
  assert.match(journal, /return <DiaryApp/);
  assert.doesNotMatch(journal, /if \(!membership\) redirect/);
});

test("missing profile and database failures render configuration error", () => {
  assert.match(journal, /if \(!profileLookupSucceeded \|\| membersError \|\| daysError\) return <ConfigurationError/);
  assert.match(journal, /membershipError \|\| !membership/);
  assert.match(journal, /Journal configuration error/);
});

test("proxy refreshes sessions on request and response and preserves redirect cookies", () => {
  assert.match(proxy, /cookiesToSet\.forEach\(\(\{ name, value \}\) => request\.cookies\.set/);
  assert.match(proxy, /cookiesToSet\.forEach\(\(\{ name, value, options \}\) => response\.cookies\.set/);
  assert.match(proxy, /supabase\.auth\.getUser\(\)/);
  assert.match(proxy, /response\.headers\.getSetCookie\(\)/);
  assert.match(proxy, /redirectResponse\.headers\.append\("set-cookie", setCookie\)/);
});

test("routing predicates cannot create a / and /journal redirect cycle", () => {
  assert.match(proxy, /data\.user && pathname === "\/"/);
  assert.match(proxy, /!data\.user && pathname === "\/journal"/);
  assert.doesNotMatch(journal, /membership[\s\S]{0,80}redirect\("\/"\)/);
  assert.doesNotMatch(journal, /profile[\s\S]{0,80}redirect\("\/"\)/);
});
