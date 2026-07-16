"use client";

import { useMemo, useState } from "react";

type Person = "tali" | "alex";
type View = "today" | "days" | "lookBack";
type DaysView = "feed" | "calendar";
type ReturnContext = { view: View; daysView?: DaysView; label: string } | null;

type Entry = { date: string; tali: string; alex: string; starred?: boolean; taliDone?: boolean; alexDone?: boolean };

const TODAY = "2026-07-16";

const initialEntries: Entry[] = [
  { date: TODAY, tali: "", alex: "I’m glad we kept the evening simple. Dinner was good, and I liked sitting together while we each did our own thing.", alexDone: true },
  { date: "2026-07-15", tali: "We took the long way home through the park and the light was so pretty. I was tired all afternoon, but dinner together reset the whole day.", alex: "Good slow evening. The walk was my favorite part, especially when we stopped to look at that extremely serious little dog.", taliDone: true, alexDone: true },
  { date: "2026-07-14", tali: "Busy workday, then we made a giant salad with everything left in the fridge. Somehow it was actually excellent.", alex: "A very normal day in a comforting way. I liked cooking together and listening to the same song three times.", taliDone: true, alexDone: true },
  { date: "2026-07-13", tali: "Coffee, errands, and a long phone call with my mom. I felt scattered this morning and much calmer by bedtime.", alex: "I got more done than I expected. We sat on the couch after dinner and talked about the party, which made it all feel real.", taliDone: true, alexDone: true },
  { date: "2026-07-11", tali: "We went to the farmers market and bought too many peaches. Perfect weather, excellent snacks, no notes ☀️", alex: "One of those days where the city felt especially nice. The peaches are not going to last until Wednesday.", starred: true, taliDone: true, alexDone: true },
  { date: "2026-07-10", tali: "A little grumpy and overwhelmed today, but the evening was soft. Glad we still wrote even though neither of us had much to say.", alex: "Long day. I appreciated the quiet night and going to bed early.", taliDone: true, alexDone: true },
  { date: "2025-07-16", tali: "A really sweet ordinary day. We got sandwiches, sat outside for a long time, and talked about what the next year might look like.", alex: "I remember feeling very lucky today. Nothing huge happened, but I didn’t want the afternoon to end.", starred: true, taliDone: true, alexDone: true },
];

export function KoalaIcon() { return <svg className="animal-icon koala" viewBox="0 0 32 32" aria-hidden="true"><circle cx="7.1" cy="13" r="5" fill="#e6ddd6" stroke="currentColor" strokeWidth="1.4"/><circle cx="24.9" cy="13" r="5" fill="#e6ddd6" stroke="currentColor" strokeWidth="1.4"/><path d="M8.6 17.1c0-6.1 3.2-10.2 7.4-10.2s7.4 4.1 7.4 10.2v.8c0 4.7-3.1 7.8-7.4 7.8s-7.4-3.1-7.4-7.8z" fill="#fffaf5" stroke="currentColor" strokeWidth="1.4"/><circle cx="13" cy="16" r="1" fill="currentColor"/><circle cx="19" cy="16" r="1" fill="currentColor"/><ellipse cx="16" cy="19.1" rx="2.35" ry="2.8" fill="currentColor"/><path d="M14.6 22.2c.7.55 2.1.55 2.8 0" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>; }
export function BearIcon() { return <svg className="animal-icon bear" viewBox="0 0 32 32" aria-hidden="true"><circle cx="9" cy="9.4" r="3.7" fill="#ead4c3" stroke="currentColor" strokeWidth="1.4"/><circle cx="23" cy="9.4" r="3.7" fill="#ead4c3" stroke="currentColor" strokeWidth="1.4"/><path d="M7.7 16.5c0-6 3.4-10 8.3-10s8.3 4 8.3 10v1.8c0 4.7-3.5 7.7-8.3 7.7s-8.3-3-8.3-7.7z" fill="#fff8f1" stroke="currentColor" strokeWidth="1.4"/><circle cx="12.7" cy="15.7" r="1" fill="currentColor"/><circle cx="19.3" cy="15.7" r="1" fill="currentColor"/><ellipse cx="16" cy="20" rx="4" ry="3.2" fill="#f1dfd1" stroke="currentColor" strokeWidth="1"/><ellipse cx="16" cy="18.9" rx="1.7" ry="1.35" fill="currentColor"/><path d="M16 20.1v1.2m-1.5.5c.8.65 2.2.65 3 0" fill="none" stroke="currentColor" strokeWidth="1.05" strokeLinecap="round"/></svg>; }

