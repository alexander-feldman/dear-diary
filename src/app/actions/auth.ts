"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { message?: string };

export async function requestEmailCode(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { message: "Enter your email address." };

  const supabase = await createClient();
  const { data: allowed, error: allowlistError } = await supabase.rpc("is_email_approved", { candidate_email: email });

  if (allowlistError || !allowed) {
    return { message: "This diary is private. Use one of the approved email addresses." };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) return { message: error.message };
  return { message: "Check your email for the one-time login code." };
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
