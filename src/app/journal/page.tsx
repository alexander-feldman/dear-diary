import { redirect } from "next/navigation";
import { DiaryApp, type DiaryEntry, type Person } from "../diary-app";
import { signOut } from "../actions/auth";
import { createClient } from "@/lib/supabase/server";

export default async function JournalPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/");

  const { data: membership } = await supabase.from("journal_members").select("journal_id, person_key").eq("user_id", userData.user.id).maybeSingle();
  if (!membership) redirect("/");

  const [{ data: profile }, { data: members }, { data: days }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("user_id", userData.user.id).maybeSingle(),
    supabase.from("journal_members").select("user_id, person_key").eq("journal_id", membership.journal_id),
    supabase.from("days").select("id, entry_date, starred, entries(id, author_user_id, body, is_done, updated_at)").eq("journal_id", membership.journal_id).order("entry_date", { ascending: false }),
  ]);
  const people = new Map<string, Person>(((members ?? []) as Array<{ user_id: string; person_key: Person }>).map((member) => [member.user_id, member.person_key]));
  const initialEntries: DiaryEntry[] = ((days ?? []) as Array<{ id: string; entry_date: string; starred: boolean; entries: unknown[] }>).map((day) => {
    const normalized: DiaryEntry = { date: day.entry_date as string, dayId: day.id as string, starred: Boolean(day.starred), tali: "", alex: "" };
    for (const value of (day.entries ?? []) as Array<{ id: string; author_user_id: string; body: string; is_done: boolean; updated_at: string }>) {
      const person: Person | undefined = people.get(value.author_user_id);
      if (!person) continue;
      normalized[person] = value.body;
      normalized[`${person}Done`] = value.is_done;
      normalized[`${person}EntryId`] = value.id;
      normalized[`${person}UpdatedAt`] = value.updated_at;
    }
    return normalized;
  });

  return <DiaryApp currentPerson={membership.person_key as Person} currentUserId={userData.user.id} journalId={membership.journal_id as string} initialEntries={initialEntries} displayName={typeof profile?.display_name === "string" ? profile.display_name : undefined} signOutAction={signOut} />;
}
