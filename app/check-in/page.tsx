"use client";

import { useState, useEffect, useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import {
  Member,
  MemberGoals,
  DailyCheckIn,
  GoalStatus,
  AVATAR_BG,
  BATTERY_LABELS,
  BatteryScores,
  getWeekKey,
  calcBatteryPercent,
} from "@/lib/types";
import {
  getMembers,
  getGoals,
  getCheckInForMemberToday,
  getLatestCheckInThisWeek,
  saveCheckIn,
  initDb,
} from "@/lib/api";

// ── Week helpers ───────────────────────────────────────────

function getMondayOfWeekKey(weekKey: string): Date {
  const [yearStr, weekStr] = weekKey.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = (jan4.getDay() + 6) % 7; // 0=Mon
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + (week - 1) * 7);
  return monday;
}

function getWeekOptions(pastWeeks = 6): { weekKey: string; label: string }[] {
  const currentKey = getWeekKey(new Date());
  const seen = new Set<string>();
  const options: { weekKey: string; label: string }[] = [];
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  for (let offset = 0; offset >= -pastWeeks; offset--) {
    const d = new Date();
    d.setDate(d.getDate() + offset * 7);
    const wk = getWeekKey(d);
    if (seen.has(wk)) continue;
    seen.add(wk);
    const monday = getMondayOfWeekKey(wk);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const tag = wk === currentKey ? " — This week" : "";
    options.push({ weekKey: wk, label: `${fmt(monday)} – ${fmt(sunday)}${tag}` });
  }
  return options;
}

