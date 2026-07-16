"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { requestEmailCode, type LoginState } from "../actions/auth";

const initialState: LoginState = {};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [verifyState, setVerifyState] = useState<LoginState>(initialState);
  const [verifyPending, setVerifyPending] = useState(false);

  async function requestCode(state: LoginState, formData: FormData) {
    const result = await requestEmailCode(state, formData);
    if (result.success) {
      setCodeRequested(true);
      setCooldown(60);
    }
    return result;
  }

  const [requestState, requestAction, requestPending] = useActionState(requestCode, initialState);
  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const token = String(formData.get("token") ?? "").trim();
    if (!email || !/^\d+$/.test(token)) {
      setVerifyState({ message: "Enter the numeric code from your email.", error: true });
      return;
    }

    setVerifyPending(true);
    setVerifyState(initialState);
    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: "email" });
    if (error || !data.session) {
      const code = error?.code?.toLowerCase() ?? "";
      const message = error?.message.toLowerCase() ?? "";
      const friendlyMessage = error?.status === 429 || code.includes("rate_limit") || message.includes("rate limit")
        ? "Too many attempts. Please wait a moment before trying again."
        : code.includes("expired") || message.includes("expired")
          ? "This one-time code has expired. Request a new code and try again."
          : "That one-time code is invalid. Check the code in your email and try again.";
      setVerifyState({ message: friendlyMessage, error: true });
      setVerifyPending(false);
      return;
    }

    // createBrowserClient persists the verified session before navigation.
    router.replace("/journal");
    router.refresh();
  }

  useEffect(() => {
    if (cooldown === 0) return;
    const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1_000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  return <main className="app auth-app"><header className="app-header"><div className="brand"><h1>Dear Diary</h1><p>A private daily journal for Tali &amp; Alex</p></div></header>
    <section className="card auth-card"><h2>Welcome back</h2><p>Enter an approved email address, then use the one-time code Supabase sends you.</p>
      <form action={requestAction} className="auth-form"><label>Email<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" value={email} readOnly={codeRequested} onChange={(event) => setEmail(event.target.value)} /></label><button className="done-button" disabled={requestPending || cooldown > 0}>{requestPending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : codeRequested ? "Resend code" : "Send code"}</button>{requestState.message && <p className="auth-message" role={requestState.error ? "alert" : "status"}>{requestState.message}</p>}</form>
      {codeRequested && <form onSubmit={verifyCode} className="auth-form"><input name="email" type="hidden" value={email} /><label>One-time code<input name="token" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" required placeholder="Numeric code" /></label><button className="done-button" disabled={verifyPending}>{verifyPending ? "Checking…" : "Sign in"}</button>{verifyState.message && <p className="auth-message" role={verifyState.error ? "alert" : "status"}>{verifyState.message}</p>}</form>}
    </section></main>;
}
