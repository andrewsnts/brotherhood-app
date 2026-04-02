"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BatteryGauge from "@/components/BatteryGauge";
import CheckInLog from "@/components/CheckInLog";
import {
  Member,
  MemberGoals,
  BATTERY_LABELS,
  BatteryScores,
  getWeekKey,
  calcBatteryPercent,
} from "@/lib/types";
import { getMembers, getOrCreateGoals, getCheckInHistory } from "@/lib/store";

export default function MemberPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const decodedName = decodeURIComponent(name);

  const [member, setMember] = useState<Member | null>(null);
  const [goals, setGoals] = useState<MemberGoals | null>(null);
  const [checkIns, setCheckIns] = useState<ReturnType<typeof getCheckInHistory>>([]);

  useEffect(() => {
    const members = getMembers();
    const found = members.find(
      (m) => m.name.toLowerCase() === decodedName.toLowerCase()
    );
    if (found) {
      setMember(found);
      setGoals(getOrCreateGoals(found.id, getWeekKey(new Date())));
      setCheckIns(getCheckInHistory(found.id));
    }
  }, [decodedName]);

  if (!member) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-400">Member &quot;{decodedName}&quot; not found.</p>
          <Link href="/" className="text-yellow-400 hover:underline text-sm">
            ← Back to Morning Meeting
          </Link>
        </div>
      </main>
    );
  }

  const batteryPct = goals ? calcBatteryPercent(goals.battery) : 0;

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{member.name}</h1>
            <p className="text-gray-400 text-sm mt-1">{getWeekKey(new Date())}</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            ← Meeting
          </Link>
        </div>

        <div className="space-y-5">
          {/* Battery */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-white">Entrepreneurial Battery</CardTitle>
                <BatteryGauge percent={batteryPct} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                {goals &&
                  (Object.keys(BATTERY_LABELS) as (keyof BatteryScores)[]).map(
                    (key) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-36 shrink-0">
                          {BATTERY_LABELS[key]}
                        </span>
                        <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-yellow-400"
                            style={{
                              width: `${(goals.battery[key] / 10) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-300 w-4 text-right">
                          {goals.battery[key]}
                        </span>
                      </div>
                    )
                  )}
              </div>
            </CardContent>
          </Card>

          {/* Goals */}
          {goals && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">This Week</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {goals.primary && (
                    <div>
                      <p className="text-xs text-yellow-400 font-semibold">Primary</p>
                      <p className="text-sm text-white">{goals.primary}</p>
                    </div>
                  )}
                  {goals.secondary && (
                    <div>
                      <p className="text-xs text-gray-400 font-semibold">Secondary</p>
                      <p className="text-sm text-white">{goals.secondary}</p>
                    </div>
                  )}
                  {goals.bonus && (
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">Bonus</p>
                      <p className="text-sm text-white">{goals.bonus}</p>
                    </div>
                  )}
                  {!goals.primary && !goals.secondary && !goals.bonus && (
                    <p className="text-gray-600 text-xs">No goals set</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Monthly Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-1">
                    {goals.monthly.map((g, i) => (
                      <li key={i} className="text-sm text-white flex gap-2">
                        <span className="text-gray-500">{i + 1}.</span>
                        {g || <span className="text-gray-600 italic">—</span>}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Year End Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-1">
                    {goals.yearEnd.map((g, i) => (
                      <li key={i} className="text-sm text-white flex gap-2">
                        <span className="text-gray-500">{i + 1}.</span>
                        {g || <span className="text-gray-600 italic">—</span>}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </div>
          )}

          {/* History */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white">Check-in History</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckInLog checkIns={checkIns} members={[member]} />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
