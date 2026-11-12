"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CheckInLog from "@/components/CheckInLog";
import {
  Member,
  MemberGoals,
  Habit,
  DAY_LABELS,
  getWeekKey,
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
          {/* Habits */}
          {goals && goals.habits.length > 0 && (
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-white">Habit Tracker</CardTitle>
                  <span className="text-sm text-yellow-400 font-semibold">
                    {goals.habits.reduce((s: number, h: Habit) => s + (Array.isArray(h.days) ? h.days.filter(Boolean).length : 0), 0)}/{goals.habits.length * 7}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {/* Day headers */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1" />
                  <div className="flex gap-1 shrink-0">
                    {DAY_LABELS.map((d, i) => (
                      <div key={i} className="w-6 text-center text-[10px] font-semibold text-gray-500">{d}</div>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {goals.habits.map((h: Habit, i: number) => {
                    const days = Array.isArray(h.days) && h.days.length === 7 ? h.days : Array(7).fill(false);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="flex-1 text-sm text-gray-300 truncate">{h.name || `Habit ${i + 1}`}</span>
                        <div className="flex gap-1 shrink-0">
                          {days.map((done: boolean, di: number) => (
                            <div key={di} className={`w-6 h-6 rounded-md flex items-center justify-center ${done ? "bg-yellow-400" : "bg-gray-700"}`}>
                              {done && <span className="text-gray-900 text-[10px] font-bold">✓</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

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
                  <CardTitle className="text-sm text-gray-400">Quarterly Goals</CardTitle>
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
