"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { message?: string; success?: boolean; requestId?: string };

const GENERIC_OTP_MESSAGE = "If this email has access, a one-time login code has been sent.";
const RATE_LIMIT_MESSAGE = "Too many sign-in attempts. Please wait a minute and try again.";

type SafeAuthError = { status?: number; code?: string };

function isRateLimitError(error: SafeAuthError) {
  return error.status === 429 || /rate.?limit|too.?many/i.test(error.code ?? "");
}

function otpErrorState(error: SafeAuthError): LoginState {
  // Deliberately omit the email and the provider's message: either can contain
  // sensitive information. These fields are sufficient to diagnose failures.
  console.error("Supabase auth request failed", {
    stage: "signInWithOtp",
    status: error.status,
    code: error.code,
  });

  return { message: isRateLimitError(error) ? RATE_LIMIT_MESSAGE : GENERIC_OTP_MESSAGE };
}

export async function requestEmailCode(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { message: "Enter your email address." };

  const supabase = await createClient();
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) return otpErrorState(error as unknown as SafeAuthError);
  } catch (error) {
    const authError = error && typeof error === "object" ? error as SafeAuthError : {};
    return otpErrorState(authError);
  }

  return { message: GENERIC_OTP_MESSAGE, success: true, requestId: crypto.randomUUID() };
}

export async function verifyEmailCode(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "").trim();
  if (!email || !token) return { message: "Enter your email and code." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { message: error.message };
  redirect("/journal");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
