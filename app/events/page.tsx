"use client";

import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { Member, AVATAR_BG } from "@/lib/types";
import { getMembers, initDb } from "@/lib/api";

type Recurrence = "none" | "weekly" | "biweekly" | "monthly";

interface Event {
  id: string;
  memberId: string;
  title: string;
  description: string;
  location: string;
  eventDate: string;
  eventTime: string;
  recurrence: Recurrence;
  createdAt: string;
}

const RECURRENCE_OPTIONS: { value: Recurrence; label: string; desc: string }[] = [
  { value: "none", label: "One-time", desc: "" },
  { value: "weekly", label: "Weekly", desc: "Every week" },
  { value: "biweekly", label: "Biweekly", desc: "Every 2 weeks" },
  { value: "monthly", label: "Monthly", desc: "Every month" },
];

// For a recurring event, compute the next occurrence >= today
function getNextOccurrence(eventDate: string, recurrence: Recurrence): string {
  if (recurrence === "none") return eventDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let d = new Date(eventDate + "T12:00:00");

  while (d < today) {
    if (recurrence === "weekly") d.setDate(d.getDate() + 7);
    else if (recurrence === "biweekly") d.setDate(d.getDate() + 14);
    else if (recurrence === "monthly") d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().split("T")[0];
}

function getDisplayDate(event: Event): string {
  return getNextOccurrence(event.eventDate, event.recurrence);
}

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: String(d.getDate()),
    year: String(d.getFullYear()),
  };
}

function formatTime(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function isToday(dateStr: string): boolean {
  return new Date().toDateString() === new Date(dateStr + "T12:00:00").toDateString();
}

function isPast(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + "T12:00:00") < today;
}

async function fetchEvents(): Promise<Event[]> {
  const res = await fetch("/api/events");
  if (!res.ok) return [];
  return res.json();
}

async function postEvent(e: Omit<Event, "id" | "createdAt">): Promise<void> {
  await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...e, id: crypto.randomUUID(), createdAt: new Date().toISOString() }),
  });
}

