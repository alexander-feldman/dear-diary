import { redirect } from "next/navigation";
import { DiaryApp, type Person } from "../diary-app";
import { signOut } from "../actions/auth";
import { createClient } from "@/lib/supabase/server";

export default async function JournalPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("person_key, display_name")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!profile?.person_key) redirect("/");

  return <DiaryApp currentPerson={profile.person_key as Person} displayName={typeof profile.display_name === "string" ? profile.display_name : undefined} signOutAction={signOut} />;
}
