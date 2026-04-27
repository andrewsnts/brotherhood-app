"use client";

import { useState, useEffect, useRef } from "react";
import BottomNav from "@/components/BottomNav";
import {
  Member,
  MemberGoals,
  DailyCheckIn,
  GoalStatus,
  BatteryScores,
  BATTERY_LABELS,
  AVATAR_BG,
  MEMBER_COLORS,
  getWeekKey,
  calcBatteryPercent,
} from "@/lib/types";
import {
  getMembers,
  addMember,
  deleteMember,
  updateMemberColor,
  getGoals,
  saveGoals,
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
  const dayOfWeek = (jan4.getDay() + 6) % 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + (week - 1) * 7);
  return monday;
}

function getWeekOptions(pastWeeks = 6, futureWeeks = 2): { weekKey: string; label: string }[] {
  const currentKey = getWeekKey(new Date());
  const seen = new Set<string>();
  const options: { weekKey: string; label: string }[] = [];
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  for (let offset = futureWeeks; offset >= -pastWeeks; offset--) {
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

function getCheckInDate(weekKey: string): string {
  const currentKey = getWeekKey(new Date());
  if (weekKey === currentKey) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const monday = getMondayOfWeekKey(weekKey);
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  return `${thursday.getFullYear()}-${String(thursday.getMonth() + 1).padStart(2, "0")}-${String(thursday.getDate()).padStart(2, "0")}`;
}

// ── Status config ──────────────────────────────────────────

const STATUS_OPTIONS: { value: GoalStatus; label: string; color: string }[] = [
  { value: "completed",  label: "Completed",   color: "#10b981" },
  { value: "in_progress", label: "In Progress", color: "#f59e0b" },
  { value: "not_done",   label: "Not Done",    color: "#6b7280" },
];

// ── Borat popup ────────────────────────────────────────────

function BoratPopup({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" onClick={onDone}>
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/borat.gif" alt="Very nice!" className="max-w-[320px] w-full rounded-2xl shadow-2xl" />
        <p className="text-white font-black text-[28px] tracking-wide drop-shadow-lg">VERY NICE!</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────

export default function WeekSetupPage() {
  const currentWeekKey = getWeekKey(new Date());
  const weekOptions = getWeekOptions();
  const isSunday = new Date().getDay() === 0;

  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [goals, setGoals] = useState<MemberGoals | null>(null);
  const [newName, setNewName] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"goals" | "members">("goals");
  const [selectedWeekKey, setSelectedWeekKey] = useState(currentWeekKey);
  const [showBorat, setShowBorat] = useState(false);

  // Check-in fields
  const [primaryStatus, setPrimaryStatus] = useState<GoalStatus>("not_done");
  const [secondaryStatus, setSecondaryStatus] = useState<GoalStatus>("not_done");
  const [bonusStatus, setBonusStatus] = useState<GoalStatus>("not_done");
  const [whyMissed, setWhyMissed] = useState("");
  const [wins, setWins] = useState("");
  const [feeling, setFeeling] = useState("");

  // Track whether check-in data has been touched
  const checkInDirty = useRef(false);

  // ── Load ───────────────────────────────────────────────

  async function load(weekKey = selectedWeekKey) {
    await initDb();
    const m = await getMembers();
    setMembers(m);
    if (m.length > 0) {
      const lastId = localStorage.getItem("bh_last_member");
      const pick = (lastId && m.find((x) => x.id === lastId)) ? lastId : m[0].id;
      setSelectedId(pick);
      const g = await getGoals(pick, weekKey);
      setGoals(g);
      await loadCheckIn(pick, weekKey);
    }
    setLoading(false);
  }

  async function loadCheckIn(memberId: string, weekKey: string) {
    checkInDirty.current = false;
    const ci = await getLatestCheckInThisWeek(memberId, weekKey);
    setPrimaryStatus(ci?.primaryStatus ?? "not_done");
    setSecondaryStatus(ci?.secondaryStatus ?? "not_done");
    setBonusStatus(ci?.bonusStatus ?? "not_done");
    setWhyMissed(ci?.whyMissed ?? "");
    setWins(ci?.wins ?? "");
    setFeeling(ci?.feeling ?? "");
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-save (goals + check-in together) ─────────────

  useEffect(() => {
    if (!goals || !selectedId || loading) return;
    setSaved(false);
    setSaving(true);
    const timer = setTimeout(async () => {
      // Always save goals
      await saveGoals(goals);
      // Save check-in only if the user has touched status/reflection
      if (checkInDirty.current) {
        const checkInDate = getCheckInDate(selectedWeekKey);
        const ci: DailyCheckIn = {
          id: `${selectedId}-${checkInDate}`,
          date: checkInDate,
          memberId: selectedId,
          batteryPercent: calcBatteryPercent(goals.battery),
          primaryStatus,
          secondaryStatus,
          bonusStatus,
          whyMissed,
          wins,
          feeling,
        };
        await saveCheckIn(ci);
      }
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }, 1000);
    return () => clearTimeout(timer);
  }, [goals, primaryStatus, secondaryStatus, bonusStatus, whyMissed, wins, feeling]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Member / week switching ────────────────────────────

  async function handleWeekChange(wk: string) {
    setSelectedWeekKey(wk);
    setSaved(false);
    if (selectedId) {
      setGoals(await getGoals(selectedId, wk));
      await loadCheckIn(selectedId, wk);
    }
  }

  async function selectMember(id: string) {
    setSelectedId(id);
    localStorage.setItem("bh_last_member", id);
    setGoals(await getGoals(id, selectedWeekKey));
    await loadCheckIn(id, selectedWeekKey);
    setSaved(false);
  }

  // ── Member management ──────────────────────────────────

  async function handleAddMember() {
    if (!newName.trim()) return;
    const m = await addMember(newName.trim(), members.length);
    setNewName("");
    const updated = await getMembers();
    setMembers(updated);
    setSelectedId(m.id);
    setGoals(await getGoals(m.id, selectedWeekKey));
    await loadCheckIn(m.id, selectedWeekKey);
    setSaved(false);
  }

  async function handleDeleteMember(id: string) {
    await deleteMember(id);
    const remaining = await getMembers();
    setMembers(remaining);
    if (selectedId === id) {
      const next = remaining[0] ?? null;
      setSelectedId(next?.id ?? null);
      setGoals(next ? await getGoals(next.id, selectedWeekKey) : null);
      if (next) await loadCheckIn(next.id, selectedWeekKey);
    }
    setSaved(false);
  }

  async function handleColorChange(id: string, color: string) {
    await updateMemberColor(id, color);
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, color } : m)));
  }

  // ── Goal field helpers ────────────────────────────────

  function setField<K extends keyof MemberGoals>(field: K, value: MemberGoals[K]) {
    setGoals((g) => (g ? { ...g, [field]: value } : g));
  }

  function setYearEnd(i: number, val: string) {
    setGoals((g) => {
      if (!g) return g;
      const yearEnd = [...g.yearEnd] as [string, string, string];
      yearEnd[i] = val;
      return { ...g, yearEnd };
    });
  }

  function setMonthly(i: number, val: string) {
    setGoals((g) => {
      if (!g) return g;
      const monthly = [...g.monthly] as [string, string, string];
      monthly[i] = val;
      return { ...g, monthly };
    });
  }

  function setBattery(key: keyof BatteryScores, val: number) {
    setGoals((g) => g ? { ...g, battery: { ...g.battery, [key]: val } } : g);
  }

  // ── Check-in field helpers ────────────────────────────

  function handleStatusChange(
    setter: (v: GoalStatus) => void,
    value: GoalStatus
  ) {
    checkInDirty.current = true;
    setter(value);
    if (value === "completed") setShowBorat(true);
  }

  function handleReflectionChange(setter: (v: string) => void, value: string) {
    checkInDirty.current = true;
    setter(value);
  }

  // ── Render ─────────────────────────────────────────────

  const selectedMember = members.find((m) => m.id === selectedId);
  const batteryPct = goals ? calcBatteryPercent(goals.battery) : 0;

  const tierConfig = {
    primary:   { color: "#7c6af7", status: primaryStatus,   setStatus: (v: GoalStatus) => handleStatusChange(setPrimaryStatus, v) },
    secondary: { color: "#a855f7", status: secondaryStatus, setStatus: (v: GoalStatus) => handleStatusChange(setSecondaryStatus, v) },
    bonus:     { color: "#eab308", status: bonusStatus,     setStatus: (v: GoalStatus) => handleStatusChange(setBonusStatus, v) },
  };

  return (
    <>
      {showBorat && <BoratPopup onDone={() => setShowBorat(false)} />}
      <div className="min-h-screen bg-background pb-28">
        <div className="max-w-lg mx-auto">
          <div className="px-5 pt-8 pb-4">
            <h2 className="text-[32px] font-bold text-foreground leading-none">Goal Setup</h2>
          </div>

          {/* Week selector */}
          <div className="px-4 mb-3">
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
            {isSunday && (
              <p className="text-[11px] text-[#7c6af7] mt-1.5 px-1">📋 Sunday — great day to finalize your week</p>
            )}
          </div>

          {/* Tabs */}
          <div className="flex px-4 gap-2 mb-4">
            {(["goals", "members"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-semibold capitalize transition-colors ${tab === t ? "bg-[#7c6af7] text-white" : "bg-card text-muted-foreground hover:text-foreground"}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="px-4">
            {loading && <p className="text-center text-dimmer py-20 text-sm">Loading...</p>}

            {/* ── Members tab ── */}
            {!loading && tab === "members" && (
              <div className="space-y-3">
                {members.map((m) => (
                  <div key={m.id} className="bg-card rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${AVATAR_BG[m.color] ?? "bg-indigo-600"} flex items-center justify-center text-white font-bold text-[15px]`}>
                      {m.name[0].toUpperCase()}
                    </div>
                    <span className="text-foreground font-medium text-[15px] flex-1">{m.name}</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {MEMBER_COLORS.map((c) => (
                        <button key={c} onClick={() => handleColorChange(m.id, c)}
                          className={`w-5 h-5 rounded-full ${AVATAR_BG[c]} transition-transform ${m.color === c ? "ring-2 ring-[#7c6af7] scale-110" : ""}`}
                        />
                      ))}
                    </div>
                    <button onClick={() => handleDeleteMember(m.id)} className="text-dimmer hover:text-red-400 text-[13px] ml-1 transition-colors">✕</button>
                  </div>
                ))}
                <div className="bg-card rounded-2xl px-4 py-3 flex gap-2 items-center">
                  <input
                    type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                    placeholder="Add member..." className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-placeholder outline-none"
                  />
                  <button onClick={handleAddMember} disabled={!newName.trim()}
                    className="w-8 h-8 rounded-full bg-[#7c6af7] text-white font-bold text-lg flex items-center justify-center hover:bg-[#6c5ae7] transition-colors disabled:opacity-40">+</button>
                </div>
              </div>
            )}

            {/* ── Goals tab ── */}
            {!loading && tab === "goals" && (
              <div>
                {/* Member selector */}
                {members.length > 1 && (
                  <div className="flex gap-2 flex-wrap mb-4">
                    {members.map((m) => (
                      <button key={m.id} onClick={() => selectMember(m.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${selectedId === m.id ? "bg-[#7c6af7] text-white" : "bg-card text-muted-foreground hover:text-foreground"}`}>
                        <div className={`w-5 h-5 rounded-full ${AVATAR_BG[m.color] ?? "bg-indigo-600"} flex items-center justify-center text-white font-bold text-[10px]`}>
                          {m.name[0].toUpperCase()}
                        </div>
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}

                {goals && selectedMember ? (
                  <div className="space-y-4">

                    {/* ── This week ── */}
                    <Section label="THIS WEEK">
                      <div className="space-y-4">
                        {(["primary", "secondary", "bonus"] as const).map((tier) => {
                          const { color, status, setStatus } = tierConfig[tier];
                          const currentStatus = STATUS_OPTIONS.find(o => o.value === status)!;
                          return (
                            <div key={tier}>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[11px] font-semibold tracking-wider uppercase" style={{ color }}>
                                  {tier}
                                </label>
                                <select
                                  value={status}
                                  onChange={(e) => setStatus(e.target.value as GoalStatus)}
                                  className="bg-background border border-input rounded-lg px-2 py-1 text-[11px] font-semibold outline-none cursor-pointer"
                                  style={{ color: currentStatus.color }}
                                >
                                  {STATUS_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              </div>
                              <input
                                type="text"
                                value={goals[tier]}
                                onChange={(e) => setField(tier, e.target.value)}
                                placeholder={`${tier.charAt(0).toUpperCase() + tier.slice(1)} goal...`}
                                className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-[14px] text-foreground placeholder:text-placeholder outline-none focus:border-[#7c6af7] transition-colors"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </Section>

                    {/* ── Quarterly ── */}
                    <Section label="QUARTERLY GOALS">
                      <div className="space-y-2">
                        {goals.monthly.map((val, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-muted-foreground text-[13px] w-4 shrink-0">{i + 1}</span>
                            <input type="text" value={val} onChange={(e) => setMonthly(i, e.target.value)}
                              placeholder={`Goal ${i + 1}...`}
                              className="flex-1 bg-background border border-input rounded-xl px-3 py-2 text-[14px] text-foreground placeholder:text-placeholder outline-none focus:border-[#7c6af7] transition-colors"
                            />
                          </div>
                        ))}
                      </div>
                    </Section>

                    {/* ── Year-end ── */}
                    <Section label="YEAR-END GOALS">
                      <div className="space-y-2">
                        {goals.yearEnd.map((val, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-muted-foreground text-[13px] w-4 shrink-0">{i + 1}</span>
                            <input type="text" value={val} onChange={(e) => setYearEnd(i, e.target.value)}
                              placeholder={`Goal ${i + 1}...`}
                              className="flex-1 bg-background border border-input rounded-xl px-3 py-2 text-[14px] text-foreground placeholder:text-placeholder outline-none focus:border-[#7c6af7] transition-colors"
                            />
                          </div>
                        ))}
                      </div>
                    </Section>

                    {/* ── Battery ── */}
                    <Section label={`ENTREPRENEURIAL BATTERY — ${batteryPct}%`}>
                      <div className="space-y-3">
                        {(Object.keys(BATTERY_LABELS) as (keyof BatteryScores)[]).map((key) => (
                          <div key={key}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[12px] text-muted-foreground">{BATTERY_LABELS[key]}</span>
                              <span className="text-[12px] font-bold text-foreground">{goals.battery[key]}</span>
                            </div>
                            <input type="range" min={1} max={10} value={goals.battery[key]}
                              onChange={(e) => setBattery(key, Number(e.target.value))}
                              className="w-full accent-[#7c6af7] h-1.5"
                            />
                          </div>
                        ))}
                      </div>
                    </Section>

                    {/* ── Reflection ── */}
                    <Section label="WEEKLY REFLECTION">
                      <div className="space-y-3">
                        <ReflectionField
                          label="Why missed?"
                          placeholder="Blockers, procrastination..."
                          value={whyMissed}
                          onChange={(v) => handleReflectionChange(setWhyMissed, v)}
                        />
                        <ReflectionField
                          label="Wins"
                          placeholder="Biz, relationship, personal..."
                          value={wins}
                          onChange={(v) => handleReflectionChange(setWins, v)}
                        />
                        <ReflectionField
                          label="How are you feeling about your work?"
                          placeholder="Reflections, energy, clarity..."
                          value={feeling}
                          onChange={(v) => handleReflectionChange(setFeeling, v)}
                          multiline
                        />
                      </div>
                    </Section>

                    {/* ── Save indicator ── */}
                    <div className="flex items-center justify-center py-2 h-8">
                      {saving && <p className="text-[13px] text-dim">Saving...</p>}
                      {saved && !saving && <p className="text-[13px] text-emerald-400">Saved ✓</p>}
                    </div>
                  </div>
                ) : (
                  <p className="text-dimmer text-sm text-center py-10">Add members to get started.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <BottomNav />
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl px-4 py-4">
      <p className="text-[11px] font-semibold text-dim tracking-widest uppercase mb-3">{label}</p>
      {children}
    </div>
  );
}

function ReflectionField({
  label, placeholder, value, onChange, multiline,
}: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; multiline?: boolean;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-dim tracking-wider uppercase block mb-1.5">{label}</label>
      {multiline ? (
        <textarea
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} rows={3}
          className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-[14px] text-foreground placeholder:text-placeholder resize-y outline-none focus:border-[#7c6af7] transition-colors"
        />
      ) : (
        <input
          type="text" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-[14px] text-foreground placeholder:text-placeholder outline-none focus:border-[#7c6af7] transition-colors"
        />
      )}
    </div>
  );
}
