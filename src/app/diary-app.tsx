"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { searchExcerpt } from "@/lib/search";

export type Person = "tali" | "alex";
type View = "today" | "days" | "lookBack";
type DaysView = "feed" | "calendar";
type ReturnContext = { view: View; daysView?: DaysView; label: string } | null;

export type DiaryEntry = { date: string; dayId?: string; tali: string; alex: string; starred?: boolean; taliDone?: boolean; alexDone?: boolean; taliEntryId?: string; alexEntryId?: string; taliUpdatedAt?: string; alexUpdatedAt?: string };
type SaveState = "Saving…" | "Saved" | "Offline" | "Error" | "Conflict";
const diaryDayCutoffHour = 2;
export const diaryDayKey = (now = new Date(), cutoffHour = diaryDayCutoffHour) => {
  const date = new Date(now);
  if (date.getHours() < cutoffHour) date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const todayKey = () => diaryDayKey();
const calendarKey = (now = new Date()) => {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const isLateNightWindow = (now = new Date(), cutoffHour = diaryDayCutoffHour) => now.getHours() < cutoffHour;

export function KoalaIcon() { return <svg className="animal-icon koala" viewBox="0 0 32 32" aria-hidden="true"><circle cx="7.1" cy="13" r="5" fill="#e6ddd6" stroke="currentColor" strokeWidth="1.4"/><circle cx="24.9" cy="13" r="5" fill="#e6ddd6" stroke="currentColor" strokeWidth="1.4"/><path d="M8.6 17.1c0-6.1 3.2-10.2 7.4-10.2s7.4 4.1 7.4 10.2v.8c0 4.7-3.1 7.8-7.4 7.8s-7.4-3.1-7.4-7.8z" fill="#fffaf5" stroke="currentColor" strokeWidth="1.4"/><circle cx="13" cy="16" r="1" fill="currentColor"/><circle cx="19" cy="16" r="1" fill="currentColor"/><ellipse cx="16" cy="19.1" rx="2.35" ry="2.8" fill="currentColor"/><path d="M14.6 22.2c.7.55 2.1.55 2.8 0" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>; }
export function BearIcon() { return <svg className="animal-icon bear" viewBox="0 0 32 32" aria-hidden="true"><circle cx="9" cy="9.4" r="3.7" fill="#ead4c3" stroke="currentColor" strokeWidth="1.4"/><circle cx="23" cy="9.4" r="3.7" fill="#ead4c3" stroke="currentColor" strokeWidth="1.4"/><path d="M7.7 16.5c0-6 3.4-10 8.3-10s8.3 4 8.3 10v1.8c0 4.7-3.5 7.7-8.3 7.7s-8.3-3-8.3-7.7z" fill="#fff8f1" stroke="currentColor" strokeWidth="1.4"/><circle cx="12.7" cy="15.7" r="1" fill="currentColor"/><circle cx="19.3" cy="15.7" r="1" fill="currentColor"/><ellipse cx="16" cy="20" rx="4" ry="3.2" fill="#f1dfd1" stroke="currentColor" strokeWidth="1"/><ellipse cx="16" cy="18.9" rx="1.7" ry="1.35" fill="currentColor"/><path d="M16 20.1v1.2m-1.5.5c.8.65 2.2.65 3 0" fill="none" stroke="currentColor" strokeWidth="1.05" strokeLinecap="round"/></svg>; }

function label(person: Person) { return <span className="person-label">{person === "tali" ? <KoalaIcon /> : <BearIcon />}<span>{person === "tali" ? "Tali" : "Alex"}</span></span>; }
export const formatDate = (key: string) => new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: key.startsWith("2026") ? undefined : "numeric", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));
export const shiftDiaryDate = (key: string, days: number) => {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const written = (entry: DiaryEntry) => entry.tali.trim() || entry.alex.trim();
export const recentBlankDays = (entries: DiaryEntry[], today = todayKey()) => Array.from({ length: 7 }, (_, index) => { const date = new Date(`${today}T12:00:00Z`); date.setUTCDate(date.getUTCDate() - index - 1); return date.toISOString().slice(0, 10); }).filter((date) => !entries.find((entry) => entry.date === date && written(entry)));
const csvCell = (value: string) => `"${value.replaceAll('"', '""')}"`;
export const diaryCsv = (entries: DiaryEntry[]) => ["date,alex,tali", ...entries.filter(written).sort((a, b) => a.date.localeCompare(b.date)).map((entry) => [entry.date, entry.alex, entry.tali].map(csvCell).join(","))].join("\r\n");

export function DiaryApp({ currentPerson = "tali", currentUserId, journalId, initialEntries = [], displayName, signOutAction }: { currentPerson?: Person; currentUserId: string; journalId: string; initialEntries?: DiaryEntry[]; displayName?: string; signOutAction?: () => void | Promise<void> }) {
  const [today] = useState(() => todayKey());
  const [calendarToday] = useState(() => calendarKey());
  const [lateNightPosting] = useState(() => isLateNightWindow());
  const draftPrefix = `dear-diary:${journalId}:${currentUserId}:`;
  const [entries, setEntries] = useState<DiaryEntry[]>(() => {
    let normalized = initialEntries.map((item) => ({ ...item }));
    if (typeof window === "undefined") return normalized;
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(draftPrefix)) continue;
      const date = key.slice(draftPrefix.length);
      const target = normalized.find((item) => item.date === date) ?? { date, tali: "", alex: "" };
      normalized = upsert(normalized, { ...target, [currentPerson]: localStorage.getItem(key) ?? "" });
    }
    return normalized;
  });
  const [currentDate, setCurrentDate] = useState(today);
  const [view, setView] = useState<View>("today");
  const [daysView, setDaysView] = useState<DaysView>("feed");
  const [returnContext, setReturnContext] = useState<ReturnContext>(null);
  const [alexOpen, setAlexOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>(() => typeof window !== "undefined" && Object.keys(localStorage).some((key) => key.startsWith(draftPrefix)) ? (navigator.onLine ? "Error" : "Offline") : "Saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState("");
  const entry = entries.find((item) => item.date === currentDate) ?? { date: currentDate, tali: "", alex: "" };
  const partner = currentPerson === "tali" ? "alex" : "tali";
  const recorded = entries.filter(written).sort((a, b) => b.date.localeCompare(a.date));
  const blanks = recentBlankDays(entries, today);
  const onThisDay = entries.filter((item) => item.date.slice(5) === today.slice(5) && item.date < today).sort((a, b) => b.date.localeCompare(a.date))[0];
  const searchTerms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const results = searchTerms.length ? recorded.filter((item) => {
    const searchable = `${item.tali} ${item.alex} ${formatDate(item.date)}`.toLowerCase();
    return searchTerms.every((term) => searchable.includes(term));
  }) : recorded.filter((item) => item.starred);
  const visiblePartner = currentDate < today || alexOpen || Boolean(entry[`${currentPerson}Done`]);
  const monthDays = useMemo(() => { const [year, month] = currentDate.split("-").map(Number); const count = new Date(Date.UTC(year, month, 0)).getUTCDate(); return Array.from({ length: count }, (_, index) => `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`); }, [currentDate]);

  useEffect(() => {
    const online = () => setSaveState((state) => state === "Offline" ? "Error" : state);
    const offline = () => setSaveState("Offline");
    window.addEventListener("online", online); window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); if (timer.current) clearTimeout(timer.current); };
  }, [currentPerson, draftPrefix]);

  async function ensureDay(date: string) {
    const known = entries.find((item) => item.date === date)?.dayId;
    if (known) return known;
    const supabase = createClient();
    const created = await supabase.from("days").upsert({ journal_id: journalId, entry_date: date }, { onConflict: "journal_id,entry_date", ignoreDuplicates: true });
    if (created.error) throw created.error;
    const { data, error } = await supabase.from("days").select("id").eq("journal_id", journalId).eq("entry_date", date).single();
    if (error || !data) throw error ?? new Error("Day was not created");
    setEntries((all) => upsert(all, { ...(all.find((item) => item.date === date) ?? { date, tali: "", alex: "" }), dayId: data.id }));
    return data.id as string;
  }

  async function saveOwn(date: string, body: string, isDone: boolean) {
    const snapshot = entries.find((item) => item.date === date) ?? { date, tali: "", alex: "" };
    const draftKey = `${draftPrefix}${date}`;
    localStorage.setItem(draftKey, body); setSaveState(navigator.onLine ? "Saving…" : "Offline");
    if (!navigator.onLine) return;
    try {
      const dayId = await ensureDay(date); const supabase = createClient();
      const entryId = snapshot[`${currentPerson}EntryId`]; const version = snapshot[`${currentPerson}UpdatedAt`];
      let saved: { id: string; updated_at: string } | null = null;
      if (entryId && version) {
        const result = await supabase.from("entries").update({ body, is_done: isDone }).eq("id", entryId).eq("author_user_id", currentUserId).eq("updated_at", version).select("id, updated_at").maybeSingle();
        if (result.error) throw result.error;
        if (!result.data) { setSaveState("Conflict"); return; }
        saved = result.data;
      } else {
        const result = await supabase.from("entries").insert({ day_id: dayId, author_user_id: currentUserId, body, is_done: isDone }).select("id, updated_at").single();
        if (result.error) throw result.error; saved = result.data;
      }
      setEntries((all) => { const latest = all.find((item) => item.date === date) ?? snapshot; return upsert(all, { ...latest, dayId, [`${currentPerson}EntryId`]: saved!.id, [`${currentPerson}UpdatedAt`]: saved!.updated_at }); });
      localStorage.removeItem(draftKey); setSaveState("Saved");
    } catch { setSaveState(navigator.onLine ? "Error" : "Offline"); }
  }
  function updateEntry(text: string) { const next = { ...entry, [currentPerson]: text }; setEntries((all) => upsert(all, next)); localStorage.setItem(`${draftPrefix}${currentDate}`, text); setSaveState(navigator.onLine ? "Saving…" : "Offline"); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => void saveOwn(currentDate, text, Boolean(next[`${currentPerson}Done`])), 800); }
  function upsertEntry(next: DiaryEntry) { setEntries((all) => upsert(all, next)); }
  function openDate(date: string, labelText = view === "days" ? (daysView === "calendar" ? "Calendar" : "Feed") : view === "lookBack" ? "Look Back" : "Today") { setReturnContext({ view, daysView, label: labelText }); setCurrentDate(date); setAlexOpen(date < today); setView("today"); }
  function moveDay(days: number) { const date = shiftDiaryDate(currentDate, days); if (date > today) return; setCurrentDate(date); setAlexOpen(date < today); }
  async function toggleStar(date = currentDate) { const target = entries.find((item) => item.date === date) ?? { date, tali: "", alex: "" }; const starred = !target.starred; upsertEntry({ ...target, starred }); try { const dayId = await ensureDay(date); const { error } = await createClient().from("days").update({ starred }).eq("id", dayId); if (error) throw error; } catch { upsertEntry(target); setSaveState(navigator.onLine ? "Error" : "Offline"); } }
  function exportDiary() { const url = URL.createObjectURL(new Blob(["\uFEFF", diaryCsv(entries)], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "dear-diary.csv"; link.click(); URL.revokeObjectURL(url); }

  return <main className="app"><header className="app-header"><div className="brand"><h1>Dear Diary</h1><p>A private daily journal for Tali &amp; Alex</p></div>{signOutAction && <form action={signOutAction} className="settings-menu"><span>{displayName ?? (currentPerson === "tali" ? "Tali" : "Alex")}</span><button type="submit">Sign out</button></form>}</header>
    {view === "today" && <section><article className="card"><div className="day-header">{returnContext && <button className="context-back show" onClick={() => { setView(returnContext.view); if (returnContext.daysView) setDaysView(returnContext.daysView); setReturnContext(null); }}>‹ Back to {returnContext.label}</button>}<div className="day-heading-row"><button className="day-arrow" type="button" aria-label="Previous day" onClick={() => moveDay(-1)}>‹</button><div className="day-title"><h2>{formatDate(currentDate)}</h2><p>{currentDate === today ? lateNightPosting ? "Late-night writing for yesterday" : "Writing for today" : "Writing for this day"}</p></div><button className="day-arrow" type="button" aria-label="Next day" disabled={currentDate === today} onClick={() => moveDay(1)}>›</button><button className={`star-button ${entry.starred ? "is-starred" : ""}`} aria-pressed={Boolean(entry.starred)} aria-label="Star this day" onClick={() => toggleStar()}>★</button></div></div>{currentDate === today && lateNightPosting && <div className="late-night-note" role="note">Before 2 AM, new writing is filed under {formatDate(today)} so the night stays with the day it belongs to.</div>}
      <section className={`entry ${currentPerson}`}><div className="entry-heading">{label(currentPerson)}<span className="save-state" role="status">{saveState}</span>{saveState === "Conflict" && <span className="save-conflict">This entry changed on the server. Your local text is preserved; reload to review before saving.</span>}</div><textarea aria-label={`${currentPerson === "tali" ? "Tali" : "Alex"}’s editable entry`} placeholder="How was today?" value={entry[currentPerson]} onChange={(event) => updateEntry(event.target.value)} /><div className="entry-footer"><button className={`done-button ${entry[`${currentPerson}Done`] ? "is-done" : ""}`} onClick={() => { const next = { ...entry, [`${currentPerson}Done`]: !entry[`${currentPerson}Done`] }; upsertEntry(next); setAlexOpen(true); void saveOwn(currentDate, next[currentPerson], Boolean(next[`${currentPerson}Done`])); }}>{entry[`${currentPerson}Done`] ? "Done ✓" : "Done"}</button></div></section>
      <section className={`entry ${partner} alex-entry ${visiblePartner ? "" : "collapsed"}`}><button className="partner-preview" aria-expanded={visiblePartner} onClick={() => setAlexOpen(!visiblePartner)}><span>{label(partner)}<span className="partner-status">{entry[partner] ? `${partner === "tali" ? "Tali" : "Alex"} wrote today` : `${partner === "tali" ? "Tali" : "Alex"} hasn’t written yet`}</span></span><span className="preview-action">{visiblePartner ? "Hide" : "Read"}</span></button>{visiblePartner && <div className="alex-details"><textarea aria-label={`${partner === "tali" ? "Tali" : "Alex"}’s entry, read only`} readOnly value={entry[partner]} placeholder={`${partner === "tali" ? "Tali" : "Alex"} hasn’t written yet`} /></div>}</section>{entry.taliDone && entry.alexDone && <div className="recorded-message show">{currentDate === today ? "Today is recorded." : "This day is recorded."}</div>}</article>
      {currentDate === today && blanks.length > 0 && <article className="support-card missing-card show"><h3>{blanks.length} recent blank days</h3><p>Only blank days from the past week appear here.</p><div className="missing-days">{blanks.map((date) => <button className="missing-day" key={date} onClick={() => openDate(date, "Today")}>{formatDate(date).replace(",", "")}</button>)}</div></article>}
      {currentDate === today && onThisDay && <article className="support-card"><h3>On this day</h3><p>From this date in an earlier year.</p><button className="memory-date" onClick={() => openDate(onThisDay.date, "Today")}><span className="memory-date-title">{formatDate(onThisDay.date)}</span><span className="memory-badge">{Number(today.slice(0, 4)) - Number(onThisDay.date.slice(0, 4))} years ago</span></button></article>}</section>}
    {view === "days" && <section className="card panel"><div className="panel-toolbar"><div><h2 className="panel-title">Days</h2><span className="panel-count">{recorded.length} days</span></div><div className="view-toggle"><button className={daysView === "feed" ? "active" : ""} onClick={() => setDaysView("feed")}>Feed</button><button className={daysView === "calendar" ? "active" : ""} onClick={() => setDaysView("calendar")}>Calendar</button></div></div>{daysView === "feed" ? <Feed entries={recorded} openDate={openDate} toggleStar={toggleStar} /> : <div><div className="calendar-title">{new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${currentDate.slice(0, 7)}-01T12:00:00Z`))}</div><div className="calendar-grid">{monthDays.map((date) => { const dayEntry = entries.find((item) => item.date === date); return <button className={`calendar-day ${date === today ? "today" : date === calendarToday ? "calendar-today" : ""} ${dayEntry?.starred ? "is-starred" : ""}`} disabled={date > today} key={date} onClick={() => openDate(date, "Calendar")}><span>{Number(date.slice(-2))}</span><span className="calendar-dots">{dayEntry?.tali && <span className="calendar-dot tali-dot" />}{dayEntry?.alex && <span className="calendar-dot alex-dot" />}</span></button>; })}</div></div>}</section>}
    {view === "lookBack" && <section className="card panel"><h2 className="panel-title">Search &amp; starred</h2><input className="search-input" type="search" placeholder="Search your days…" value={query} onChange={(event) => setQuery(event.target.value)} /><div className="stat-card"><strong>{recorded.length}</strong><span>days recorded</span></div><h3 className="results-heading">{searchTerms.length ? `${results.length} search ${results.length === 1 ? "result" : "results"}` : "Starred days"}</h3><Feed entries={results} openDate={openDate} toggleStar={toggleStar} searchTerms={searchTerms} emptyMessage={searchTerms.length ? "No matching days." : "Star a day to keep it close."} /><div className="export-diary"><div><h3>Keep a copy</h3><p>Download every recorded day in spreadsheet format.</p></div><button type="button" onClick={exportDiary}>Export CSV</button></div></section>}
    <nav className="bottom-nav" aria-label="Main navigation">{[["today","Today"],["days","Days"],["lookBack","Look back"]].map(([id, text]) => <button key={id} className={`nav-button ${view === id ? "active" : ""}`} onClick={() => { setReturnContext(null); setView(id as View); }}>{text}</button>)}</nav>
  </main>;
}
function upsert(entries: DiaryEntry[], next: DiaryEntry) { return entries.some((item) => item.date === next.date) ? entries.map((item) => item.date === next.date ? next : item) : [next, ...entries]; }
function HighlightedText({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length || !text) return <>{text}</>;
  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  return <>{text.split(pattern).map((part, index) => terms.some((term) => part.toLowerCase() === term) ? <mark className="search-highlight" key={`${part}-${index}`}>{part}</mark> : part)}</>;
}
function SearchSnippet({ text, terms }: { text: string; terms: string[] }) {
  const excerpt = searchExcerpt(text, terms);
  return <span className={`snippet-text ${excerpt ? "search-context" : ""}`}><HighlightedText text={(excerpt ?? text) || "—"} terms={terms} /></span>;
}
function Feed({ entries, openDate, toggleStar, searchTerms = [], emptyMessage = "No matching days." }: { entries: DiaryEntry[]; openDate: (date: string) => void; toggleStar: (date: string) => void | Promise<void>; searchTerms?: string[]; emptyMessage?: string }) { return <div className="feed-list">{entries.length ? entries.map((entry) => <article className="feed-item" key={entry.date} onClick={() => openDate(entry.date)}><div className="feed-item-header"><div className="feed-date"><HighlightedText text={formatDate(entry.date)} terms={searchTerms} /></div><button className={`feed-star ${entry.starred ? "is-starred" : ""}`} aria-label="Star day" onClick={(event) => { event.stopPropagation(); void toggleStar(entry.date); }}>★</button></div><div className="snippet-list"><div className="snippet-row">{label("tali")}<SearchSnippet text={entry.tali} terms={searchTerms} /></div><div className="snippet-row">{label("alex")}<SearchSnippet text={entry.alex} terms={searchTerms} /></div></div></article>) : <div className="empty-state">{emptyMessage}</div>}</div>; }
