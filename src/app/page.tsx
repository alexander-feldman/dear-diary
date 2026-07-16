import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./auth/login-form";

export default async function Home() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    console.info("Auth route", { pathname: "/", hasUser: Boolean(data.user), redirectDestination: !error && data.user ? "/journal" : null });
    if (!error && data.user) redirect("/journal");
  }

  return <LoginForm />;
}
