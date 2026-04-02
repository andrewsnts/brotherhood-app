"use client";

import { useState, useEffect, useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import {
  Member,
  MemberGoals,
  AVATAR_BG,
  getWeekKey,
  getGroupWeekNumber,
  getGroupDayNumber,
  getQuarter,
  calcBatteryPercent,
} from "@/lib/types";
import { getMembers, getGoals, getLatestCheckInThisWeek, initDb } from "@/lib/api";

export default function GoalsBoard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [goalsMap, setGoalsMap] = useState<Record<string, MemberGoals>>({});
  const [batteryMap, setBatteryMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const weekKey = getWeekKey(now);
  const weekNum = getGroupWeekNumber(now);
  const dayNum = getGroupDayNumber(now);
  const quarter = getQuarter(now);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await initDb();
      const m = await getMembers();
      setMembers(m);
      const gmap: Record<string, MemberGoals> = {};
      const bmap: Record<string, number> = {};
      await Promise.all(
        m.map(async (member) => {
          const goals = await getGoals(member.id, weekKey);
          gmap[member.id] = goals;
          const ci = await getLatestCheckInThisWeek(member.id, weekKey);
          bmap[member.id] = ci ? ci.batteryPercent : calcBatteryPercent(goals.battery);
        })
      );
      setGoalsMap(gmap);
      setBatteryMap(bmap);
    } finally {
      setLoading(false);
    }
  }, [weekKey]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-[#0d0f14] pb-28">
      <div className="max-w-lg mx-auto">
      <div className="px-5 pt-8 pb-1 flex items-start justify-between">
        <div>
          <p className="text-[12px] font-semibold text-[#8b93a7] tracking-widest uppercase">
            Deep Work Accountability Brotherhood
          </p>
          <p className="text-[12px] text-[#4b5563] mt-0.5">{quarter}</p>
        </div>
      </div>

      <div className="px-5 pt-4 pb-5">
        <h2 className="text-[32px] font-bold text-white leading-none">Goals Board</h2>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[13px] text-[#8b93a7]">Week {weekNum}</span>
          <span className="text-[#4b5563]">·</span>
          <span className="text-[13px] text-[#8b93a7]">Day {dayNum}</span>
          <span className="text-[#4b5563]">·</span>
          <span className="text-[13px] text-[#8b93a7]">All members</span>
        </div>
      </div>

      <div className="px-4 space-y-5">
        {loading && (
          <p className="text-center text-[#4b5563] py-20 text-sm">Loading...</p>
        )}
        {!loading && members.map((member) => {
          const goals = goalsMap[member.id];
          const battery = batteryMap[member.id] ?? 0;
          if (!goals) return null;
          return (
            <MemberCard key={member.id} member={member} goals={goals} battery={battery} />
          );
        })}
        {!loading && members.length === 0 && (
          <div className="text-center py-20 text-[#8b93a7]">
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

function MemberCard({ member, goals, battery }: { member: Member; goals: MemberGoals; battery: number }) {
  const avatarBg = AVATAR_BG[member.color] ?? "bg-indigo-600";
  const batteryColor =
    battery >= 75 ? "#eab308" : battery >= 50 ? "#f59e0b" : battery >= 30 ? "#f97316" : "#ef4444";
  const hasMonthly = goals.monthly.some((g) => g);
  const hasYearEnd = goals.yearEnd.some((g) => g);
  const hasWeekly = goals.primary || goals.secondary || goals.bonus;

  return (
    <div className="rounded-2xl bg-[#161922] overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${avatarBg} flex items-center justify-center text-white font-bold text-[16px]`}>
            {member.name[0].toUpperCase()}
          </div>
          <span className="text-white font-bold text-[18px]">{member.name}</span>
        </div>
        <span className="font-bold text-[18px]" style={{ color: batteryColor }}>{battery}%</span>
      </div>

      <div className="h-px bg-white/[0.05] mx-5" />

      <Section label="THIS WEEK">
        {hasWeekly ? (
          <div className="space-y-3">
            {goals.primary && <GoalRow tier="Primary" text={goals.primary} color="#7c6af7" />}
            {goals.secondary && <GoalRow tier="Secondary" text={goals.secondary} color="#a855f7" />}
            {goals.bonus && <GoalRow tier="Bonus" text={goals.bonus} color="#eab308" />}
          </div>
        ) : <NotSet />}
      </Section>

      <div className="h-px bg-white/[0.05] mx-5" />

      <Section label="MONTHLY">
        {hasMonthly ? (
          <ol className="space-y-2">
            {goals.monthly.map((g, i) => g ? (
              <li key={i} className="flex gap-2.5 text-[14px] text-[#c9cdd8]">
                <span className="text-[#4b5563] shrink-0 w-4">{i + 1}</span>{g}
              </li>
            ) : null)}
          </ol>
        ) : <NotSet />}
      </Section>

      <div className="h-px bg-white/[0.05] mx-5" />

      <Section label="YEAR-END" last>
        {hasYearEnd ? (
          <ol className="space-y-2">
            {goals.yearEnd.map((g, i) => g ? (
              <li key={i} className="flex gap-2.5 text-[14px] text-[#c9cdd8]">
                <span className="text-[#4b5563] shrink-0 w-4">{i + 1}.</span>{g}
              </li>
            ) : null)}
          </ol>
        ) : <NotSet />}
      </Section>
    </div>
  );
}

function Section({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`px-5 ${last ? "pt-4 pb-5" : "py-4"}`}>
      <p className="text-[10px] font-bold text-[#4b5563] tracking-[0.15em] uppercase mb-3">{label}</p>
      {children}
    </div>
  );
}

function GoalRow({ tier, text, color }: { tier: string; text: string; color: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-[13px] font-semibold w-[72px] shrink-0" style={{ color }}>{tier}</span>
      <span className="text-[14px] text-[#c9cdd8] leading-snug">{text}</span>
    </div>
  );
}

function NotSet() {
  return <p className="text-[13px] text-[#374151]">Not set</p>;
}
