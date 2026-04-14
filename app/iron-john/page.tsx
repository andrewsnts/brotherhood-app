"use client";

import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { AVATAR_BG, getGroupWeekNumber, getGroupDayNumber } from "@/lib/types";
import { getMembers, getIronJohnJournal, saveIronJohnJournal, initDb } from "@/lib/api";

// ── Schedule ───────────────────────────────────────────────

interface SessionData {
  day: string;
  label: string;
  bookRef: string;
  done?: boolean;
  missed?: boolean;
  reading?: string;
  reflection?: string;
  practice?: string;
  combined?: boolean;
  part1?: { heading: string; reading: string; reflection: string; practice: string };
  part2?: { heading: string; reading: string; reflection: string; practice: string };
}

interface WeekData {
  week: number;
  theme: string;
  catchup?: boolean;
  done?: boolean;
  sessions: SessionData[];
}

const SCHEDULE: WeekData[] = [
  {
    week: 1, theme: "The Wild Man", done: true,
    sessions: [
      {
        day: "Tuesday", label: "Introduction & Ch. 1: The Pillow and the Key",
        bookRef: "Ch. 1 — The Iron John fairy tale", done: true,
        reading: "Read the Iron John fairy tale in full. Bly's opening meditation on the Wild Man archetype.",
        reflection: "When have you felt something wild or untamed in yourself — and what did you do with it?",
        practice: "Journal for 10 minutes on a part of your nature you've kept locked away. Share one sentence with the group.",
      },
      {
        day: "Thursday", label: "The wound of the father & meeting Iron John",
        bookRef: "Ch. 1 continued", done: true,
        reading: "The boy's first encounter with Iron John and the significance of the golden ball falling into the cage.",
        reflection: "What is your 'golden ball' — the playful, innocent part of you that got lost?",
        practice: "Find a physical object that represents something lost from your boyhood. Bring it next session.",
      },
    ],
  },
  {
    week: 2, theme: "Leaving Home", done: true,
    sessions: [
      {
        day: "Tuesday", label: "Ch. 2: When One Hair Turns Gold",
        bookRef: "Ch. 2 — When One Hair Turns Gold", done: true,
        reading: "The boy steals the key from under his mother's pillow. The initiation begins — departure from the mother wound.",
        reflection: "What was a moment when you broke a rule or betrayed a comfort in order to grow?",
        practice: "Write a letter (unsent) to your mother or primary caregiver about something you needed but didn't receive.",
      },
      {
        day: "Thursday", label: "The forest and the source of grief",
        bookRef: "Ch. 2 continued", missed: true,
        reading: "Iron John as mentor and initiator. Bly on the male initiation wound and the sacred grief men carry.",
        reflection: "What grief have you carried quietly that you've never fully acknowledged?",
        practice: "Find 5 minutes alone in nature. Sit with whatever comes up. No phone.",
      },
    ],
  },
  {
    week: 3, theme: "The Road of Ash", catchup: true,
    sessions: [
      {
        day: "Tuesday", label: "Catch-up: Week 2 Thursday material",
        bookRef: "Ch. 2 continued — Iron John as mentor",
        reading: "Iron John as mentor and initiator. Bly on the male initiation wound and the sacred grief men carry.",
        reflection: "What grief have you carried quietly that you've never fully acknowledged?",
        practice: "Find 5 minutes alone in nature this week. Sit with whatever comes up. No phone.",
      },
      {
        day: "Thursday", label: "Combined: Ch. 3 Road of Ashes (both sessions)",
        bookRef: "Ch. 3 — The Road of Ashes, Descent, and Grief (full chapter)",
        combined: true,
        part1: {
          heading: "First half — descent and naïve inflation",
          reading: "Bly on male descent, the naïve boy's romantic inflation, and the importance of going down before going up.",
          reflection: "Describe a descent in your own life — a failure, loss, or humbling. What did it cost you?",
          practice: "Share with one man in the group something you are ashamed of. Practice receiving his witness without deflecting.",
        },
        part2: {
          heading: "Second half — ashes and the cook's kitchen",
          reading: "The boy hides under ashes and serves in the kitchen — the humiliation stage. Men's relationship to service and invisibility.",
          reflection: "Where in your life are you 'hiding in the kitchen' — capable of more but playing small?",
          practice: "Do one act of anonymous service this week — something no one will know you did. Notice how it feels.",
        },
      },
    ],
  },
  {
    week: 4, theme: "The Mentor & Masculine Inheritance",
    sessions: [
      {
        day: "Tuesday", label: "Ch. 4: The Hunger for the King in a Time with No Father",
        bookRef: "Ch. 4",
        reading: "Bly on father hunger, the absent father, and the wound passed down through generations.",
        reflection: "What did you receive from your father? What did you not receive? Be specific.",
        practice: "Call or write to your father (or father figure) — or if he's gone, write to him. Say one true thing.",
      },
      {
        day: "Thursday", label: "Finding the inner king and male mentorship",
        bookRef: "Ch. 4 continued",
        reading: "The difference between a mentor and a buddy. Iron John as the older male energy that initiates.",
        reflection: "Who were the true mentors in your life — men who told you a hard truth?",
        practice: "Identify one younger man in your life. Do one concrete thing this week to show up for him.",
      },
    ],
  },
  {
    week: 5, theme: "The Male Body & Warrior Energy",
    sessions: [
      {
        day: "Tuesday", label: "Ch. 5: The Sword and the Rainbow Garment",
        bookRef: "Ch. 5",
        reading: "Bly on the warrior spirit, how men are taught to avoid fierceness, and healthy aggression vs violence.",
        reflection: "When did you last feel genuine fierceness or righteous anger? What did you do with it?",
        practice: "Say no to something you'd normally go along with to keep the peace. Notice what it costs and gives.",
      },
      {
        day: "Thursday", label: "The body and physical initiation",
        bookRef: "Ch. 5 continued",
        reading: "How initiation in traditional cultures involved physical ordeal. The modern male body as disconnected from challenge.",
        reflection: "When did physical hardship last teach you something?",
        practice: "Do something physically hard and voluntary this week — cold shower, run, fast. Share what you noticed.",
      },
    ],
  },
  {
    week: 6, theme: "The Inner Woman & Grief",
    sessions: [
      {
        day: "Tuesday", label: "Ch. 6: The Knight in Rusty Armor",
        bookRef: "Ch. 6",
        reading: "Bly on the anima, romantic projection, and how men confuse the inner feminine with external women.",
        reflection: "Who have you expected to carry something that was actually yours to develop in yourself?",
        practice: "Identify one quality you've projected onto a partner. Journal about how to cultivate it yourself.",
      },
      {
        day: "Thursday", label: "The grieving man and sacred sorrow",
        bookRef: "Ch. 6 continued",
        reading: "Bly on sacred male sorrow and why grief is a masculine strength, not a weakness.",
        reflection: "What losses have you never properly grieved? What would it mean to grieve fully?",
        practice: "In pairs: 5 uninterrupted minutes each to speak about a loss. Listener only witnesses — no advice.",
      },
    ],
  },
  {
    week: 7, theme: "The Return & Kingly Energy",
    sessions: [
      {
        day: "Tuesday", label: "Ch. 7: Ascending to the Kingdom",
        bookRef: "Ch. 7",
        reading: "The boy returns tested, with something to offer. Kingly energy — blessing, order, and nourishing the realm.",
        reflection: "What have your hardships qualified you to offer others?",
        practice: "Write down three ways you are actively nourishing those in your care. Are there gaps?",
      },
      {
        day: "Thursday", label: "The king's blessing and male generativity",
        bookRef: "Ch. 7 continued",
        reading: "The importance of the male blessing. How fathers and elder men withhold it — and what that costs boys.",
        reflection: "Did you receive a blessing from an older man? If so, describe it. If not — what would it have meant?",
        practice: "Give a genuine, specific blessing to each man in the group tonight. Say it out loud, directly.",
      },
    ],
  },
  {
    week: 8, theme: "Integration & The Full Man",
    sessions: [
      {
        day: "Tuesday", label: "Ch. 8: Iron John and the Integrated Man",
        bookRef: "Ch. 8 — conclusion",
        reading: "Iron John revealed — the Wild Man freed and integrated. Bly's vision of the full, initiated man.",
        reflection: "Looking back at 8 weeks: what shifted? What do you understand now that you didn't before?",
        practice: "Write your own 'Iron John story' in one page — the arc of your initiation, what you've lost and found.",
      },
      {
        day: "Thursday", label: "Closing circle — witness and commitment",
        bookRef: "Full arc of the book",
        reading: "No new reading. Bring your written story from Tuesday.",
        reflection: "What one commitment will you carry forward from this work? State it clearly, in front of the group.",
        practice: "Each man shares his one-page story. Group receives it in silence, then offers one word of witness. Close with a shared ritual.",
      },
    ],
  },
];

