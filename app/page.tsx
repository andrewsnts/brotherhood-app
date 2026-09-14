"use client";

import { useState, useEffect, useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import {
  Member,
  MemberGoals,
  BatteryScores,
  GoalStatus,
  BATTERY_LABELS,
  AVATAR_BG,
  getWeekKey,
  getGroupWeekNumber,
  getGroupDayNumber,
  COHORT_TOTAL_WEEKDAYS,
  getQuarter,
  calcBatteryPercent,
} from "@/lib/types";
import { getMembers, getGoals, getLatestCheckInThisWeek, getMorningStreaks, initDb } from "@/lib/api";

// ── Week selector helpers ──────────────────────────────────

function getMondayOfWeek(weekKey: string): Date {
  const [yearStr, weekStr] = weekKey.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  const jan4 = new Date(year, 0, 4);
  const dow = (jan4.getDay() + 6) % 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dow + (week - 1) * 7);
  return monday;
}

function buildWeekOptions(currentWeekKey: string): { weekKey: string; label: string }[] {
  const cohortStart = new Date("2026-09-07T00:00:00");
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const options: { weekKey: string; label: string }[] = [];
  const cur = new Date(cohortStart);
  // align to Monday of that week
  const dow = (cur.getDay() + 6) % 7;
  cur.setDate(cur.getDate() - dow);
  while (getWeekKey(cur) <= currentWeekKey) {
    const wk = getWeekKey(cur);
    const sunday = new Date(cur);
    sunday.setDate(sunday.getDate() + 6);
    const tag = wk === currentWeekKey ? " (This week)" : "";
    options.push({ weekKey: wk, label: `${fmt(cur)} – ${fmt(sunday)}${tag}` });
    cur.setDate(cur.getDate() + 7);
  }
  return options.reverse();
}

type WeeklyStatuses = { primary: GoalStatus; secondary: GoalStatus; bonus: GoalStatus };
const DEFAULT_STATUSES: WeeklyStatuses = { primary: "not_done", secondary: "not_done", bonus: "not_done" };

type Reflection = { whyMissed: string; wins: string; feeling: string };

