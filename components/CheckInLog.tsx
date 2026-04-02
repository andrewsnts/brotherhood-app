"use client";

import { DailyCheckIn, GoalStatus, Member, AVATAR_BG } from "@/lib/types";

interface Props {
  checkIns: DailyCheckIn[];
  members: Member[];
}

const STATUS_DOT: Record<GoalStatus, string> = {
  completed: "bg-emerald-500",
  in_progress: "bg-amber-500",
  not_done: "bg-[#2a2f3e]",
};

export default function CheckInLog({ checkIns, members }: Props) {
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
  const sorted = [...checkIns].sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    return (
      <p className="text-[#4b5563] text-sm text-center py-8">No check-ins yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((c) => {
        const member = memberMap[c.memberId];
        const batteryColor =
          c.batteryPercent >= 75 ? "#eab308" : c.batteryPercent >= 50 ? "#f59e0b" : "#ef4444";
        const dateLabel = new Date(c.date + "T12:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        return (
          <div key={c.id} className="bg-[#1e2230] rounded-xl px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {member && (
                  <div
                    className={`w-6 h-6 rounded-full ${AVATAR_BG[member.color] ?? "bg-indigo-600"} flex items-center justify-center text-white font-bold text-[10px]`}
                  >
                    {member.name[0].toUpperCase()}
                  </div>
                )}
                <span className="text-white text-[13px] font-medium">
                  {member?.name ?? "Unknown"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-bold" style={{ color: batteryColor }}>
                  {c.batteryPercent}%
                </span>
                <span className="text-[#8b93a7] text-[12px]">{dateLabel}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <GoalDot label="Primary" status={c.primaryStatus ?? "not_done"} />
              <GoalDot label="Secondary" status={c.secondaryStatus ?? "not_done"} />
              <GoalDot label="Bonus" status={c.bonusStatus ?? "not_done"} />
            </div>
            {c.wins && (
              <p className="text-[12px] text-[#8b93a7]">
                <span className="text-[#6b7280] font-semibold">Wins:</span> {c.wins}
              </p>
            )}
            {c.feeling && (
              <p className="text-[12px] text-[#8b93a7] italic">&ldquo;{c.feeling}&rdquo;</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GoalDot({ label, status }: { label: string; status: GoalStatus }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-3 h-3 rounded-full ${STATUS_DOT[status]}`} />
      <span className="text-[11px] text-[#6b7280]">{label}</span>
    </div>
  );
}