// ── Current Session Detection ──────────────────────────────
// Group started March 30, 2026 — first session Tuesday March 31
// Sessions: Tuesday + Thursday each week

const FIRST_TUESDAY = new Date("2026-03-31T00:00:00");

function getCurrentSession(): { week: number; idx: number } {
  const now = new Date();
  for (let w = 1; w <= 8; w++) {
    const tue = new Date(FIRST_TUESDAY);
    tue.setDate(FIRST_TUESDAY.getDate() + (w - 1) * 7);
    const thu = new Date(tue);
    thu.setDate(tue.getDate() + 2);
    const nextTue = new Date(tue);
    nextTue.setDate(tue.getDate() + 7);

    if (now < thu) return { week: w, idx: 0 };   // before or on Tue → Tuesday session
    if (now < nextTue) return { week: w, idx: 1 }; // Thu through Mon → Thursday session
  }
  return { week: 8, idx: 1 };
}

// Session part ID stored in DB: week * 10 + sessionIndex
function partId(week: number, idx: number) { return week * 10 + idx; }

// ── Storage ────────────────────────────────────────────────

interface PartEntry {
  partNum: number;
  memberId: string;
  reflection: string;
  practiceNote: string;
  completedAt: string | null;
}

// ── Page ──────────────────────────────────────────────────

