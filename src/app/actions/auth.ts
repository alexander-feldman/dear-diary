"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { message?: string; error?: boolean };

type AuthError = { code?: string; message: string; status?: number };

function authErrorMessage(error: AuthError): string {
  const code = error.code?.toLowerCase() ?? "";
  const message = error.message.toLowerCase();

  if (error.status === 429 || code.includes("rate_limit") || message.includes("rate limit")) {
    return "Too many attempts. Please wait a moment before trying again.";
  }
  if (code.includes("expired") || message.includes("expired")) {
    return "This one-time code has expired. Request a new code and try again.";
  }
  return "That one-time code is invalid. Check the code in your email and try again.";
}

export async function requestEmailCode(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { message: "Enter your email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });

  if (error && (error.status === 429 || error.code?.includes("rate_limit"))) {
    return { message: "Too many code requests. Please wait a moment before trying again.", error: true };
  }

  return { message: "If this email has access, a one-time login code has been sent." };
}

export async function verifyEmailCode(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "").trim();
  if (!email || !token) return { message: "Enter your email and code." };
  if (!/^\d+$/.test(token)) return { message: "Enter the numeric code from your email.", error: true };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { message: authErrorMessage(error), error: true };
  redirect("/journal");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
