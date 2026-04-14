export interface Member {
  id: string;
  name: string;
  color: string; // 'indigo' | 'purple' | 'blue' | 'rose' | 'amber' | 'emerald'
}

export interface BatteryScores {
  purposeClarity: number;
  timeManagement: number;
  personalGrowth: number;
  fitness: number;
  nutrition: number;
  sleep: number;
  community: number;
  family: number;
  financialWellbeing: number;
}

export const BATTERY_LABELS: Record<keyof BatteryScores, string> = {
  purposeClarity: "Purpose/Clarity",
  timeManagement: "Time Management",
  personalGrowth: "Personal Growth",
  fitness: "Fitness",
  nutrition: "Nutrition",
  sleep: "Sleep",
  community: "Community",
  family: "Family",
  financialWellbeing: "Financial Wellbeing",
};

export interface MemberGoals {
  memberId: string;
  weekKey: string; // "2026-W14"
  primary: string;
  secondary: string;
  bonus: string;
  yearEnd: [string, string, string];
  monthly: [string, string, string];
  battery: BatteryScores;
}

export type GoalStatus = "completed" | "in_progress" | "not_done";

export interface DailyCheckIn {
  id: string;
  date: string; // "2026-01-14"
  memberId: string;
  batteryPercent: number;
  primaryStatus: GoalStatus;
  secondaryStatus: GoalStatus;
  bonusStatus: GoalStatus;
  whyMissed: string;
  wins: string;
  feeling: string;
}

// Backwards-compat helpers
export function statusToCompleted(s: GoalStatus): boolean {
  return s === "completed";
}

export const MEMBER_COLORS = [
  "indigo",
  "purple",
  "blue",
  "rose",
  "amber",
  "emerald",
  "cyan",
  "orange",
];

export const AVATAR_BG: Record<string, string> = {
  indigo: "bg-indigo-600",
  purple: "bg-purple-600",
  blue: "bg-blue-600",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-600",
  cyan: "bg-cyan-600",
  orange: "bg-orange-500",
};

export function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

// Group started March 30, 2026 — Week 1 = that week (Day 16 = April 14)
const GROUP_START = new Date("2026-03-30T00:00:00");

export function getGroupWeekNumber(date: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diff = date.getTime() - GROUP_START.getTime();
  return Math.max(1, Math.floor(diff / msPerWeek) + 1);
}

export function getGroupDayNumber(date: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = date.getTime() - GROUP_START.getTime();
  return Math.max(1, Math.floor(diff / msPerDay) + 1);
}

export function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}

export function getQuarter(date: Date): string {
  const q = Math.ceil((date.getMonth() + 1) / 3);
  return `Q${q} ${date.getFullYear()}`;
}

export function calcBatteryPercent(scores: BatteryScores): number {
  const vals = Object.values(scores);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round((avg / 10) * 100);
}

export const DEFAULT_BATTERY: BatteryScores = {
  purposeClarity: 7,
  timeManagement: 7,
  personalGrowth: 7,
  fitness: 7,
  nutrition: 7,
  sleep: 7,
  community: 7,
  family: 7,
  financialWellbeing: 7,
};
