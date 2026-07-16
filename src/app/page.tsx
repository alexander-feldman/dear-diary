import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./auth/login-form";

export default async function Home() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/journal");
  }

  return <LoginForm />;
}