function label(person: Person) { return <span className="person-label">{person === "tali" ? <KoalaIcon /> : <BearIcon />}<span>{person === "tali" ? "Tali" : "Alex"}</span></span>; }
export const formatDate = (key: string) => new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: key.startsWith("2026") ? undefined : "numeric", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));
const written = (entry: Entry) => entry.tali.trim() || entry.alex.trim();
export const recentBlankDays = (entries: Entry[]) => ["2026-07-15","2026-07-14","2026-07-13","2026-07-12","2026-07-11","2026-07-10","2026-07-09"].filter((date) => !entries.find((entry) => entry.date === date && written(entry)));

export function DiaryApp() {
  const [entries, setEntries] = useState(initialEntries);
  const [currentDate, setCurrentDate] = useState(TODAY);
  const [view, setView] = useState<View>("today");
  const [daysView, setDaysView] = useState<DaysView>("feed");
  const [returnContext, setReturnContext] = useState<ReturnContext>(null);
  const [alexOpen, setAlexOpen] = useState(false);
  const [saveState, setSaveState] = useState("Saved");
  const [query, setQuery] = useState("");
  const entry = entries.find((item) => item.date === currentDate) ?? { date: currentDate, tali: "", alex: "" };
  const recorded = entries.filter(written).sort((a, b) => b.date.localeCompare(a.date));
  const blanks = recentBlankDays(entries);
  const onThisDay = entries.find((item) => item.date === "2025-07-16");
  const results = query ? recorded.filter((item) => `${item.tali} ${item.alex} ${formatDate(item.date)}`.toLowerCase().includes(query.toLowerCase())) : recorded.filter((item) => item.starred);
  const visibleAlex = currentDate < TODAY || alexOpen || entry.taliDone;
  const monthDays = useMemo(() => Array.from({ length: 31 }, (_, index) => `2026-07-${String(index + 1).padStart(2, "0")}`), []);

  function updateEntry(text: string) { setSaveState("Saving…"); setEntries((all) => upsert(all, { ...entry, tali: text })); window.setTimeout(() => setSaveState("Saved"), 300); }
  function upsertEntry(next: Entry) { setEntries((all) => upsert(all, next)); }
  function openDate(date: string, labelText = view === "days" ? (daysView === "calendar" ? "Calendar" : "Feed") : view === "lookBack" ? "Look Back" : "Today") { setReturnContext({ view, daysView, label: labelText }); setCurrentDate(date); setAlexOpen(date < TODAY); setView("today"); }
  function toggleStar(date = currentDate) { const target = entries.find((item) => item.date === date) ?? { date, tali: "", alex: "" }; upsertEntry({ ...target, starred: !target.starred }); }

  return <main className="app"><header className="app-header"><div className="brand"><h1>Dear Diary</h1><p>A private daily journal for Tali &amp; Alex</p></div></header>
    {view === "today" && <section><article className="card"><div className="day-header">{returnContext && <button className="context-back show" onClick={() => { setView(returnContext.view); if (returnContext.daysView) setDaysView(returnContext.daysView); setReturnContext(null); }}>‹ Back to {returnContext.label}</button>}<div className="day-heading-row"><div className="day-title"><h2>{formatDate(currentDate)}</h2><p>{currentDate === TODAY ? "Writing for today" : "Writing for this day"}</p></div><button className={`star-button ${entry.starred ? "is-starred" : ""}`} aria-pressed={Boolean(entry.starred)} aria-label="Star this day" onClick={() => toggleStar()}>★</button></div></div>
      <section className="entry tali"><div className="entry-heading">{label("tali")}<span className="save-state">{saveState}</span></div><textarea aria-label="Tali’s editable entry" placeholder="How was today?" value={entry.tali} onChange={(event) => updateEntry(event.target.value)} /><div className="entry-footer"><button className={`done-button ${entry.taliDone ? "is-done" : ""}`} onClick={() => { upsertEntry({ ...entry, taliDone: !entry.taliDone }); setAlexOpen(true); }}>{entry.taliDone ? "Done ✓" : "Done"}</button></div></section>
      <section className={`entry alex alex-entry ${visibleAlex ? "" : "collapsed"}`}><button className="partner-preview" aria-expanded={visibleAlex} onClick={() => setAlexOpen(!visibleAlex)}><span>{label("alex")}<span className="partner-status">{entry.alex ? "Alex wrote today" : "Alex hasn’t written yet"}</span></span><span className="preview-action">{visibleAlex ? "Hide" : "Read"}</span></button>{visibleAlex && <div className="alex-details"><textarea aria-label="Alex’s entry, read only" readOnly value={entry.alex} placeholder="Alex hasn’t written yet" /></div>}</section>{entry.taliDone && entry.alexDone && <div className="recorded-message show">{currentDate === TODAY ? "Today is recorded." : "This day is recorded."}</div>}</article>
      {currentDate === TODAY && blanks.length > 0 && <article className="support-card missing-card show"><h3>{blanks.length} recent blank days</h3><p>Only blank days from the past week appear here.</p><div className="missing-days">{blanks.map((date) => <button className="missing-day" key={date} onClick={() => openDate(date, "Today")}>{formatDate(date).replace(",", "")}</button>)}</div></article>}
      {currentDate === TODAY && onThisDay && <article className="support-card"><h3>On this day</h3><p>From this date in an earlier year.</p><button className="memory-date" onClick={() => openDate(onThisDay.date, "Today")}><span className="memory-date-title">{formatDate(onThisDay.date)}</span><span className="memory-badge">1 year ago</span></button></article>}<p className="prototype-note">Prototype · Tali’s view · Fictional local sample data.</p></section>}
    {view === "days" && <section className="card panel"><div className="panel-toolbar"><div><h2 className="panel-title">Days</h2><span className="panel-count">{recorded.length} days</span></div><div className="view-toggle"><button className={daysView === "feed" ? "active" : ""} onClick={() => setDaysView("feed")}>Feed</button><button className={daysView === "calendar" ? "active" : ""} onClick={() => setDaysView("calendar")}>Calendar</button></div></div>{daysView === "feed" ? <Feed entries={recorded} openDate={openDate} toggleStar={toggleStar} /> : <div><div className="calendar-title">July 2026</div><div className="calendar-grid">{monthDays.map((date) => { const dayEntry = entries.find((item) => item.date === date); return <button className={`calendar-day ${date === TODAY ? "today" : ""} ${dayEntry?.starred ? "is-starred" : ""}`} disabled={date > TODAY} key={date} onClick={() => openDate(date, "Calendar")}><span>{Number(date.slice(-2))}</span><span className="calendar-dots">{dayEntry?.tali && <span className="calendar-dot tali-dot" />}{dayEntry?.alex && <span className="calendar-dot alex-dot" />}</span></button>; })}</div></div>}</section>}
    {view === "lookBack" && <section className="card panel"><h2 className="panel-title">Search &amp; starred</h2><input className="search-input" type="search" placeholder="Search your days…" value={query} onChange={(event) => setQuery(event.target.value)} /><div className="stat-card"><strong>{recorded.length}</strong><span>days recorded</span></div><h3 className="results-heading">{query ? "Search results" : "Starred days"}</h3><Feed entries={results} openDate={openDate} toggleStar={toggleStar} /></section>}
    <nav className="bottom-nav" aria-label="Main navigation">{[["today","Today"],["days","Days"],["lookBack","Look back"]].map(([id, text]) => <button key={id} className={`nav-button ${view === id ? "active" : ""}`} onClick={() => { setReturnContext(null); setView(id as View); }}>{text}</button>)}</nav>
  </main>;
}
function upsert(entries: Entry[], next: Entry) { return entries.some((item) => item.date === next.date) ? entries.map((item) => item.date === next.date ? next : item) : [next, ...entries]; }
function Feed({ entries, openDate, toggleStar }: { entries: Entry[]; openDate: (date: string) => void; toggleStar: (date: string) => void }) { return <div className="feed-list">{entries.length ? entries.map((entry) => <article className="feed-item" key={entry.date} onClick={() => openDate(entry.date)}><div className="feed-item-header"><div className="feed-date">{formatDate(entry.date)}</div><button className={`feed-star ${entry.starred ? "is-starred" : ""}`} aria-label="Star day" onClick={(event) => { event.stopPropagation(); toggleStar(entry.date); }}>★</button></div><div className="snippet-list"><div className="snippet-row">{label("tali")}<span className="snippet-text">{entry.tali || "—"}</span></div><div className="snippet-row">{label("alex")}<span className="snippet-text">{entry.alex || "—"}</span></div></div></article>) : <div className="empty-state">No matching days.</div>}</div>; }
