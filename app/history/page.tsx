"use client";

import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { Member, MemberGoals, DailyCheckIn, GoalStatus, AVATAR_BG } from "@/lib/types";
import { getMembers, getAllCheckIns, getAllGoalsForMember, initDb } from "@/lib/api";

interface WeekEntry {
  weekKey: string;
  memberId: string;
  goals: MemberGoals | null;
  checkIn: DailyCheckIn | null;
}

export default function HistoryPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [entries, setEntries] = useState<WeekEntry[]>([]);
  const [filterMemberId, setFilterMemberId] = useState<string | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      await initDb();
      const [m, allCheckIns] = await Promise.all([getMembers(), getAllCheckIns()]);
      setMembers(m);

      // For each member, get all their goal weeks + match check-ins to weeks
      const allEntries: WeekEntry[] = [];

      await Promise.all(
        m.map(async (member) => {
          const goals = await getAllGoalsForMember(member.id);
          const memberCheckIns = allCheckIns.filter((c) => c.memberId === member.id);

          // Build a set of all week keys that have goals
          const weekKeys = new Set(goals.map((g) => g.weekKey));

          // Also include weeks that have check-ins but no goals
          for (const ci of memberCheckIns) {
            const d = new Date(ci.date + "T12:00:00");
            const wk = getWeekKey(d);
            weekKeys.add(wk);
          }

          for (const weekKey of weekKeys) {
            const goal = goals.find((g) => g.weekKey === weekKey) ?? null;
            // Find the most recent check-in within that week
            const checkIn =
              memberCheckIns
                .filter((c) => getWeekKey(new Date(c.date + "T12:00:00")) === weekKey)
                .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;

            allEntries.push({ weekKey, memberId: member.id, goals: goal, checkIn });
          }
        })
      );

      // Sort by weekKey desc then by member name
      allEntries.sort((a, b) =>
        b.weekKey !== a.weekKey
          ? b.weekKey.localeCompare(a.weekKey)
          : a.memberId.localeCompare(b.memberId)
      );

      setEntries(allEntries);
      setLoading(false);
    }
    load();
  }, []);

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  const filtered =
    filterMemberId === "all"
      ? entries
      : entries.filter((e) => e.memberId === filterMemberId);

  // Group by weekKey
  const byWeek: Record<string, WeekEntry[]> = {};
  for (const e of filtered) {
    if (!byWeek[e.weekKey]) byWeek[e.weekKey] = [];
    byWeek[e.weekKey].push(e);
  }
  const sortedWeeks = Object.keys(byWeek).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-[#0d0f14] pb-28">
      <div className="max-w-lg mx-auto">
        <div className="px-5 pt-8 pb-5">
          <h2 className="text-[32px] font-bold text-white leading-none">History</h2>
          <p className="text-[13px] text-[#8b93a7] mt-2">Goals & check-ins by week</p>
        </div>

        <div className="flex gap-2 px-4 flex-wrap">
          <FilterPill label="All" active={filterMemberId === "all"} onClick={() => setFilterMemberId("all")} />
          {members.map((m) => (
            <FilterPill key={m.id} label={m.name} active={filterMemberId === m.id} onClick={() => setFilterMemberId(m.id)} color={AVATAR_BG[m.color]} />
          ))}
        </div>

        <div className="px-4 mt-4 space-y-6">
          {loading && <p className="text-[#4b5563] text-sm text-center py-16">Loading...</p>}

          {!loading && sortedWeeks.length === 0 && (
            <p className="text-[#4b5563] text-sm text-center py-16">No goals set yet. Set them in Goal Setup.</p>
          )}

          {!loading && sortedWeeks.map((weekKey) => (
            <div key={weekKey}>
              <p className="text-[12px] font-bold text-[#8b93a7] tracking-widest uppercase mb-2">{weekKey}</p>
              <div className="space-y-2">
                {byWeek[weekKey].map((entry) => {
                  const member = memberMap[entry.memberId];
                  if (!member) return null;
                  return <WeekRow key={`${weekKey}-${entry.memberId}`} entry={entry} member={member} />;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

// Inline weekKey helper (client-side)
function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function FilterPill({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${active ? "bg-[#7c6af7] text-white" : "bg-[#161922] text-[#8b93a7] hover:text-white"}`}>
      {color && <span className={`w-3.5 h-3.5 rounded-full ${color} inline-block`} />}
      {label}
    </button>
  );
}

function WeekRow({ entry, member }: { entry: WeekEntry; member: Member }) {
  const [expanded, setExpanded] = useState(false);
  const { goals, checkIn } = entry;
  const hasCheckIn = !!checkIn;
  const batteryColor = checkIn
    ? checkIn.batteryPercent >= 75 ? "#eab308" : checkIn.batteryPercent >= 50 ? "#f59e0b" : checkIn.batteryPercent >= 30 ? "#f97316" : "#ef4444"
    : "#4b5563";

  const hasWeeklyGoals = goals && (goals.primary || goals.secondary || goals.bonus);

  return (
    <div className="bg-[#161922] rounded-2xl overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <div className={`w-9 h-9 rounded-full ${AVATAR_BG[member.color] ?? "bg-indigo-600"} flex items-center justify-center text-white font-bold text-[14px] shrink-0`}>
          {member.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-[15px]">{member.name}</p>
          <p className="text-[12px] text-[#8b93a7] mt-0.5">
            {hasCheckIn
              ? <>Check-in · Battery <span style={{ color: batteryColor }}>{checkIn!.batteryPercent}%</span></>
              : <span className="text-[#4b5563]">Goals only — no check-in</span>
            }
          </p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.05] px-4 py-3 space-y-4">
          {/* Weekly goals */}
          {hasWeeklyGoals && (
            <div>
              <p className="text-[10px] font-bold text-[#4b5563] tracking-widest uppercase mb-2">Weekly Goals</p>
              <div className="space-y-1.5">
                {goals!.primary && <GoalLine tier="Primary" text={goals!.primary} color="#7c6af7" />}
                {goals!.secondary && <GoalLine tier="Secondary" text={goals!.secondary} color="#a855f7" />}
                {goals!.bonus && <GoalLine tier="Bonus" text={goals!.bonus} color="#eab308" />}
              </div>
            </div>
          )}

          {/* Check-in results */}
          {hasCheckIn && (
            <div>
              <p className="text-[10px] font-bold text-[#4b5563] tracking-widest uppercase mb-2">Check-in</p>
              <div className="space-y-1.5">
                <GoalStatusRow label="Primary" status={checkIn!.primaryStatus ?? "not_done"} />
                <GoalStatusRow label="Secondary" status={checkIn!.secondaryStatus ?? "not_done"} />
                <GoalStatusRow label="Bonus" status={checkIn!.bonusStatus ?? "not_done"} />
              </div>
              {checkIn!.whyMissed && <ReflectionItem label="Why missed?" value={checkIn!.whyMissed} />}
              {checkIn!.wins && <ReflectionItem label="Wins" value={checkIn!.wins} />}
              {checkIn!.feeling && <ReflectionItem label="Feeling" value={checkIn!.feeling} />}
            </div>
          )}

          {/* Monthly goals */}
          {goals && goals.monthly.some((g) => g) && (
            <div>
              <p className="text-[10px] font-bold text-[#4b5563] tracking-widest uppercase mb-2">Monthly Goals</p>
              <ol className="space-y-1">
                {goals.monthly.map((g, i) => g ? (
                  <li key={i} className="flex gap-2 text-[13px] text-[#c9cdd8]">
                    <span className="text-[#4b5563] w-4 shrink-0">{i + 1}.</span>{g}
                  </li>
                ) : null)}
              </ol>
            </div>
          )}

          {/* Year-end goals */}
          {goals && goals.yearEnd.some((g) => g) && (
            <div>
              <p className="text-[10px] font-bold text-[#4b5563] tracking-widest uppercase mb-2">Year-End Goals</p>
              <ol className="space-y-1">
                {goals.yearEnd.map((g, i) => g ? (
                  <li key={i} className="flex gap-2 text-[13px] text-[#c9cdd8]">
                    <span className="text-[#4b5563] w-4 shrink-0">{i + 1}.</span>{g}
                  </li>
                ) : null)}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GoalLine({ tier, text, color }: { tier: string; text: string; color: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[12px] font-semibold w-16 shrink-0" style={{ color }}>{tier}</span>
      <span className="text-[13px] text-[#c9cdd8]">{text}</span>
    </div>
  );
}

const STATUS_CONFIG: Record<GoalStatus, { label: string; color: string; dot: string }> = {
  completed: { label: "Completed", color: "text-emerald-400", dot: "bg-emerald-500" },
  in_progress: { label: "In Progress", color: "text-amber-400", dot: "bg-amber-500" },
  not_done: { label: "Not Done", color: "text-[#4b5563]", dot: "bg-[#2a2f3e]" },
};

function GoalStatusRow({ label, status }: { label: string; status: GoalStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_done;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${cfg.dot}`} />
        <span className="text-[13px] text-[#c9cdd8]">{label}</span>
      </div>
      <span className={`text-[11px] font-semibold ${cfg.color}`}>{cfg.label}</span>
    </div>
  );
}

function ReflectionItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2">
      <p className="text-[11px] font-semibold text-[#6b7280] tracking-wider uppercase mb-1">{label}</p>
      <p className="text-[13px] text-[#c9cdd8]">{value}</p>
    </div>
  );
}
