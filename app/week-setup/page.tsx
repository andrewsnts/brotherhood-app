"use client";

import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import {
  Member,
  MemberGoals,
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

// ── Page ──────────────────────────────────────────────────

export default function WeekSetupPage() {
  const currentWeekKey = getWeekKey(new Date());
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [goals, setGoals] = useState<MemberGoals | null>(null);
  const [newName, setNewName] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"goals" | "members">("goals");
  const [selectedWeekKey, setSelectedWeekKey] = useState(currentWeekKey);
  const weekOptions = getWeekOptions();

  async function load(weekKey = selectedWeekKey) {
    await initDb();
    const m = await getMembers();
    setMembers(m);
    if (m.length > 0) {
      const lastId = localStorage.getItem("bh_last_member");
      const pick = (lastId && m.find((x) => x.id === lastId)) ? lastId : m[0].id;
      setSelectedId(pick);
      setGoals(await getGoals(pick, weekKey));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save 1s after any change
  useEffect(() => {
    if (!goals || loading) return;
    setSaved(false);
    setSaving(true);
    const timer = setTimeout(async () => {
      await saveGoals(goals);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }, 1000);
    return () => clearTimeout(timer);
  }, [goals]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleWeekChange(wk: string) {
    setSelectedWeekKey(wk);
    setSaved(false);
    if (selectedId) {
      setGoals(await getGoals(selectedId, wk));
    }
  }

  async function selectMember(id: string) {
    setSelectedId(id);
    localStorage.setItem("bh_last_member", id);
    setGoals(await getGoals(id, selectedWeekKey));
    setSaved(false);
  }

  async function handleAddMember() {
    if (!newName.trim()) return;
    const m = await addMember(newName.trim(), members.length);
    setNewName("");
    const updated = await getMembers();
    setMembers(updated);
    setSelectedId(m.id);
    setGoals(await getGoals(m.id, selectedWeekKey));
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
    }
    setSaved(false);
  }

  async function handleColorChange(id: string, color: string) {
    await updateMemberColor(id, color);
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, color } : m)));
  }

  function setField<K extends keyof MemberGoals>(field: K, value: MemberGoals[K]) {
    setGoals((g) => (g ? { ...g, [field]: value } : g));
    setSaved(false);
  }

  function setYearEnd(i: number, val: string) {
    setGoals((g) => {
      if (!g) return g;
      const yearEnd = [...g.yearEnd] as [string, string, string];
      yearEnd[i] = val;
      return { ...g, yearEnd };
    });
    setSaved(false);
  }

  function setMonthly(i: number, val: string) {
    setGoals((g) => {
      if (!g) return g;
      const monthly = [...g.monthly] as [string, string, string];
      monthly[i] = val;
      return { ...g, monthly };
    });
    setSaved(false);
  }

  function setBattery(key: keyof BatteryScores, val: number) {
    setGoals((g) => g ? { ...g, battery: { ...g.battery, [key]: val } } : g);
    setSaved(false);
  }

  const selectedMember = members.find((m) => m.id === selectedId);
  const batteryPct = goals ? calcBatteryPercent(goals.battery) : 0;

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="max-w-lg mx-auto">
        <div className="px-5 pt-8 pb-4">
          <h2 className="text-[32px] font-bold text-foreground leading-none">Goal Setup</h2>
        </div>

        {/* Week selector */}
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
        </div>

        <div className="flex px-4 gap-2 mb-4">
          {(["goals", "members"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-full text-[13px] font-semibold capitalize transition-colors ${tab === t ? "bg-[#7c6af7] text-white" : "bg-card text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="px-4">
          {loading && <p className="text-center text-dimmer py-20 text-sm">Loading...</p>}

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

          {!loading && tab === "goals" && (
            <div>
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
                  <Section label="THIS WEEK">
                    <div className="space-y-3">
                      {(["primary", "secondary", "bonus"] as const).map((tier) => {
                        const colors = { primary: "#7c6af7", secondary: "#a855f7", bonus: "#eab308" };
                        return (
                          <div key={tier}>
                            <label className="text-[11px] font-semibold tracking-wider uppercase block mb-1.5" style={{ color: colors[tier] }}>{tier}</label>
                            <input type="text" value={goals[tier]} onChange={(e) => setField(tier, e.target.value)}
                              placeholder={`${tier.charAt(0).toUpperCase() + tier.slice(1)} goal...`}
                              className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-[14px] text-foreground placeholder:text-placeholder outline-none focus:border-[#7c6af7] transition-colors"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </Section>

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

                  <div className="flex items-center justify-center py-2 h-8">
                    {saving && <p className="text-[13px] text-dim">Saving...</p>}
                    {saved && !saving && <p className="text-[13px] text-emerald-400">Saved</p>}
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
