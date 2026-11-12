"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Member,
  MemberGoals,
  Habit,
  DAY_LABELS,
  getWeekKey,
} from "@/lib/types";
import {
  getMembers,
  addMember,
  deleteMember,
  getOrCreateGoals,
  saveGoals,
} from "@/lib/store";

export default function SetupPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [newName, setNewName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [goals, setGoals] = useState<MemberGoals | null>(null);
  const weekKey = getWeekKey(new Date());

  function loadMembers() {
    const m = getMembers();
    setMembers(m);
    if (m.length > 0 && !selectedId) {
      setSelectedId(m[0].id);
    }
  }

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) {
      setGoals(getOrCreateGoals(selectedId, weekKey));
    }
  }, [selectedId, weekKey]);

  function handleAddMember() {
    if (!newName.trim()) return;
    const m = addMember(newName.trim());
    setNewName("");
    setSelectedId(m.id);
    loadMembers();
  }

  function handleDeleteMember(id: string) {
    deleteMember(id);
    const remaining = getMembers();
    setMembers(remaining);
    if (selectedId === id) {
      setSelectedId(remaining[0]?.id ?? null);
    }
  }

  function updateGoalField(field: keyof MemberGoals, value: string) {
    setGoals((g) => g ? { ...g, [field]: value } : g);
  }

  function updateYearEnd(idx: number, value: string) {
    setGoals((g) => {
      if (!g) return g;
      const yearEnd = [...g.yearEnd] as [string, string, string];
      yearEnd[idx] = value;
      return { ...g, yearEnd };
    });
  }

  function updateMonthly(idx: number, value: string) {
    setGoals((g) => {
      if (!g) return g;
      const monthly = [...g.monthly] as [string, string, string];
      monthly[idx] = value;
      return { ...g, monthly };
    });
  }

  function toggleHabitDay(habitIdx: number, dayIdx: number) {
    setGoals((g) => {
      if (!g) return g;
      const habits = g.habits.map((h: Habit, idx: number) => {
        if (idx !== habitIdx) return h;
        const days = [...(Array.isArray(h.days) && h.days.length === 7 ? h.days : Array(7).fill(false))];
        days[dayIdx] = !days[dayIdx];
        return { ...h, days };
      });
      return { ...g, habits };
    });
  }

  function setHabitName(i: number, name: string) {
    setGoals((g) => {
      if (!g) return g;
      const habits = g.habits.map((h: Habit, idx: number) => idx === i ? { ...h, name } : h);
      return { ...g, habits };
    });
  }

  function handleSave() {
    if (goals) {
      saveGoals(goals);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Setup</h1>
            <p className="text-gray-400 text-sm mt-1">{weekKey}</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            ← Morning Meeting
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Members sidebar */}
          <div className="space-y-4">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white">Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${
                      selectedId === m.id
                        ? "bg-yellow-400/20 border border-yellow-400/50"
                        : "bg-gray-800 hover:bg-gray-700"
                    }`}
                    onClick={() => setSelectedId(m.id)}
                  >
                    <span className="text-sm text-white">{m.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMember(m.id);
                      }}
                      className="text-gray-500 hover:text-red-400 text-xs transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {members.length === 0 && (
                  <p className="text-gray-500 text-xs text-center py-2">No members yet</p>
                )}

                {/* Add member */}
                <div className="flex gap-2 pt-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                    placeholder="Add member..."
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 text-sm h-8"
                  />
                  <button
                    onClick={handleAddMember}
                    className="px-3 py-1 rounded bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold text-sm transition-colors whitespace-nowrap"
                  >
                    +
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Goals form */}
          {goals && selectedId && (
            <div className="md:col-span-2 space-y-4">
              {/* Weekly Goals */}
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-white">
                    This Week&apos;s Goals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(["primary", "secondary", "bonus"] as const).map((tier) => (
                    <div key={tier}>
                      <label className="text-xs text-gray-400 capitalize block mb-1">
                        {tier}
                      </label>
                      <Input
                        value={goals[tier]}
                        onChange={(e) => updateGoalField(tier, e.target.value)}
                        placeholder={`${tier.charAt(0).toUpperCase() + tier.slice(1)} goal...`}
                        className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 text-sm"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Year End + Monthly */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-white">Year End Goals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {goals.yearEnd.map((val, i) => (
                      <Input
                        key={i}
                        value={val}
                        onChange={(e) => updateYearEnd(i, e.target.value)}
                        placeholder={`Goal ${i + 1}...`}
                        className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 text-sm"
                      />
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-white">Quarterly Goals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {goals.monthly.map((val, i) => (
                      <Input
                        key={i}
                        value={val}
                        onChange={(e) => updateMonthly(i, e.target.value)}
                        placeholder={`Goal ${i + 1}...`}
                        className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 text-sm"
                      />
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Habit Tracker */}
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-white">Habit Tracker</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Day label header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1" />
                    <div className="flex gap-1 shrink-0">
                      {DAY_LABELS.map((d, i) => (
                        <div key={i} className="w-6 text-center text-[10px] font-semibold text-gray-500">{d}</div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {goals.habits.map((habit: Habit, i: number) => {
                      const days = Array.isArray(habit.days) && habit.days.length === 7 ? habit.days : Array(7).fill(false);
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            value={habit.name}
                            onChange={(e) => setHabitName(i, e.target.value)}
                            placeholder={`Habit ${i + 1}...`}
                            className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 text-sm h-7 flex-1 min-w-0"
                          />
                          <div className="flex gap-1 shrink-0">
                            {days.map((done: boolean, dayIdx: number) => (
                              <button
                                key={dayIdx}
                                onClick={() => toggleHabitDay(i, dayIdx)}
                                className={`w-6 h-6 rounded-md text-[10px] font-semibold transition-colors ${
                                  done ? "bg-yellow-400 text-gray-900" : "bg-gray-700 text-gray-500 hover:bg-gray-600"
                                }`}
                              >
                                {done ? "✓" : ""}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <button
                onClick={handleSave}
                className="w-full py-3 rounded bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold transition-colors"
              >
                Save Goals
              </button>
            </div>
          )}

          {!selectedId && members.length === 0 && (
            <div className="md:col-span-2 flex items-center justify-center text-gray-500 text-sm">
              Add a member to get started
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
