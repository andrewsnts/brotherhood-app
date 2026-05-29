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
  getQuarter,
  calcBatteryPercent,
} from "@/lib/types";
import { getMembers, getGoals, getLatestCheckInThisWeek, initDb } from "@/lib/api";

type WeeklyStatuses = { primary: GoalStatus; secondary: GoalStatus; bonus: GoalStatus };
const DEFAULT_STATUSES: WeeklyStatuses = { primary: "not_done", secondary: "not_done", bonus: "not_done" };

export default function GoalsBoard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [goalsMap, setGoalsMap] = useState<Record<string, MemberGoals>>({});
  const [batteryMap, setBatteryMap] = useState<Record<string, number>>({});
  const [statusMap, setStatusMap] = useState<Record<string, WeeklyStatuses>>({});
  const [loading, setLoading] = useState(true);
  const [flippedSet, setFlippedSet] = useState<Set<string>>(new Set());
  const now = new Date();
  const weekKey = getWeekKey(now);
  const weekNum = getGroupWeekNumber(now);
  const dayNum = getGroupDayNumber(now);
  const quarter = getQuarter(now);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await initDb();
      const raw = await getMembers();
      const lastId = typeof window !== "undefined" ? localStorage.getItem("bh_last_member") : null;
      const m = lastId
        ? [...raw].sort((a, b) => (a.id === lastId ? -1 : b.id === lastId ? 1 : 0))
        : raw;
      setMembers(m);
      const gmap: Record<string, MemberGoals> = {};
      const bmap: Record<string, number> = {};
      const smap: Record<string, WeeklyStatuses> = {};
      await Promise.all(
        m.map(async (member) => {
          const goals = await getGoals(member.id, weekKey);
          gmap[member.id] = goals;
          const ci = await getLatestCheckInThisWeek(member.id, weekKey);
          bmap[member.id] = ci ? ci.batteryPercent : calcBatteryPercent(goals.battery);
          smap[member.id] = ci
            ? { primary: ci.primaryStatus, secondary: ci.secondaryStatus, bonus: ci.bonusStatus }
            : { ...DEFAULT_STATUSES };
        })
      );
      setGoalsMap(gmap);
      setBatteryMap(bmap);
      setStatusMap(smap);
    } finally {
      setLoading(false);
    }
  }, [weekKey]);

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
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[13px] text-muted-foreground">Week {weekNum}</span>
            <span className="text-dimmer">·</span>
            <span className="text-[13px] text-muted-foreground">Day {dayNum}</span>
            <span className="text-dimmer">·</span>
            <span className="text-[13px] text-muted-foreground">All members</span>
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
  member, goals, battery, weeklyStatuses, isFlipped, onFlip,
}: {
  member: Member;
  goals: MemberGoals;
  battery: number;
  weeklyStatuses: WeeklyStatuses;
  isFlipped: boolean;
  onFlip: () => void;
}) {
  const avatarBg = AVATAR_BG[member.color] ?? "bg-indigo-600";
  const batteryColor =
    battery >= 75 ? "#eab308" : battery >= 50 ? "#f59e0b" : battery >= 30 ? "#f97316" : "#ef4444";
  const hasMonthly = goals.monthly.some((g) => g);
  const hasYearEnd = goals.yearEnd.some((g) => g);
  const hasWeekly = goals.primary || goals.secondary || goals.bonus;

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
              <div className={`w-10 h-10 rounded-full ${avatarBg} flex items-center justify-center text-white font-bold text-[16px]`}>
                {member.name[0].toUpperCase()}
              </div>
              <span className="text-foreground font-bold text-[18px]">{member.name}</span>
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
              <ol className="space-y-2">
                {goals.monthly.map((g, i) => g ? (
                  <li key={i} className="flex items-start gap-2.5 text-[14px] text-content">
                    <span className="text-dimmer shrink-0 w-4 mt-0.5">{i + 1}</span>
                    <span className="flex-1">{g}</span>
                    <GoalStatusDot status={goals.monthlyStatus?.[i] ?? "not_done"} />
                  </li>
                ) : null)}
              </ol>
            ) : <NotSet />}
          </Section>

          <div className="h-px bg-border mx-5" />

          <Section label="YEAR-END" last>
            {hasYearEnd ? (
              <ol className="space-y-2">
                {goals.yearEnd.map((g, i) => g ? (
                  <li key={i} className="flex items-start gap-2.5 text-[14px] text-content">
                    <span className="text-dimmer shrink-0 w-4 mt-0.5">{i + 1}.</span>
                    <span className="flex-1">{g}</span>
                    <GoalStatusDot status={goals.yearEndStatus?.[i] ?? "not_done"} />
                  </li>
                ) : null)}
              </ol>
            ) : <NotSet />}
          </Section>
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

function NotSet() {
  return <p className="text-[13px] text-placeholder">Not set</p>;
}

const STATUS_DOT: Record<GoalStatus, { color: string; title: string }> = {
  completed:  { color: "#10b981", title: "Completed" },
  in_progress: { color: "#f59e0b", title: "In Progress" },
  not_done:   { color: "#4b5563", title: "Not Done" },
};

function GoalStatusDot({ status }: { status: GoalStatus }) {
  const cfg = STATUS_DOT[status] ?? STATUS_DOT.not_done;
  if (status === "not_done") return null; // hide when nothing set yet
  return (
    <span
      title={cfg.title}
      className="shrink-0 mt-1 w-2 h-2 rounded-full inline-block"
      style={{ backgroundColor: cfg.color }}
    />
  );
}
