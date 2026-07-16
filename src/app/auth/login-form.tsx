"use client";

import { useActionState, useEffect, useState } from "react";
import { requestEmailCode, verifyEmailCode, type LoginState } from "../actions/auth";

const initialState: LoginState = {};

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  async function requestCode(state: LoginState, formData: FormData) {
    const result = await requestEmailCode(state, formData);
    if (result.success) {
      setCodeRequested(true);
      setCooldown(60);
    }
    return result;
  }

  const [requestState, requestAction, requestPending] = useActionState(requestCode, initialState);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyEmailCode, initialState);

  useEffect(() => {
    if (cooldown === 0) return;
    const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1_000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  return <main className="app auth-app"><header className="app-header"><div className="brand"><h1>Dear Diary</h1><p>A private daily journal for Tali &amp; Alex</p></div></header>
    <section className="card auth-card"><h2>Welcome back</h2><p>Enter an approved email address, then use the one-time code Supabase sends you.</p>
      <form action={requestAction} className="auth-form"><label>Email<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" value={email} readOnly={codeRequested} onChange={(event) => setEmail(event.target.value)} /></label><button className="done-button" disabled={requestPending || cooldown > 0}>{requestPending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : codeRequested ? "Resend code" : "Send code"}</button>{requestState.message && <p className="auth-message" role="status">{requestState.message}</p>}</form>
      {codeRequested && <form action={verifyAction} className="auth-form"><input name="email" type="hidden" value={email} /><label>One-time code<input name="token" inputMode="numeric" autoComplete="one-time-code" required placeholder="123456" /></label><button className="done-button" disabled={verifyPending}>{verifyPending ? "Checking…" : "Sign in"}</button>{verifyState.message && <p className="auth-message">{verifyState.message}</p>}</form>}
    </section></main>;
}
