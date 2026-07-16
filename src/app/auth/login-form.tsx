"use client";

import { useActionState } from "react";
import { requestEmailCode, verifyEmailCode, type LoginState } from "../actions/auth";

const initialState: LoginState = {};

export function LoginForm() {
  const [requestState, requestAction, requestPending] = useActionState(requestEmailCode, initialState);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyEmailCode, initialState);

  return <main className="app auth-app"><header className="app-header"><div className="brand"><h1>Dear Diary</h1><p>A private daily journal for Tali &amp; Alex</p></div></header>
    <section className="card auth-card"><h2>Welcome back</h2><p>Enter an approved email address, then use the one-time code Supabase sends you.</p>
      <form action={requestAction} className="auth-form"><label>Email<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label><button className="done-button" disabled={requestPending}>{requestPending ? "Sending…" : "Send code"}</button>{requestState.message && <p className="auth-message" role={requestState.error ? "alert" : "status"}>{requestState.message}</p>}</form>
      <form action={verifyAction} className="auth-form"><label>Email<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label><label>One-time code<input name="token" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" required placeholder="Numeric code" /></label><button className="done-button" disabled={verifyPending}>{verifyPending ? "Checking…" : "Sign in"}</button>{verifyState.message && <p className="auth-message" role={verifyState.error ? "alert" : "status"}>{verifyState.message}</p>}</form>
    </section></main>;
}
