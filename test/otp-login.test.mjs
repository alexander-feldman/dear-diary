import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const action = readFileSync(new URL("../src/app/actions/auth.ts", import.meta.url), "utf8");
const form = readFileSync(new URL("../src/app/auth/login-form.tsx", import.meta.url), "utf8");

test("successful OTP request is the only path that advances to code entry", () => {
  assert.match(action, /success: true, requestId: crypto\.randomUUID\(\)/);
  assert.match(form, /if \(result\.success\) \{/);
  assert.match(form, /\{codeRequested && <form onSubmit=\{verifyCode\}/);
});

test("OTP verification uses the browser client and persists a session before navigation", () => {
  assert.match(form, /import \{ createClient \} from "@\/lib\/supabase\/browser"/);
  assert.match(form, /const \{ data, error \} = await supabase\.auth\.verifyOtp/);
  assert.match(form, /if \(error \|\| !data\.session\)/);
  const sessionCheck = form.indexOf("if (error || !data.session)");
  const replace = form.indexOf('router.replace("/journal")');
  const refresh = form.indexOf("router.refresh()");
  assert.ok(sessionCheck >= 0 && replace > sessionCheck && refresh > replace);
  assert.doesNotMatch(form, /redirect\("\/journal"\)/);
});

test("429 and rate-limit error codes return the rate-limit message", () => {
  assert.match(action, /error\.status === 429/);
  assert.match(action, /rate\.\?limit\|too\.\?many/);
  assert.match(action, /Too many sign-in attempts\. Please wait a minute and try again\./);
});

test("unknown email errors preserve the non-enumerating generic message", () => {
  assert.match(action, /isRateLimitError\(error\) \? RATE_LIMIT_MESSAGE : GENERIC_OTP_MESSAGE/);
  assert.match(action, /If this email has access, a one-time login code has been sent\./);
  assert.match(action, /shouldCreateUser: false/);
});

test("double clicks are prevented while the OTP request is pending", () => {
  assert.match(form, /disabled=\{requestPending \|\| cooldown > 0\}/);
});

test("successful sends enforce and display a 60 second resend cooldown", () => {
  assert.match(form, /setCooldown\(60\)/);
  assert.match(form, /setCooldown\(\(seconds\) => seconds - 1\), 1_000/);
  assert.match(form, /`Resend in \$\{cooldown\}s`/);
});

test("OTP diagnostics contain only the approved safe fields", () => {
  const loggedObject = action.match(/console\.error\("Supabase auth request failed", \{([\s\S]*?)\}\);/)?.[1] ?? "";
  assert.match(loggedObject, /stage:/);
  assert.match(loggedObject, /status:/);
  assert.match(loggedObject, /code:/);
  assert.doesNotMatch(loggedObject, /email|token|key|message/i);
});
