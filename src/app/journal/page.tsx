import { redirect } from "next/navigation";
import { DiaryApp, type DiaryEntry, type Person } from "../diary-app";
import { signOut } from "../actions/auth";
import { createClient } from "@/lib/supabase/server";

export default async function JournalPage() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  console.info("Auth route", { pathname: "/journal", hasUser: Boolean(userData.user), redirectDestination: !userError && !userData.user ? "/" : null });
  if (userError) return <ConfigurationError />;
  if (!userData.user) redirect("/");

  const { data: membership, error: membershipError } = await supabase.from("journal_members").select("journal_id, person_key").eq("user_id", userData.user.id).maybeSingle();
  if (membershipError || !membership) {
    console.info("Journal configuration", { pathname: "/journal", hasUser: true, profileLookupSucceeded: null, redirectDestination: null });
    return <ConfigurationError />;
  }

  const [{ data: profile, error: profileError }, { data: members, error: membersError }, { data: days, error: daysError }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("user_id", userData.user.id).maybeSingle(),
    supabase.from("journal_members").select("user_id, person_key").eq("journal_id", membership.journal_id),
    supabase.from("days").select("id, entry_date, starred, entries(id, author_user_id, body, is_done, updated_at)").eq("journal_id", membership.journal_id).order("entry_date", { ascending: false }),
  ]);
  const profileLookupSucceeded = !profileError && Boolean(profile);
  console.info("Journal configuration", { pathname: "/journal", hasUser: true, profileLookupSucceeded, redirectDestination: null });
  if (!profileLookupSucceeded || membersError || daysError) return <ConfigurationError />;
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

function ConfigurationError() {
  return <main className="app auth-app"><section className="card auth-card"><h2>Journal configuration error</h2><p>Your session is valid, but this journal is not configured correctly. Please contact the site administrator.</p></section></main>;
}
