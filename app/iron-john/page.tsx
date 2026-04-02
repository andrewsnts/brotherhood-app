"use client";

import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { AVATAR_BG, getGroupWeekNumber, getGroupDayNumber } from "@/lib/types";
import { getMembers, getIronJohnJournal, saveIronJohnJournal, initDb } from "@/lib/api";

// ── Course Data ────────────────────────────────────────────

interface CoursePart {
  week: number;
  weekTitle: string;
  part: number;
  title: string;
  focus: string;
  read?: string;
  explore?: string[];
  reflection: string[];
  practice: string[];
}

const COURSE: CoursePart[] = [
  {
    week: 1, weekTitle: "Entering the Story", part: 1,
    title: "The Call — Why Iron John?",
    focus: "Orientation + Initiation",
    read: "Preface + beginning reflections",
    explore: ["What is initiation?", "What's missing in modern life?"],
    reflection: ["Where do you feel \"unfinished\" as a man/person?"],
    practice: ["Write your intention for this 8-week journey"],
  },
  {
    week: 1, weekTitle: "Entering the Story", part: 2,
    title: "The Story — Iron John (Full Myth)",
    focus: "Myth as map",
    read: "Full Grimm tale",
    explore: ["Key symbols: forest, cage, boy, wild man"],
    reflection: ["Which part of the story are you currently living?"],
    practice: ["Retell the story in your own words (spoken or written)"],
  },
  {
    week: 2, weekTitle: "The Captured Wild", part: 3,
    title: "The Wild Man in the Cage",
    focus: "Repressed instinct",
    explore: ["What is the \"wild man\" psychologically?"],
    reflection: ["What parts of you are caged or controlled?"],
    practice: ["Notice moments you suppress emotion or instinct"],
  },
  {
    week: 2, weekTitle: "The Captured Wild", part: 4,
    title: "The Key & Liberation",
    focus: "Risk and disobedience",
    explore: ["The boy stealing the key → necessary rebellion"],
    reflection: ["Where do you need to \"break out\"?"],
    practice: ["Take one small, courageous risk this week"],
  },
  {
    week: 3, weekTitle: "Leaving Home", part: 5,
    title: "The Loss of the Golden Ball",
    focus: "Innocence → awareness",
    reflection: ["What have you lost that mattered?"],
    practice: ["Journal: \"What did growing up cost me?\""],
  },
  {
    week: 3, weekTitle: "Leaving Home", part: 6,
    title: "Entering the Forest",
    focus: "The unknown path",
    explore: ["Forest as initiation space"],
    reflection: ["What uncertainty are you avoiding?"],
    practice: ["Do something alone and unfamiliar"],
  },
  {
    week: 4, weekTitle: "Humbling & Building", part: 7,
    title: "The Kitchen — Ego Reduction",
    focus: "Humility & starting low",
    explore: ["Why initiation begins with humility"],
    reflection: ["Where do you resist being \"small\"?"],
    practice: ["Do something meaningful without recognition"],
  },
  {
    week: 4, weekTitle: "Humbling & Building", part: 8,
    title: "The Golden Hair (Hidden Growth)",
    focus: "Inner transformation",
    explore: ["Growth that must remain hidden"],
    reflection: ["What is quietly changing in you?"],
    practice: ["Protect something sacred from external validation"],
  },
  {
    week: 5, weekTitle: "Power & Purpose", part: 9,
    title: "Work, Discipline & Direction",
    focus: "Structure and masculine energy",
    reflection: ["Where are you drifting vs directed?"],
    practice: ["Define one meaningful goal + first step"],
  },
  {
    week: 5, weekTitle: "Power & Purpose", part: 10,
    title: "The King & Authority",
    focus: "External vs internal authority",
    explore: ["Father figures, systems, power"],
    reflection: ["How do you relate to authority?"],
    practice: ["Make one clear decision independently"],
  },
  {
    week: 6, weekTitle: "The Warrior", part: 11,
    title: "Battle & Conflict",
    focus: "Necessary struggle",
    explore: ["Avoidance vs engagement"],
    reflection: ["What conflict needs your attention?"],
    practice: ["Have one honest, direct conversation"],
  },
  {
    week: 6, weekTitle: "The Warrior", part: 12,
    title: "Borrowed Strength & Support",
    focus: "Help from the unconscious / mentors",
    explore: ["The wild man reappearing"],
    reflection: ["When have you been supported unexpectedly?"],
    practice: ["Acknowledge unseen support in your life"],
  },
  {
    week: 7, weekTitle: "Love & Relationship", part: 13,
    title: "Meeting the Feminine",
    focus: "Relationship & vulnerability",
    reflection: ["How comfortable are you with emotional openness?"],
    practice: ["Share something real with someone you trust"],
  },
  {
    week: 7, weekTitle: "Love & Relationship", part: 14,
    title: "Worthiness & Union",
    focus: "Love, commitment, integration",
    explore: ["The king's daughter symbolism"],
    reflection: ["Do you feel worthy of love and success?"],
    practice: ["Notice where you hold back or self-sabotage"],
  },
  {
    week: 8, weekTitle: "Integration & Return", part: 15,
    title: "The Wild Man Revealed",
    focus: "Integration of instinct",
    explore: ["Accepting all parts of self"],
    reflection: ["What part of you is ready to be reclaimed?"],
    practice: ["Express yourself freely (movement, voice, creativity)"],
  },
  {
    week: 8, weekTitle: "Integration & Return", part: 16,
    title: "Living Initiated (Return to the World)",
    focus: "Embodiment & legacy",
    reflection: [
      "What does an \"initiated life\" look like for you?",
      "What are you here to build or pass on?",
    ],
    practice: [
      "Write your personal code / principles",
      "Share one commitment with the group",
    ],
  },
];

