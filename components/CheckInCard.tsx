"use client";

import { useState, useEffect } from "react";
import { Member, MemberGoals, DailyCheckIn, GoalStatus, calcBatteryPercent } from "@/lib/types";
import { saveCheckIn, getCheckInForMemberToday } from "@/lib/store";

interface Props {
  member: Member;
  goals: MemberGoals | null;
  today: string;
  onSaved?: () => void;
}

export default function CheckInCard({ member, goals, today, onSaved }: Props) {
  const [batteryPercent, setBatteryPercent] = useState(70);
  const [primaryStatus, setPrimaryStatus] = useState<GoalStatus>("not_done");
  const [secondaryStatus, setSecondaryStatus] = useState<GoalStatus>("not_done");
  const [bonusStatus, setBonusStatus] = useState<GoalStatus>("not_done");
  const [whyMissed, setWhyMissed] = useState("");
  const [wins, setWins] = useState("");
  const [feeling, setFeeling] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = getCheckInForMemberToday(member.id, today);
    if (existing) {
      setBatteryPercent(existing.batteryPercent);
      setPrimaryStatus(existing.primaryStatus ?? "not_done");
      setSecondaryStatus(existing.secondaryStatus ?? "not_done");
      setBonusStatus(existing.bonusStatus ?? "not_done");
      setWhyMissed(existing.whyMissed);
      setWins(existing.wins);
      setFeeling(existing.feeling);
      setSaved(true);
    } else if (goals) {
      setBatteryPercent(calcBatteryPercent(goals.battery));
    }
  }, [member.id, today, goals]);

  function handleSave() {
    const checkIn: DailyCheckIn = {
      id: `${member.id}-${today}`,
      date: today,
      memberId: member.id,
      batteryPercent,
      primaryStatus,
      secondaryStatus,
      bonusStatus,
      whyMissed,
      wins,
      feeling,
    };
    saveCheckIn(checkIn);
    setSaved(true);
    onSaved?.();
  }

  const statusOptions: { value: GoalStatus; label: string }[] = [
    { value: "completed", label: "Completed" },
    { value: "in_progress", label: "In Progress" },
    { value: "not_done", label: "Not Done" },
  ];

  return (
    <div className="bg-[#161922] rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-white font-semibold">{member.name}</span>
        <span className="text-[#eab308] font-bold">{batteryPercent}%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#8b93a7] w-24">Battery %</span>
        <input
          type="range"
          min={0}
          max={100}
          value={batteryPercent}
          onChange={(e) => { setBatteryPercent(Number(e.target.value)); setSaved(false); }}
          className="flex-1 accent-[#7c6af7]"
        />
      </div>
      {[
        { label: "Primary", status: primaryStatus, set: setPrimaryStatus },
        { label: "Secondary", status: secondaryStatus, set: setSecondaryStatus },
        { label: "Bonus", status: bonusStatus, set: setBonusStatus },
      ].map(({ label, status, set }) => (
        <div key={label} className="flex items-center justify-between gap-3">
          <span className="text-xs text-[#8b93a7] w-20 shrink-0">{label}</span>
          <select
            value={status}
            onChange={(e) => { set(e.target.value as GoalStatus); setSaved(false); }}
            className="flex-1 bg-[#0d0f14] border border-white/10 rounded-lg px-2 py-1.5 text-[12px] text-white outline-none"
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      ))}
      <input
        type="text"
        value={whyMissed}
        onChange={(e) => { setWhyMissed(e.target.value); setSaved(false); }}
        placeholder="Why missed?"
        className="w-full bg-[#0d0f14] text-white text-sm px-3 py-2 rounded-xl placeholder:text-[#4b5563] outline-none"
      />
      <input
        type="text"
        value={wins}
        onChange={(e) => { setWins(e.target.value); setSaved(false); }}
        placeholder="Wins..."
        className="w-full bg-[#0d0f14] text-white text-sm px-3 py-2 rounded-xl placeholder:text-[#4b5563] outline-none"
      />
      <input
        type="text"
        value={feeling}
        onChange={(e) => { setFeeling(e.target.value); setSaved(false); }}
        placeholder="How are you feeling?"
        className="w-full bg-[#0d0f14] text-white text-sm px-3 py-2 rounded-xl placeholder:text-[#4b5563] outline-none"
      />
      <button
        onClick={handleSave}
        className="w-full py-2.5 rounded-xl bg-[#7c6af7] text-white font-semibold text-sm hover:bg-[#6c5ae7] transition-colors"
      >
        {saved ? "Update" : "Save Check-in"}
      </button>
    </div>
  );
}