// For past weeks use Thursday of that week so history groups correctly
function getCheckInDate(weekKey: string): string {
  const currentKey = getWeekKey(new Date());
  if (weekKey === currentKey) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const monday = getMondayOfWeekKey(weekKey);
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  const y = thursday.getFullYear();
  const m = String(thursday.getMonth() + 1).padStart(2, "0");
  const dd = String(thursday.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// ── Page ──────────────────────────────────────────────────

type Step = "select" | "battery" | "goals" | "reflection" | "done";

export default function CheckInPage() {
  const currentWeekKey = getWeekKey(new Date());
  const weekOptions = getWeekOptions();

  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [loading, setLoading] = useState(true);
  const [selectedWeekKey, setSelectedWeekKey] = useState(currentWeekKey);
  const [checkedInMap, setCheckedInMap] = useState<Record<string, boolean>>({});

  const [goals, setGoals] = useState<MemberGoals | null>(null);
  const [battery, setBattery] = useState<BatteryScores>({
    purposeClarity: 7, timeManagement: 7, personalGrowth: 7,
    fitness: 7, nutrition: 7, sleep: 7, community: 7, family: 7, financialWellbeing: 7,
  });
  const [primaryStatus, setPrimaryStatus] = useState<GoalStatus>("not_done");
  const [secondaryStatus, setSecondaryStatus] = useState<GoalStatus>("not_done");
  const [bonusStatus, setBonusStatus] = useState<GoalStatus>("not_done");
  const [whyMissed, setWhyMissed] = useState("");
  const [wins, setWins] = useState("");
  const [feeling, setFeeling] = useState("");
  const [existingCheckIn, setExistingCheckIn] = useState<DailyCheckIn | null>(null);
  const [showBorat, setShowBorat] = useState(false);

  useEffect(() => {
    async function init() {
      await initDb();
      const m = await getMembers();
      setMembers(m);
      const map: Record<string, boolean> = {};
      await Promise.all(m.map(async (member) => {
        const ci = await getLatestCheckInThisWeek(member.id, currentWeekKey);
        map[member.id] = !!ci;
      }));
      setCheckedInMap(map);
      setLoading(false);
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When week changes, refresh the "checked in" map
  const refreshCheckedInMap = useCallback(async (weekKey: string, memberList: Member[]) => {
    const map: Record<string, boolean> = {};
    await Promise.all(memberList.map(async (member) => {
      const ci = await getLatestCheckInThisWeek(member.id, weekKey);
      map[member.id] = !!ci;
    }));
    setCheckedInMap(map);
  }, []);

  async function handleWeekChange(wk: string) {
    setSelectedWeekKey(wk);
    await refreshCheckedInMap(wk, members);
  }

  const selectMember = useCallback(async (id: string) => {
    setSelectedId(id);
    const g = await getGoals(id, selectedWeekKey);
    setGoals(g);
    setBattery({ ...g.battery });

    // Load existing check-in for selected week
    const checkInDate = getCheckInDate(selectedWeekKey);
    let existing = await getCheckInForMemberToday(id, checkInDate);
    // Fallback: check if there's any check-in this week (handles current week daily check-ins)
    if (!existing) {
      existing = await getLatestCheckInThisWeek(id, selectedWeekKey);
    }
    setExistingCheckIn(existing);
    if (existing) {
      setPrimaryStatus(existing.primaryStatus ?? "not_done");
      setSecondaryStatus(existing.secondaryStatus ?? "not_done");
      setBonusStatus(existing.bonusStatus ?? "not_done");
      setWhyMissed(existing.whyMissed);
      setWins(existing.wins);
      setFeeling(existing.feeling);
    }
    setStep("battery");
  }, [selectedWeekKey]);

  async function handleSave() {
    if (!selectedId) return;
    const checkInDate = getCheckInDate(selectedWeekKey);
    const checkIn: DailyCheckIn = {
      id: `${selectedId}-${checkInDate}`,
      date: checkInDate,
      memberId: selectedId,
      batteryPercent: calcBatteryPercent(battery),
      primaryStatus,
      secondaryStatus,
      bonusStatus,
      whyMissed,
      wins,
      feeling,
    };
    await saveCheckIn(checkIn);
    setStep("done");
  }

  function reset() {
    setSelectedId(null);
    setStep("select");
    setGoals(null);
    setWhyMissed("");
    setWins("");
    setFeeling("");
    setPrimaryStatus("not_done");
    setSecondaryStatus("not_done");
    setBonusStatus("not_done");
    setExistingCheckIn(null);
    refreshCheckedInMap(selectedWeekKey, members);
  }

  const selectedMember = members.find((m) => m.id === selectedId);
  const batteryPct = calcBatteryPercent(battery);
  const isCurrentWeek = selectedWeekKey === currentWeekKey;

  return (
    <>
    {showBorat && <BoratPopup onDone={() => setShowBorat(false)} />}
    <div className="min-h-screen bg-background pb-28">
      <div className="max-w-lg mx-auto">
        <div className="px-5 pt-8 pb-4">
          <h2 className="text-[32px] font-bold text-foreground leading-none">Weekly Check-in</h2>
        </div>

        {/* Week selector — only on the select step */}
        {step === "select" && (
          <div className="px-4 mb-4">
            <div className="relative">
              <select
                value={selectedWeekKey}
                onChange={(e) => handleWeekChange(e.target.value)}
                className="w-full appearance-none bg-card border border-input rounded-xl px-4 py-2.5 text-[14px] text-foreground outline-none focus:border-[#7c6af7] transition-colors pr-8"
              >
                {weekOptions.map(({ weekKey, label }) => (
                  <option key={weekKey} value={weekKey}>{label}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
            {!isCurrentWeek && (
              <p className="text-[11px] text-amber-400 mt-1.5 px-1">Checking in for a past week</p>
            )}
          </div>
        )}

        <div className="px-4 mt-2">
          {/* Step: Select member */}
          {step === "select" && (
            <div>
              <p className="text-[14px] text-muted-foreground mb-4">Who are you checking in?</p>
              {loading ? (
                <p className="text-dimmer text-sm text-center py-10">Loading...</p>
              ) : (
                <div className="space-y-3">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => selectMember(m.id)}
                      className="w-full flex items-center gap-3 bg-card rounded-2xl px-4 py-3.5 text-left hover:bg-muted transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-full ${AVATAR_BG[m.color] ?? "bg-indigo-600"} flex items-center justify-center text-white font-bold text-[16px]`}>
                        {m.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-foreground font-semibold text-[15px]">{m.name}</p>
                        {checkedInMap[m.id] ? (
                          <p className="text-[12px] text-emerald-400 mt-0.5">Already checked in</p>
                        ) : (
                          <p className="text-[12px] text-muted-foreground mt-0.5">Not checked in yet</p>
                        )}
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  ))}
                  {members.length === 0 && (
                    <p className="text-dimmer text-sm text-center py-10">Add members in Goal Setup first.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step: Battery */}
          {step === "battery" && selectedMember && (
            <div>
              <StepHeader member={selectedMember} title="Entrepreneurial Battery" subtitle="Rate each area 1–10" onBack={reset} weekLabel={weekOptions.find(w => w.weekKey === selectedWeekKey)?.label ?? ""} />
              <div className="space-y-3 mt-4">
                {(Object.keys(BATTERY_LABELS) as (keyof BatteryScores)[]).map((key) => (
                  <div key={key} className="bg-card rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] text-content">{BATTERY_LABELS[key]}</span>
                      <span className="text-[13px] font-bold text-foreground w-5 text-right">{battery[key]}</span>
                    </div>
                    <input
                      type="range" min={1} max={10} value={battery[key]}
                      onChange={(e) => setBattery((b) => ({ ...b, [key]: Number(e.target.value) }))}
                      className="w-full accent-[#7c6af7] h-1.5"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-card rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-[14px] text-muted-foreground">Total Battery</span>
                <span className="text-[22px] font-bold text-[#eab308]">{batteryPct}%</span>
              </div>
              <button onClick={() => setStep("goals")} className="w-full mt-4 py-3.5 rounded-2xl bg-[#7c6af7] text-white font-semibold text-[15px] hover:bg-[#6c5ae7] transition-colors">
                Next: Goals Review
              </button>
            </div>
          )}

          {/* Step: Goals */}
          {step === "goals" && selectedMember && goals && (
            <div>
              <StepHeader member={selectedMember} title="Goals Review" subtitle="How did your weekly goals go?" onBack={() => setStep("battery")} weekLabel={weekOptions.find(w => w.weekKey === selectedWeekKey)?.label ?? ""} />
              <div className="space-y-3 mt-4">
                {goals.primary && (
                  <GoalDropdown tier="Primary" text={goals.primary} color="#7c6af7" status={primaryStatus} onChange={setPrimaryStatus} onCompleted={() => setShowBorat(true)} />
                )}
                {goals.secondary && (
                  <GoalDropdown tier="Secondary" text={goals.secondary} color="#a855f7" status={secondaryStatus} onChange={setSecondaryStatus} onCompleted={() => setShowBorat(true)} />
                )}
                {goals.bonus && (
                  <GoalDropdown tier="Bonus" text={goals.bonus} color="#eab308" status={bonusStatus} onChange={setBonusStatus} onCompleted={() => setShowBorat(true)} />
                )}
                {!goals.primary && !goals.secondary && !goals.bonus && (
                  <p className="text-dimmer text-sm text-center py-6">No goals set for this week. Set them in Goal Setup.</p>
                )}
              </div>
              <button onClick={() => setStep("reflection")} className="w-full mt-4 py-3.5 rounded-2xl bg-[#7c6af7] text-white font-semibold text-[15px] hover:bg-[#6c5ae7] transition-colors">
                Next: Reflection
              </button>
            </div>
          )}

          {/* Step: Reflection */}
          {step === "reflection" && selectedMember && (
            <div>
              <StepHeader member={selectedMember} title="Reflection" subtitle="Share your wins and blockers" onBack={() => setStep("goals")} weekLabel={weekOptions.find(w => w.weekKey === selectedWeekKey)?.label ?? ""} />
              <div className="space-y-3 mt-4">
                <ReflectionField label="Why missed?" placeholder="Blockers, procrastination..." value={whyMissed} onChange={setWhyMissed} />
                <ReflectionField label="Wins" placeholder="Biz, relationship, personal..." value={wins} onChange={setWins} />
                <ReflectionField label="How are you feeling about your work?" placeholder="Reflections, energy, clarity..." value={feeling} onChange={setFeeling} multiline />
              </div>
              <button onClick={handleSave} className="w-full mt-4 py-3.5 rounded-2xl bg-[#7c6af7] text-white font-semibold text-[15px] hover:bg-[#6c5ae7] transition-colors">
                {existingCheckIn ? "Update Check-in" : "Save Check-in"}
              </button>
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && selectedMember && (
            <div className="flex flex-col items-center py-16 gap-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-foreground font-bold text-[20px]">{selectedMember.name} checked in!</p>
                <p className="text-muted-foreground text-[14px] mt-1">Battery: {batteryPct}%</p>
              </div>
              <button onClick={reset} className="px-6 py-3 rounded-2xl bg-card text-foreground font-semibold text-[15px] hover:bg-muted transition-colors">
                Check in another member
              </button>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
    </>
  );
}

function StepHeader({ member, title, subtitle, onBack, weekLabel }: { member: Member; title: string; subtitle: string; onBack: () => void; weekLabel: string }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-muted-foreground text-[13px] mb-4 hover:text-foreground transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>
      <div className="flex items-center gap-3 mb-1">
        <div className={`w-9 h-9 rounded-full ${AVATAR_BG[member.color] ?? "bg-indigo-600"} flex items-center justify-center text-white font-bold text-[15px]`}>
          {member.name[0].toUpperCase()}
        </div>
        <div>
          <span className="text-foreground font-semibold text-[16px]">{member.name}</span>
          {weekLabel && <p className="text-[11px] text-muted-foreground">{weekLabel}</p>}
        </div>
      </div>
      <h3 className="text-[22px] font-bold text-foreground mt-2">{title}</h3>
      <p className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}

const GOAL_STATUS_OPTIONS: { value: GoalStatus; label: string; bg: string }[] = [
  { value: "completed", label: "Completed", bg: "bg-emerald-500/10 border-emerald-500/30" },
  { value: "in_progress", label: "In Progress", bg: "bg-amber-500/10 border-amber-500/30" },
  { value: "not_done", label: "Not Done", bg: "bg-card border-transparent" },
];

const STATUS_COLOR: Record<GoalStatus, string> = {
  completed: "#10b981",
  in_progress: "#f59e0b",
  not_done: "#6b7280",
};

function BoratPopup({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
      onClick={onDone}
    >
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/borat.gif" alt="Very nice!" className="max-w-[320px] w-full rounded-2xl shadow-2xl" />
        <p className="text-white font-black text-[28px] tracking-wide drop-shadow-lg">VERY NICE!</p>
      </div>
    </div>
  );
}

function GoalDropdown({ tier, text, color, status, onChange, onCompleted }: { tier: string; text: string; color: string; status: GoalStatus; onChange: (v: GoalStatus) => void; onCompleted: () => void }) {
  const current = GOAL_STATUS_OPTIONS.find((o) => o.value === status) ?? GOAL_STATUS_OPTIONS[2];
  return (
    <div className={`rounded-xl px-4 py-3.5 border ${current.bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold mb-0.5" style={{ color }}>{tier}</p>
          <p className="text-[13px] text-content">{text}</p>
        </div>
        <select
          value={status}
          onChange={(e) => {
            const v = e.target.value as GoalStatus;
            onChange(v);
            if (v === "completed") onCompleted();
          }}
          className="shrink-0 bg-background border border-input rounded-lg px-2 py-1.5 text-[12px] font-semibold outline-none cursor-pointer"
          style={{ color: STATUS_COLOR[status] }}
        >
          {GOAL_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ReflectionField({ label, placeholder, value, onChange, multiline }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div className="bg-card rounded-xl px-4 py-3">
      <label className="text-[11px] font-semibold text-dim tracking-wider uppercase block mb-2">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className="w-full bg-transparent text-[14px] text-foreground placeholder:text-placeholder resize-none outline-none" />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent text-[14px] text-foreground placeholder:text-placeholder outline-none" />
      )}
    </div>
  );
}