export default function IronJohnPage() {
  const [members, setMembers] = useState<{ id: string; name: string; color: string }[]>([]);
  const [entries, setEntries] = useState<PartEntry[]>([]);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set());

  const current = getCurrentSession();
  const now = new Date();
  const groupWeek = getGroupWeekNumber(now);
  const groupDay = getGroupDayNumber(now);

  useEffect(() => {
    async function init() {
      await initDb();
      const m = await getMembers();
      setMembers(m);
      if (m.length > 0) setActiveMemberId(m[0].id);
    }
    init();
    // Auto-open current week
    setOpenWeeks(new Set([current.week]));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleWeek(week: number) {
    setOpenWeeks((prev) => {
      const next = new Set(prev);
      next.has(week) ? next.delete(week) : next.add(week);
      return next;
    });
  }

  const completedCount = new Set(
    entries.filter((e) => e.completedAt).map((e) => e.partNum)
  ).size;
  const totalSessions = SCHEDULE.reduce((a, w) => a + w.sessions.length, 0);
  const progressPct = Math.round((completedCount / totalSessions) * 100);

  return (
    <div className="min-h-screen bg-[#0d0f14] pb-28">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="px-5 pt-8 pb-1">
          <h2 className="text-[32px] font-bold text-white leading-none">Iron John</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[13px] text-[#8b93a7]">Week {groupWeek}</span>
            <span className="text-[#4b5563]">·</span>
            <span className="text-[13px] text-[#8b93a7]">Day {groupDay}</span>
            <span className="text-[#4b5563]">·</span>
            <span className="text-[13px] text-[#8b93a7]">Robert Bly</span>
          </div>
        </div>

        {/* Progress */}
        <div className="px-5 mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[#4b5563] tracking-[0.15em] uppercase">Course Progress</span>
            <span className="text-[12px] font-bold text-[#7c6af7]">{completedCount}/{totalSessions} · {progressPct}%</span>
          </div>
          <div className="h-1.5 bg-[#1e2230] rounded-full overflow-hidden">
            <div className="h-full bg-[#7c6af7] rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Member selector */}
        {members.length > 1 && (
          <div className="flex gap-2 px-5 mt-4 flex-wrap">
            {members.map((m) => (
              <button key={m.id} onClick={() => setActiveMemberId(m.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${activeMemberId === m.id ? "bg-[#7c6af7] text-white" : "bg-[#161922] text-[#8b93a7] hover:text-white"}`}>
                <div className={`w-5 h-5 rounded-full ${AVATAR_BG[m.color] ?? "bg-indigo-600"} flex items-center justify-center text-white font-bold text-[10px]`}>
                  {m.name[0].toUpperCase()}
                </div>
                {m.name}
              </button>
            ))}
          </div>
        )}

        {/* Week cards */}
        <div className="px-4 mt-5 space-y-3 pb-4">
          {SCHEDULE.map((week) => {
            const isOpen = openWeeks.has(week.week);
            const hasCurrentSession = week.week === current.week;

            return (
              <div key={week.week}
                className={`rounded-2xl overflow-hidden border ${week.catchup ? "border-amber-500/30" : hasCurrentSession ? "border-[#7c6af7]/40" : "border-white/[0.06]"} bg-[#161922]`}>
                {/* Week header */}
                <button onClick={() => toggleWeek(week.week)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors">
                  <span className="text-[11px] font-semibold bg-[#0d0f14] border border-white/10 rounded-md px-2 py-0.5 text-[#8b93a7] shrink-0">
                    Week {week.week}
                  </span>
                  {week.catchup && (
                    <span className="text-[10px] font-semibold bg-amber-500/15 text-amber-400 rounded-md px-2 py-0.5 shrink-0">catch-up</span>
                  )}
                  {hasCurrentSession && (
                    <span className="text-[10px] font-semibold bg-[#7c6af7]/20 text-[#7c6af7] rounded-md px-2 py-0.5 shrink-0">current</span>
                  )}
                  <span className="text-[14px] font-semibold text-white flex-1 truncate">{week.theme}</span>
                  {week.done && <span className="text-[11px] text-emerald-400 shrink-0">✓ done</span>}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>

                {/* Sessions */}
                {isOpen && (
                  <div className="border-t border-white/[0.05] px-4 py-4 space-y-4">
                    {week.sessions.map((session, idx) => {
                      const isCurrent = week.week === current.week && idx === current.idx;
                      const pid = partId(week.week, idx);
                      return (
                        <SessionCard
                          key={idx}
                          session={session}
                          isCurrent={isCurrent}
                          partId={pid}
                          activeMemberId={activeMemberId}
                          members={members}
                          entries={entries}
                          setEntries={setEntries}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

// ── Session Card ───────────────────────────────────────────

function SessionCard({
  session, isCurrent, partId, activeMemberId, members, entries, setEntries,
}: {
  session: SessionData;
  isCurrent: boolean;
  partId: number;
  activeMemberId: string | null;
  members: { id: string; name: string; color: string }[];
  entries: PartEntry[];
  setEntries: React.Dispatch<React.SetStateAction<PartEntry[]>>;
}) {
  const [draftReflection, setDraftReflection] = useState("");
  const [draftPractice, setDraftPractice] = useState("");
  const [saved, setSaved] = useState(false);

  const memberEntry = activeMemberId
    ? entries.find((e) => e.partNum === partId && e.memberId === activeMemberId) ?? null
    : null;

  useEffect(() => {
    if (!activeMemberId) return;
    async function load() {
      const j = await getIronJohnJournal(activeMemberId!, partId);
      setDraftReflection(j?.reflection ?? "");
      setDraftPractice(j?.practiceNote ?? "");
      if (j) {
        setEntries((prev) => {
          const filtered = prev.filter((e) => !(e.partNum === partId && e.memberId === activeMemberId));
          return [...filtered, { partNum: j.partId, memberId: j.memberId, reflection: j.reflection, practiceNote: j.practiceNote, completedAt: j.completedAt }];
        });
      }
    }
    load();
  }, [activeMemberId, partId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(markComplete: boolean) {
    if (!activeMemberId) return;
    const completedAt = markComplete ? new Date().toISOString() : (memberEntry?.completedAt ?? null);
    await saveIronJohnJournal({ memberId: activeMemberId, partId, reflection: draftReflection, practiceNote: draftPractice, completedAt });
    setEntries((prev) => {
      const filtered = prev.filter((e) => !(e.partNum === partId && e.memberId === activeMemberId));
      return [...filtered, { partNum: partId, memberId: activeMemberId, reflection: draftReflection, practiceNote: draftPractice, completedAt }];
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const isCompleted = !!memberEntry?.completedAt;

  const borderClass = isCurrent
    ? "border-[#7c6af7]/50 bg-[#7c6af7]/5"
    : session.missed
    ? "border-amber-500/30 opacity-60"
    : session.done
    ? "border-emerald-500/20"
    : "border-white/[0.06]";

  return (
    <div className={`rounded-xl border ${borderClass}`}>
      {/* Session header */}
      <div className="px-4 pt-3.5 pb-3">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${isCurrent ? "text-[#7c6af7]" : "text-[#6b7280]"}`}>
            {session.day}
          </span>
          {isCurrent && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-[#7c6af7] bg-[#7c6af7]/15 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7c6af7] inline-block animate-pulse" />
              TODAY
            </span>
          )}
          {session.missed && <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">missed</span>}
          {session.done && !isCurrent && <span className="text-[11px] text-emerald-400">✓</span>}
          {isCompleted && <span className="text-[11px] text-emerald-400 ml-auto">Journal saved ✓</span>}
        </div>
        <p className="text-[14px] font-semibold text-white">{session.label}</p>
        <p className="text-[11px] text-amber-400/80 mt-0.5">{session.bookRef}</p>
      </div>

      {/* Content */}
      <div className="px-4 pb-3 space-y-3 border-t border-white/[0.05]">
        {session.combined && session.part1 && session.part2 ? (
          <>
            <CombinedPart part={session.part1} />
            <div className="border-t border-dashed border-white/10 my-2" />
            <CombinedPart part={session.part2} />
          </>
        ) : (
          <>
            {session.reading && <Block label="Reading Focus" content={session.reading} />}
            {session.reflection && <Block label="Reflection" content={session.reflection} />}
            {session.practice && <Block label="Practice" content={session.practice} />}
          </>
        )}

        {/* Journal */}
        {activeMemberId && (
          <div className="mt-3 space-y-2 pt-3 border-t border-white/[0.05]">
            <p className="text-[10px] font-bold text-[#6b7280] tracking-widest uppercase">Your Journal</p>
            <JournalField label="Reflection" value={draftReflection} onChange={setDraftReflection} />
            <JournalField label="Practice notes" value={draftPractice} onChange={setDraftPractice} />
            <div className="flex gap-2 pt-1">
              <button onClick={() => handleSave(false)}
                className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-colors ${saved ? "bg-emerald-500 text-white" : "bg-[#0d0f14] border border-white/10 text-[#8b93a7] hover:text-white"}`}>
                {saved ? "Saved!" : "Save"}
              </button>
              {!isCompleted && (
                <button onClick={() => handleSave(true)}
                  className="flex-1 py-2 rounded-xl text-[13px] font-semibold bg-[#7c6af7] text-white hover:bg-[#6c5ae7] transition-colors">
                  Mark Complete
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CombinedPart({ part }: { part: { heading: string; reading: string; reflection: string; practice: string } }) {
  return (
    <div className="space-y-2 pt-3">
      <p className="text-[11px] font-bold text-amber-400 tracking-wider uppercase">{part.heading}</p>
      <Block label="Reading Focus" content={part.reading} />
      <Block label="Reflection" content={part.reflection} />
      <Block label="Practice" content={part.practice} />
    </div>
  );
}

function Block({ label, content }: { label: string; content: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-[#6b7280] tracking-wider uppercase mb-1">{label}</p>
      <p className="text-[13px] text-[#c9cdd8] leading-relaxed">{content}</p>
    </div>
  );
}

function JournalField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="bg-[#0d0f14] rounded-xl px-3 py-2.5">
      <p className="text-[10px] font-semibold text-[#6b7280] tracking-wider uppercase mb-1.5">{label}</p>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2}
        className="w-full bg-transparent text-[13px] text-white placeholder:text-[#374151] resize-none outline-none"
        placeholder="Write here..." />
    </div>
  );
}