export default function GoalsBoard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [goalsMap, setGoalsMap] = useState<Record<string, MemberGoals>>({});
  const [batteryMap, setBatteryMap] = useState<Record<string, number>>({});
  const [statusMap, setStatusMap] = useState<Record<string, WeeklyStatuses>>({});
  const [streakMap, setStreakMap] = useState<Record<string, number>>({});
  const [reflectionMap, setReflectionMap] = useState<Record<string, Reflection>>({});
  const [loading, setLoading] = useState(true);
  const [flippedSet, setFlippedSet] = useState<Set<string>>(new Set());
  const now = new Date();
  const currentWeekKey = getWeekKey(now);
  const dayNum = getGroupDayNumber(now);
  const quarter = getQuarter(now);
  const weekOptions = buildWeekOptions(currentWeekKey);

  const [selectedWeekKey, setSelectedWeekKey] = useState(currentWeekKey);
  const selectedMonday = getMondayOfWeek(selectedWeekKey);
  const weekNum = getGroupWeekNumber(selectedMonday);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await initDb();
      const [raw, morningData] = await Promise.all([getMembers(), getMorningStreaks()]);
      const lastId = typeof window !== "undefined" ? localStorage.getItem("bh_last_member") : null;
      const m = lastId
        ? [...raw].sort((a, b) => (a.id === lastId ? -1 : b.id === lastId ? 1 : 0))
        : raw;
      setMembers(m);
      setStreakMap(morningData.streaks);
      const gmap: Record<string, MemberGoals> = {};
      const bmap: Record<string, number> = {};
      const smap: Record<string, WeeklyStatuses> = {};
      const rmap: Record<string, Reflection> = {};
      await Promise.all(
        m.map(async (member) => {
          const goals = await getGoals(member.id, selectedWeekKey);
          gmap[member.id] = goals;
          const ci = await getLatestCheckInThisWeek(member.id, selectedWeekKey);
          bmap[member.id] = ci ? ci.batteryPercent : calcBatteryPercent(goals.battery);
          smap[member.id] = ci
            ? { primary: ci.primaryStatus, secondary: ci.secondaryStatus, bonus: ci.bonusStatus }
            : { ...DEFAULT_STATUSES };
          rmap[member.id] = ci
            ? { whyMissed: ci.whyMissed, wins: ci.wins, feeling: ci.feeling }
            : { whyMissed: "", wins: "", feeling: "" };
        })
      );
      setGoalsMap(gmap);
      setBatteryMap(bmap);
      setStatusMap(smap);
      setReflectionMap(rmap);
    } finally {
      setLoading(false);
    }
  }, [selectedWeekKey]);

  useEffect(() => { load(); }, [load]);

  function toggleFlip(id: string) {
    setFlippedSet((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="max-w-6xl mx-auto">
        <div className="px-5 pt-8 pb-1 flex items-start justify-between">
          <div>
            <p className="text-[12px] font-semibold text-muted-foreground tracking-widest uppercase">
              Deep Work Accountability Brotherhood
            </p>
            <p className="text-[12px] text-dimmer mt-0.5">{quarter}</p>
          </div>
        </div>

        <div className="px-5 pt-4 pb-5">
          <h2 className="text-[32px] font-bold text-foreground leading-none">Goals Board</h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[13px] text-muted-foreground">Week {weekNum}</span>
            <span className="text-dimmer">·</span>
            <span className="text-[13px] text-muted-foreground">Day {dayNum} / {COHORT_TOTAL_WEEKDAYS} days</span>
          </div>
          <div className="mt-3">
            <select
              value={selectedWeekKey}
              onChange={(e) => { setSelectedWeekKey(e.target.value); setFlippedSet(new Set()); }}
              className="appearance-none bg-card border border-input rounded-xl px-3 py-2 pr-8 text-[13px] text-foreground outline-none focus:border-[#7c6af7] transition-colors cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
            >
              {weekOptions.map(({ weekKey: wk, label }) => (
                <option key={wk} value={wk}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {loading && (
            <p className="text-center text-dimmer py-20 text-sm col-span-full">Loading...</p>
          )}
          {!loading && members.map((member) => {
            const goals = goalsMap[member.id];
            const battery = batteryMap[member.id] ?? 0;
            const weeklyStatuses = statusMap[member.id] ?? DEFAULT_STATUSES;
            if (!goals) return null;
            return (
              <MemberCard
                key={member.id}
                member={member}
                goals={goals}
                battery={battery}
                weeklyStatuses={weeklyStatuses}
                streak={streakMap[member.id] ?? 0}
                reflection={reflectionMap[member.id] ?? { whyMissed: "", wins: "", feeling: "" }}
                isFlipped={flippedSet.has(member.id)}
                onFlip={() => toggleFlip(member.id)}
              />
            );
          })}
          {!loading && members.length === 0 && (
            <div className="text-center py-20 text-muted-foreground col-span-full">
              <p className="text-sm">No members yet.</p>
              <p className="text-xs mt-1">Go to Goal Setup to get started.</p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

// ── Battery icon ───────────────────────────────────────────

function BatteryIcon({ pct }: { pct: number }) {
  const fillW = Math.round((pct / 100) * 20);
  return (
    <svg width="26" height="13" viewBox="0 0 26 13" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" width="22" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="23" y="4" width="3" height="5" rx="1" fill="currentColor" />
      <rect x="2" y="2" width={fillW} height="9" rx="1.5" fill="currentColor" />
    </svg>
  );
}

// ── Member card ────────────────────────────────────────────

function MemberCard({
  member, goals, battery, weeklyStatuses, streak, reflection, isFlipped, onFlip,
}: {
  member: Member;
  goals: MemberGoals;
  battery: number;
  weeklyStatuses: WeeklyStatuses;
  streak: number;
  reflection: Reflection;
  isFlipped: boolean;
  onFlip: () => void;
}) {
  const avatarBg = AVATAR_BG[member.color] ?? "bg-indigo-600";
  const batteryColor =
    battery >= 75 ? "#eab308" : battery >= 50 ? "#f59e0b" : battery >= 30 ? "#f97316" : "#ef4444";
  const hasMonthly = goals.monthly.some((g) => g);
  const hasYearEnd = goals.yearEnd.some((g) => g);
  const hasWeekly = goals.primary || goals.secondary || goals.bonus;
  const hasReflection = reflection.wins || reflection.whyMissed || reflection.feeling;

  return (
    <div className="h-full" style={{ perspective: "1000px" }}>
      <div
        className="relative h-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ── Front ── */}
        <div
          className="rounded-2xl bg-card overflow-hidden h-full flex flex-col"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${avatarBg} flex items-center justify-center text-white font-bold text-[16px] shrink-0`}>
                {member.name[0].toUpperCase()}
              </div>
              <div>
                <span className="text-foreground font-bold text-[18px]">{member.name}</span>
                {streak > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[13px] leading-none">🔥</span>
                    <span className="text-[12px] font-semibold text-muted-foreground">{streak} day streak</span>
                  </div>
                )}
              </div>
            </div>
            {/* Clickable battery */}
            <button
              onClick={onFlip}
              className="flex items-center gap-1.5 hover:opacity-70 transition-opacity cursor-pointer"
              style={{ color: batteryColor }}
              title="View battery breakdown"
            >
              <BatteryIcon pct={battery} />
              <span className="font-bold text-[18px]">{battery}%</span>
            </button>
          </div>

          <div className="h-px bg-border mx-5" />

          <Section label="THIS WEEK">
            {hasWeekly ? (
              <div className="space-y-3">
                {goals.primary && <GoalRow tier="Primary" text={goals.primary} color="#7c6af7" status={weeklyStatuses.primary} />}
                {goals.secondary && <GoalRow tier="Secondary" text={goals.secondary} color="#a855f7" status={weeklyStatuses.secondary} />}
                {goals.bonus && <GoalRow tier="Bonus" text={goals.bonus} color="#eab308" status={weeklyStatuses.bonus} />}
              </div>
            ) : <NotSet />}
          </Section>

          <div className="h-px bg-border mx-5" />

          <Section label="QUARTERLY">
            {hasMonthly ? (
              <ol className="space-y-2.5">
                {goals.monthly.map((g, i) => g ? (
                  <GoalListItem key={i} num={i + 1} text={g} status={goals.monthlyStatus?.[i] ?? "not_done"} />
                ) : null)}
              </ol>
            ) : <NotSet />}
          </Section>

          <div className="h-px bg-border mx-5" />

          <Section label="YEAR-END" last={!hasReflection}>
            {hasYearEnd ? (
              <ol className="space-y-2.5">
                {goals.yearEnd.map((g, i) => g ? (
                  <GoalListItem key={i} num={i + 1} text={g} status={goals.yearEndStatus?.[i] ?? "not_done"} />
                ) : null)}
              </ol>
            ) : <NotSet />}
          </Section>

          {hasReflection && (
            <>
              <div className="h-px bg-border mx-5" />
              <Section label="FRIDAY REFLECTION" last>
                <div className="space-y-3">
                  {reflection.wins && (
                    <div>
                      <p className="text-[10px] font-semibold text-dimmer uppercase tracking-wider mb-1">Wins</p>
                      <p className="text-[13px] leading-snug text-content">{reflection.wins}</p>
                    </div>
                  )}
                  {reflection.whyMissed && (
                    <div>
                      <p className="text-[10px] font-semibold text-dimmer uppercase tracking-wider mb-1">Why missed</p>
                      <p className="text-[13px] leading-snug text-content">{reflection.whyMissed}</p>
                    </div>
                  )}
                  {reflection.feeling && (
                    <div>
                      <p className="text-[10px] font-semibold text-dimmer uppercase tracking-wider mb-1">Feeling</p>
                      <p className="text-[13px] leading-snug text-content">{reflection.feeling}</p>
                    </div>
                  )}
                </div>
              </Section>
            </>
          )}
        </div>

        {/* ── Back ── */}
        <div
          className="absolute inset-0 rounded-2xl bg-card overflow-hidden flex flex-col"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${avatarBg} flex items-center justify-center text-white font-bold text-[16px]`}>
                {member.name[0].toUpperCase()}
              </div>
              <div>
                <p className="text-foreground font-bold text-[16px]">{member.name}</p>
                <p className="text-[11px] text-muted-foreground">Battery breakdown</p>
              </div>
            </div>
            <button
              onClick={onFlip}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              title="Back to goals"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          </div>

          <div className="h-px bg-border mx-5" />

          {/* Battery categories */}
          <div className="px-5 py-4 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              {(Object.keys(BATTERY_LABELS) as (keyof BatteryScores)[]).map((key) => {
                const score = goals.battery[key] ?? 0;
                const barColor =
                  score >= 8 ? "#eab308" : score >= 6 ? "#f59e0b" : score >= 4 ? "#f97316" : "#ef4444";
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-[12px] text-content flex-1 leading-tight">{BATTERY_LABELS[key]}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${score * 10}%`, backgroundColor: barColor }}
                        />
                      </div>
                      <span className="text-[13px] font-bold text-foreground w-4 text-right">{score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-border mx-5" />

          {/* Total */}
          <div className="px-5 py-3 flex items-center justify-between">
            <span className="text-[12px] font-bold text-dimmer tracking-widest uppercase">Total</span>
            <div className="flex items-center gap-1.5" style={{ color: batteryColor }}>
              <BatteryIcon pct={battery} />
              <span className="text-[18px] font-bold">{battery}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────

function Section({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`px-5 ${last ? "pt-4 pb-5 flex-1" : "py-4"}`}>
      <p className="text-[10px] font-bold text-dimmer tracking-[0.15em] uppercase mb-3">{label}</p>
      {children}
    </div>
  );
}

function GoalRow({ tier, text, color, status }: { tier: string; text: string; color: string; status: GoalStatus }) {
  const isCompleted = status === "completed";
  const isInProgress = status === "in_progress";
  const textColor = isCompleted ? "#10b981" : isInProgress ? "#f59e0b" : undefined;

  return (
    <div className="flex items-start gap-3">
      <span className="text-[13px] font-semibold w-[72px] shrink-0 mt-0.5" style={{ color }}>{tier}</span>
      <div className="flex items-start gap-1.5 flex-1 min-h-[2.5rem]">
        {isCompleted && (
          <svg className="shrink-0 mt-[3px]" width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        <span className="text-[14px] leading-snug" style={{ color: textColor ?? "var(--content)" }}>
          {text}
        </span>
      </div>
    </div>
  );
}

function GoalListItem({ num, text, status }: { num: number; text: string; status: GoalStatus }) {
  const isCompleted = status === "completed";
  const isInProgress = status === "in_progress";
  const textColor = isCompleted ? "#10b981" : isInProgress ? "#f59e0b" : "var(--content)";
  return (
    <li className="flex items-start gap-2">
      <span className="text-dimmer shrink-0 w-4 mt-[3px] text-[13px]">{num}</span>
      <div className="flex items-start gap-1.5 flex-1">
        {isCompleted && (
          <svg className="shrink-0 mt-[3px]" width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        <span className="text-[14px] leading-snug" style={{ color: textColor }}>{text}</span>
      </div>
    </li>
  );
}

function NotSet() {
  return <p className="text-[13px] text-placeholder">Not set</p>;
}