const SESSION_FLOW = [
  { step: 1, label: "Opening", time: "5–10 min", desc: "Breath / grounding / short check-in" },
  { step: 2, label: "Teaching", time: "15–20 min", desc: "Core themes + story unpacking" },
  { step: 3, label: "Group Dialogue", time: "20–30 min", desc: "Guided discussion questions" },
  { step: 4, label: "Personal Reflection", time: "10–15 min", desc: "Journaling" },
  { step: 5, label: "Integration Practice", time: "5–10 min", desc: "Action for the week" },
];

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
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedPart, setSelectedPart] = useState(1);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [entries, setEntries] = useState<PartEntry[]>([]);
  const [saved, setSaved] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  useEffect(() => {
    async function init() {
      await initDb();
      const m = await getMembers();
      setMembers(m);
      if (m.length > 0) setActiveMemberId(m[0].id);
    }
    init();
  }, []);

  const weeks = Array.from(new Set(COURSE.map((p) => p.week)));
  const partsForWeek = COURSE.filter((p) => p.week === selectedWeek);
  const currentPart = COURSE.find((p) => p.part === selectedPart) ?? COURSE[0];

  const completedParts = new Set(
    entries.filter((e) => e.completedAt).map((e) => e.partNum)
  );

  const memberEntry = activeMemberId
    ? entries.find((e) => e.partNum === currentPart.part && e.memberId === activeMemberId) ?? null
    : null;

  const [draftReflection, setDraftReflection] = useState("");
  const [draftPractice, setDraftPractice] = useState("");

  // Load draft when part or member changes
  useEffect(() => {
    if (!activeMemberId) return;
    async function loadDraft() {
      const j = await getIronJohnJournal(activeMemberId!, currentPart.part);
      setDraftReflection(j?.reflection ?? "");
      setDraftPractice(j?.practiceNote ?? "");
      setSaved(false);
      if (j) {
        setEntries((prev) => {
          const filtered = prev.filter((e) => !(e.partNum === currentPart.part && e.memberId === activeMemberId));
          return [...filtered, { partNum: j.partId, memberId: j.memberId, reflection: j.reflection, practiceNote: j.practiceNote, completedAt: j.completedAt }];
        });
      }
    }
    loadDraft();
  }, [currentPart.part, activeMemberId]);

  async function handleSave(markComplete: boolean) {
    if (!activeMemberId) return;
    const completedAt = markComplete ? new Date().toISOString() : (memberEntry?.completedAt ?? null);
    await saveIronJohnJournal({
      memberId: activeMemberId,
      partId: currentPart.part,
      reflection: draftReflection,
      practiceNote: draftPractice,
      completedAt,
    });
    setEntries((prev) => {
      const filtered = prev.filter((e) => !(e.partNum === currentPart.part && e.memberId === activeMemberId));
      return [...filtered, { partNum: currentPart.part, memberId: activeMemberId, reflection: draftReflection, practiceNote: draftPractice, completedAt }];
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function selectPart(part: CoursePart) {
    setSelectedWeek(part.week);
    setSelectedPart(part.part);
  }

  const isCompleted = completedParts.has(currentPart.part);
  const progressPct = Math.round((completedParts.size / 16) * 100);
  const now = new Date();
  const groupWeek = getGroupWeekNumber(now);
  const groupDay = getGroupDayNumber(now);

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

      {/* Progress bar */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-[#4b5563] tracking-[0.15em] uppercase">
            Course Progress
          </span>
          <span className="text-[12px] font-bold text-[#7c6af7]">
            {completedParts.size}/16 · {progressPct}%
          </span>
        </div>
        <div className="h-1.5 bg-[#1e2230] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#7c6af7] rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Week selector */}
      <div className="px-4 mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {weeks.map((w) => {
          const weekParts = COURSE.filter((p) => p.week === w);
          const weekDone = weekParts.every((p) => completedParts.has(p.part));
          return (
            <button
              key={w}
              onClick={() => {
                setSelectedWeek(w);
                setSelectedPart(COURSE.find((p) => p.week === w)!.part);
              }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${
                selectedWeek === w
                  ? "bg-[#7c6af7] text-white"
                  : "bg-[#161922] text-[#8b93a7] hover:text-white"
              }`}
            >
              {weekDone ? "✓ " : ""}Wk {w}
            </button>
          );
        })}
      </div>

      <div className="px-4 mt-3">
        {/* Part tabs within the week */}
        <div className="flex gap-2 mb-4">
          {partsForWeek.map((p) => (
            <button
              key={p.part}
              onClick={() => selectPart(p)}
              className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-colors relative ${
                selectedPart === p.part
                  ? "bg-[#161922] text-white border border-[#7c6af7]/50"
                  : "bg-[#161922] text-[#8b93a7] hover:text-white border border-transparent"
              }`}
            >
              {completedParts.has(p.part) && (
                <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
              Part {p.part}
            </button>
          ))}
        </div>

        {/* Week theme + Part header */}
        <div className="bg-gradient-to-br from-[#1e1a3a] to-[#161922] rounded-2xl px-4 py-4 mb-3 border border-[#7c6af7]/15">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-[#7c6af7] tracking-widest uppercase mb-1">
                Week {currentPart.week} — {currentPart.weekTitle}
              </p>
              <h3 className="text-[18px] font-bold text-white leading-tight">
                Part {currentPart.part}: {currentPart.title}
              </h3>
              <p className="text-[13px] text-[#8b93a7] mt-1">
                Focus: {currentPart.focus}
              </p>
            </div>
            {isCompleted && (
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Session flow */}
        <SessionFlow activeStep={activeStep} onStepClick={setActiveStep} />

        {/* Content sections */}
        {currentPart.read && (
          <ContentBlock icon="📖" label="Read" color="#7c6af7">
            <p className="text-[14px] text-[#c9cdd8]">{currentPart.read}</p>
          </ContentBlock>
        )}

        {currentPart.explore && currentPart.explore.length > 0 && (
          <ContentBlock icon="🔍" label="Explore" color="#a855f7">
            <ul className="space-y-1.5">
              {currentPart.explore.map((e, i) => (
                <li key={i} className="flex gap-2 text-[14px] text-[#c9cdd8]">
                  <span className="text-[#6b7280] shrink-0">→</span>
                  {e}
                </li>
              ))}
            </ul>
          </ContentBlock>
        )}

        <ContentBlock icon="🪞" label="Reflection" color="#eab308">
          <ul className="space-y-2">
            {currentPart.reflection.map((r, i) => (
              <li key={i} className="text-[14px] text-[#c9cdd8] italic">
                &ldquo;{r}&rdquo;
              </li>
            ))}
          </ul>
        </ContentBlock>

        <ContentBlock icon="⚡" label="Practice" color="#10b981">
          <ul className="space-y-1.5">
            {currentPart.practice.map((p, i) => (
              <li key={i} className="flex gap-2 text-[14px] text-[#c9cdd8]">
                <span className="text-emerald-500 shrink-0">·</span>
                {p}
              </li>
            ))}
          </ul>
        </ContentBlock>

        {/* Member journal section */}
        <div className="mt-4">
          <p className="text-[11px] font-semibold text-[#6b7280] tracking-widest uppercase mb-3">
            Member Responses
          </p>

          {/* Member selector */}
          {members.length > 1 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {members.map((m) => {
                const e = entries.find((en) => en.partNum === currentPart.part && en.memberId === m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveMemberId(m.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                      activeMemberId === m.id
                        ? "bg-[#7c6af7] text-white"
                        : "bg-[#161922] text-[#8b93a7] hover:text-white"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full ${AVATAR_BG[m.color] ?? "bg-indigo-600"} flex items-center justify-center text-white font-bold text-[10px]`}
                    >
                      {m.name[0].toUpperCase()}
                    </div>
                    {m.name}
                    {e?.completedAt && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {activeMemberId && (
            <div className="space-y-3">
              {/* Reflection textarea */}
              <JournalField
                label="Reflection"
                placeholder={currentPart.reflection[0]}
                value={draftReflection}
                onChange={(v) => { setDraftReflection(v); setSaved(false); }}
              />

              {/* Practice note */}
              <JournalField
                label="Practice Note"
                placeholder={currentPart.practice[0]}
                value={draftPractice}
                onChange={(v) => { setDraftPractice(v); setSaved(false); }}
              />

              {/* Save / Complete buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave(false)}
                  className={`flex-1 py-3 rounded-xl font-semibold text-[14px] transition-colors ${
                    saved
                      ? "bg-emerald-500 text-white"
                      : "bg-[#161922] text-white hover:bg-[#1e2230]"
                  }`}
                >
                  {saved ? "Saved!" : "Save"}
                </button>
                <button
                  onClick={() => handleSave(true)}
                  className={`flex-1 py-3 rounded-xl font-semibold text-[14px] transition-colors ${
                    isCompleted
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-[#7c6af7] text-white hover:bg-[#6c5ae7]"
                  }`}
                >
                  {isCompleted ? "Completed ✓" : "Mark Complete"}
                </button>
              </div>
            </div>
          )}

          {members.length === 0 && (
            <p className="text-[#4b5563] text-sm text-center py-6">
              Add members in Week Setup to use this workspace.
            </p>
          )}
        </div>

        {/* All members' responses for this part */}
        {members.length > 1 && (
          <AllResponses
            members={members}
            partNum={currentPart.part}
            entries={entries}
          />
        )}

        {/* Part nav */}
        <div className="flex gap-2 mt-5">
          {currentPart.part > 1 && (
            <button
              onClick={() => {
                const prev = COURSE.find((p) => p.part === currentPart.part - 1)!;
                selectPart(prev);
              }}
              className="flex-1 py-3 rounded-xl bg-[#161922] text-[#8b93a7] text-[13px] font-medium hover:text-white transition-colors"
            >
              ← Part {currentPart.part - 1}
            </button>
          )}
          {currentPart.part < 16 && (
            <button
              onClick={() => {
                const next = COURSE.find((p) => p.part === currentPart.part + 1)!;
                selectPart(next);
              }}
              className="flex-1 py-3 rounded-xl bg-[#161922] text-[#8b93a7] text-[13px] font-medium hover:text-white transition-colors"
            >
              Part {currentPart.part + 1} →
            </button>
          )}
        </div>
      </div>

      </div>

      <BottomNav />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────

function SessionFlow({
  activeStep,
  onStepClick,
}: {
  activeStep: number | null;
  onStepClick: (s: number | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between bg-[#161922] rounded-xl px-4 py-3 text-left"
      >
        <span className="text-[13px] font-semibold text-white">
          Session Flow Guide
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="mt-1 bg-[#161922] rounded-xl px-4 py-3 space-y-2">
          {SESSION_FLOW.map((s) => (
            <button
              key={s.step}
              onClick={() => onStepClick(activeStep === s.step ? null : s.step)}
              className={`w-full flex items-center gap-3 text-left py-1.5 transition-colors rounded-lg ${
                activeStep === s.step ? "opacity-100" : "opacity-70 hover:opacity-100"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  activeStep === s.step ? "bg-[#7c6af7] text-white" : "bg-[#1e2230] text-[#8b93a7]"
                }`}
              >
                {s.step}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-semibold text-white">{s.label}</span>
                <span className="text-[12px] text-[#8b93a7] ml-2">{s.time}</span>
              </div>
            </button>
          ))}
          {activeStep !== null && (
            <p className="text-[13px] text-[#c9cdd8] pt-1 pl-9 italic">
              {SESSION_FLOW.find((s) => s.step === activeStep)?.desc}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ContentBlock({
  icon,
  label,
  color,
  children,
}: {
  icon: string;
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#161922] rounded-2xl px-4 py-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[14px]">{icon}</span>
        <p
          className="text-[11px] font-semibold tracking-widest uppercase"
          style={{ color }}
        >
          {label}
        </p>
      </div>
      {children}
    </div>
  );
}

function JournalField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="bg-[#161922] rounded-2xl px-4 py-3">
      <p className="text-[11px] font-semibold text-[#6b7280] tracking-widest uppercase mb-2">
        {label}
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-transparent text-[14px] text-white placeholder:text-[#4b5563] resize-none outline-none leading-relaxed"
      />
    </div>
  );
}

function AllResponses({
  members,
  partNum,
  entries,
}: {
  members: { id: string; name: string; color: string }[];
  partNum: number;
  entries: PartEntry[];
}) {
  const partEntries = entries.filter(
    (e) => e.partNum === partNum && (e.reflection || e.practiceNote)
  );
  if (partEntries.length === 0) return null;

  return (
    <div className="mt-5">
      <p className="text-[11px] font-semibold text-[#6b7280] tracking-widest uppercase mb-3">
        Group Reflections — Part {partNum}
      </p>
      <div className="space-y-3">
        {partEntries.map((e) => {
          const member = members.find((m) => m.id === e.memberId);
          if (!member) return null;
          return (
            <div key={e.memberId} className="bg-[#161922] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-6 h-6 rounded-full ${AVATAR_BG[member.color] ?? "bg-indigo-600"} flex items-center justify-center text-white font-bold text-[10px]`}
                >
                  {member.name[0].toUpperCase()}
                </div>
                <span className="text-white font-semibold text-[13px]">{member.name}</span>
                {e.completedAt && (
                  <span className="text-[11px] text-emerald-400 ml-auto">Completed</span>
                )}
              </div>
              {e.reflection && (
                <p className="text-[13px] text-[#c9cdd8] mb-1.5 italic">
                  &ldquo;{e.reflection}&rdquo;
                </p>
              )}
              {e.practiceNote && (
                <p className="text-[12px] text-[#8b93a7]">
                  <span className="text-[#6b7280] font-semibold not-italic">Practice:</span>{" "}
                  {e.practiceNote}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
