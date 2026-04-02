"use client";

import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { Member, DailyCheckIn, GoalStatus, AVATAR_BG } from "@/lib/types";
import { getMembers, getAllCheckIns, initDb } from "@/lib/api";

export default function HistoryPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>([]);
  const [filterMemberId, setFilterMemberId] = useState<string | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      await initDb();
      const [m, ci] = await Promise.all([getMembers(), getAllCheckIns()]);
      setMembers(m);
      setCheckIns(ci.sort((a, b) => b.date.localeCompare(a.date)));
      setLoading(false);
    }
    load();
  }, []);

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  const filtered = filterMemberId === "all"
    ? checkIns
    : checkIns.filter((c) => c.memberId === filterMemberId);

  const byDate: Record<string, DailyCheckIn[]> = {};
  for (const c of filtered) {
    if (!byDate[c.date]) byDate[c.date] = [];
    byDate[c.date].push(c);
  }
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-[#0d0f14] pb-28">
      <div className="max-w-lg mx-auto">
      <div className="px-5 pt-8 pb-5">
        <h2 className="text-[32px] font-bold text-white leading-none">History</h2>
        <p className="text-[13px] text-[#8b93a7] mt-2">All check-ins</p>
      </div>

      <div className="flex gap-2 px-4 flex-wrap">
        <FilterPill label="All" active={filterMemberId === "all"} onClick={() => setFilterMemberId("all")} />
        {members.map((m) => (
          <FilterPill key={m.id} label={m.name} active={filterMemberId === m.id} onClick={() => setFilterMemberId(m.id)} color={AVATAR_BG[m.color]} />
        ))}
      </div>

      <div className="px-4 mt-4 space-y-5">
        {loading && <p className="text-[#4b5563] text-sm text-center py-16">Loading...</p>}

        {!loading && sortedDates.length === 0 && (
          <p className="text-[#4b5563] text-sm text-center py-16">No check-ins yet. Complete a weekly check-in to see history.</p>
        )}

        {!loading && sortedDates.map((date) => {
          const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric", year: "numeric",
          });
          return (
            <div key={date}>
              <p className="text-[12px] font-semibold text-[#8b93a7] tracking-wide uppercase mb-2">{dateLabel}</p>
              <div className="space-y-2">
                {byDate[date].map((c) => {
                  const member = memberMap[c.memberId];
                  if (!member) return null;
                  return <CheckInRow key={c.id} checkIn={c} member={member} />;
                })}
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

function FilterPill({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${active ? "bg-[#7c6af7] text-white" : "bg-[#161922] text-[#8b93a7] hover:text-white"}`}>
      {color && <span className={`w-3.5 h-3.5 rounded-full ${color} inline-block`} />}
      {label}
    </button>
  );
}

function CheckInRow({ checkIn, member }: { checkIn: DailyCheckIn; member: Member }) {
  const [expanded, setExpanded] = useState(false);
  const batteryColor =
    checkIn.batteryPercent >= 75 ? "#eab308" : checkIn.batteryPercent >= 50 ? "#f59e0b" : checkIn.batteryPercent >= 30 ? "#f97316" : "#ef4444";

  const completedCount = [checkIn.primaryStatus, checkIn.secondaryStatus, checkIn.bonusStatus]
    .filter((s) => s === "completed").length;

  return (
    <div className="bg-[#161922] rounded-2xl overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <div className={`w-9 h-9 rounded-full ${AVATAR_BG[member.color] ?? "bg-indigo-600"} flex items-center justify-center text-white font-bold text-[14px] shrink-0`}>
          {member.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-[15px]">{member.name}</p>
          <p className="text-[12px] text-[#8b93a7] mt-0.5">
            {completedCount}/3 goals · Battery <span style={{ color: batteryColor }}>{checkIn.batteryPercent}%</span>
          </p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.05] px-4 py-3 space-y-3">
          <div className="space-y-1.5">
            <GoalStatusRow label="Primary" status={checkIn.primaryStatus ?? "not_done"} />
            <GoalStatusRow label="Secondary" status={checkIn.secondaryStatus ?? "not_done"} />
            <GoalStatusRow label="Bonus" status={checkIn.bonusStatus ?? "not_done"} />
          </div>
          {checkIn.whyMissed && <ReflectionItem label="Why missed?" value={checkIn.whyMissed} />}
          {checkIn.wins && <ReflectionItem label="Wins" value={checkIn.wins} />}
          {checkIn.feeling && <ReflectionItem label="Feeling" value={checkIn.feeling} />}
        </div>
      )}
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
    <div>
      <p className="text-[11px] font-semibold text-[#6b7280] tracking-wider uppercase mb-1">{label}</p>
      <p className="text-[13px] text-[#c9cdd8]">{value}</p>
    </div>
  );
}