async function deleteEvent(id: string): Promise<void> {
  await fetch("/api/events", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

export default function EventsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const [formMemberId, setFormMemberId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formRecurrence, setFormRecurrence] = useState<Recurrence>("none");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      await initDb();
      const [m, e] = await Promise.all([getMembers(), fetchEvents()]);
      setMembers(m);
      setEvents(e);
      if (m.length > 0) setFormMemberId(m[0].id);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formDate || !formMemberId) return;
    setSaving(true);
    await postEvent({
      memberId: formMemberId,
      title: formTitle.trim(),
      description: formDesc.trim(),
      location: formLocation.trim(),
      eventDate: formDate,
      eventTime: formTime,
      recurrence: formRecurrence,
    });
    const updated = await fetchEvents();
    setEvents(updated);
    setFormTitle(""); setFormDate(""); setFormTime("");
    setFormLocation(""); setFormDesc(""); setFormRecurrence("none");
    setSaving(false);
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    await deleteEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  // For display, use next occurrence date for recurring events
  const withDisplayDate = events.map((e) => ({ ...e, displayDate: getDisplayDate(e) }));
  const upcoming = withDisplayDate
    .filter((e) => !isPast(e.displayDate))
    .sort((a, b) => a.displayDate.localeCompare(b.displayDate));
  const past = withDisplayDate
    .filter((e) => isPast(e.displayDate) && e.recurrence === "none")
    .sort((a, b) => b.displayDate.localeCompare(a.displayDate));

  const displayed = tab === "upcoming" ? upcoming : past;
  const nextEvent = upcoming[0];

  return (
    <div className="min-h-screen bg-[#0d0f14] pb-28">
      <div className="max-w-lg mx-auto">

        <div className="px-5 pt-8 pb-5 flex items-start justify-between">
          <div>
            <h2 className="text-[32px] font-bold text-white leading-none">Events</h2>
            <p className="text-[13px] text-[#8b93a7] mt-2">Meetups & gatherings</p>
          </div>
          <button onClick={() => setShowForm((v) => !v)}
            className="mt-1 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#7c6af7] text-white text-[13px] font-semibold hover:bg-[#6c5ae7] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add
          </button>
        </div>

        {/* Next event banner */}
        {!loading && nextEvent && !showForm && (
          <div className="mx-4 mb-4 bg-[#7c6af7]/10 border border-[#7c6af7]/30 rounded-2xl px-4 py-3 flex items-center gap-4">
            <div className="flex flex-col items-center justify-center bg-[#7c6af7]/20 rounded-xl w-14 h-14 shrink-0">
              <span className="text-[10px] font-bold text-[#7c6af7] tracking-widest uppercase">{formatEventDate(nextEvent.displayDate).month}</span>
              <span className="text-[26px] font-black text-white leading-none">{formatEventDate(nextEvent.displayDate).day}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-[#7c6af7] tracking-widest uppercase mb-0.5">
                {isToday(nextEvent.displayDate) ? "Today" : "Next up"}
              </p>
              <p className="text-[15px] font-bold text-white truncate">{nextEvent.title}</p>
              <p className="text-[12px] text-[#8b93a7] mt-0.5">
                {formatEventDate(nextEvent.displayDate).weekday}
                {nextEvent.eventTime && ` · ${formatTime(nextEvent.eventTime)}`}
                {nextEvent.location && ` · ${nextEvent.location}`}
              </p>
              {nextEvent.recurrence !== "none" && (
                <p className="text-[11px] text-[#7c6af7] mt-0.5">
                  🔁 {RECURRENCE_OPTIONS.find((r) => r.value === nextEvent.recurrence)?.label}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mx-4 mb-4 bg-[#161922] rounded-2xl px-4 py-4 space-y-3">
            <p className="text-[14px] font-semibold text-white">New Event</p>

            <div>
              <label className="text-[11px] font-semibold text-[#6b7280] tracking-wider uppercase block mb-1.5">Added by</label>
              <div className="flex gap-2 flex-wrap">
                {members.map((m) => (
                  <button key={m.id} type="button" onClick={() => setFormMemberId(m.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-medium transition-colors ${formMemberId === m.id ? "bg-[#7c6af7] text-white" : "bg-[#0d0f14] text-[#8b93a7]"}`}>
                    <div className={`w-4 h-4 rounded-full ${AVATAR_BG[m.color] ?? "bg-indigo-600"} flex items-center justify-center text-white font-bold text-[9px]`}>
                      {m.name[0].toUpperCase()}
                    </div>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#0d0f14] rounded-xl px-3 py-2.5">
              <label className="text-[11px] font-semibold text-[#6b7280] tracking-wider uppercase block mb-1">Event name *</label>
              <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Monthly Meetup" required
                className="w-full bg-transparent text-[14px] text-white placeholder:text-[#374151] outline-none" />
            </div>

            <div className="flex gap-2">
              <div className="flex-1 bg-[#0d0f14] rounded-xl px-3 py-2.5">
                <label className="text-[11px] font-semibold text-[#6b7280] tracking-wider uppercase block mb-1">Date *</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required
                  className="w-full bg-transparent text-[14px] text-white outline-none [color-scheme:dark]" />
              </div>
              <div className="flex-1 bg-[#0d0f14] rounded-xl px-3 py-2.5">
                <label className="text-[11px] font-semibold text-[#6b7280] tracking-wider uppercase block mb-1">Time</label>
                <input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)}
                  className="w-full bg-transparent text-[14px] text-white outline-none [color-scheme:dark]" />
              </div>
            </div>

            {/* Recurrence */}
            <div>
              <label className="text-[11px] font-semibold text-[#6b7280] tracking-wider uppercase block mb-1.5">Repeats</label>
              <div className="flex gap-2 flex-wrap">
                {RECURRENCE_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setFormRecurrence(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${formRecurrence === opt.value ? "bg-[#7c6af7] text-white" : "bg-[#0d0f14] text-[#8b93a7]"}`}>
                    {opt.value !== "none" && "🔁 "}{opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#0d0f14] rounded-xl px-3 py-2.5">
              <label className="text-[11px] font-semibold text-[#6b7280] tracking-wider uppercase block mb-1">Location</label>
              <input type="text" value={formLocation} onChange={(e) => setFormLocation(e.target.value)}
                placeholder="Address or link..."
                className="w-full bg-transparent text-[14px] text-white placeholder:text-[#374151] outline-none" />
            </div>

            <div className="bg-[#0d0f14] rounded-xl px-3 py-2.5">
              <label className="text-[11px] font-semibold text-[#6b7280] tracking-wider uppercase block mb-1">Notes</label>
              <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                placeholder="What to bring, agenda..." rows={2}
                className="w-full bg-transparent text-[14px] text-white placeholder:text-[#374151] outline-none resize-none" />
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#0d0f14] text-[#8b93a7] text-[13px] font-semibold hover:text-white transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={!formTitle.trim() || !formDate || saving}
                className="flex-1 py-2.5 rounded-xl bg-[#7c6af7] text-white text-[13px] font-semibold hover:bg-[#6c5ae7] transition-colors disabled:opacity-40">
                {saving ? "Saving..." : "Save Event"}
              </button>
            </div>
          </form>
        )}

        {/* Tabs */}
        <div className="flex gap-2 px-4 mb-4">
          {(["upcoming", "past"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-semibold capitalize transition-colors ${tab === t ? "bg-[#7c6af7] text-white" : "bg-[#161922] text-[#8b93a7] hover:text-white"}`}>
              {t} ({t === "upcoming" ? upcoming.length : past.length})
            </button>
          ))}
        </div>

        {/* Event list */}
        <div className="px-4 space-y-3">
          {loading && <p className="text-[#4b5563] text-sm text-center py-16">Loading...</p>}

          {!loading && displayed.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[#4b5563] text-sm">{tab === "upcoming" ? "No upcoming events." : "No past events."}</p>
              {tab === "upcoming" && <p className="text-[#374151] text-xs mt-1">Tap + Add to schedule one.</p>}
            </div>
          )}

          {!loading && displayed.map((event) => {
            const date = formatEventDate(event.displayDate);
            const member = memberMap[event.memberId];
            const today = isToday(event.displayDate);
            const recurrenceMeta = RECURRENCE_OPTIONS.find((r) => r.value === event.recurrence);

            return (
              <div key={event.id}
                className={`bg-[#161922] rounded-2xl overflow-hidden flex ${today ? "ring-1 ring-[#7c6af7]/40" : ""}`}>
                {/* Date block */}
                <div className="flex flex-col items-center justify-center px-4 py-4 shrink-0 w-20 bg-[#7c6af7]/10">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[#7c6af7]">{date.month}</span>
                  <span className="text-[32px] font-black leading-none text-white">{date.day}</span>
                  <span className="text-[10px] font-medium mt-0.5 text-[#8b93a7]">{date.year}</span>
                </div>

                {/* Content */}
                <div className="flex-1 px-4 py-4 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        {today && (
                          <span className="text-[10px] font-bold text-[#7c6af7] bg-[#7c6af7]/15 px-2 py-0.5 rounded-full">Today</span>
                        )}
                        {event.recurrence !== "none" && (
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            🔁 {recurrenceMeta?.label}
                          </span>
                        )}
                      </div>
                      <p className="text-[15px] font-bold text-white leading-snug">{event.title}</p>
                      <p className="text-[12px] text-[#8b93a7] mt-0.5">
                        {date.weekday}
                        {event.eventTime && ` · ${formatTime(event.eventTime)}`}
                      </p>
                      {event.location && (
                        <div className="flex items-center gap-1 mt-1">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                          </svg>
                          <p className="text-[12px] text-[#6b7280] truncate">{event.location}</p>
                        </div>
                      )}
                      {event.description && (
                        <p className="text-[12px] text-[#6b7280] mt-1.5 leading-relaxed">{event.description}</p>
                      )}
                    </div>
                    <button onClick={() => handleDelete(event.id)}
                      className="text-[#2a2f3e] hover:text-red-400 transition-colors shrink-0 mt-0.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </div>

                  {member && (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/[0.04]">
                      <div className={`w-4 h-4 rounded-full ${AVATAR_BG[member.color] ?? "bg-indigo-600"} flex items-center justify-center text-white font-bold text-[9px]`}>
                        {member.name[0].toUpperCase()}
                      </div>
                      <span className="text-[11px] text-[#4b5563]">Added by {member.name}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
