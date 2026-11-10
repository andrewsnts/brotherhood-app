export interface Member {
  id: string;
  name: string;
  color: string; // 'indigo' | 'purple' | 'blue' | 'rose' | 'amber' | 'emerald'
}

export interface Habit {
  name: string;
  done: boolean;
}

export const DEFAULT_HABITS: Habit[] = [
  { name: "Exercise / Workout", done: false },
  { name: "Meditate", done: false },
  { name: "Cold Shower", done: false },
  { name: "Read 30 min", done: false },
  { name: "No Social Media", done: false },
  { name: "Healthy Eating", done: false },
  { name: "8 Hours Sleep", done: false },
  { name: "Deep Work Block", done: false },
  { name: "Journal", done: false },
  { name: "Hydration (8 glasses)", done: false },
];

export type GoalStatus = "completed" | "in_progress" | "not_done";

export interface MemberGoals {
  memberId: string;
  weekKey: string; // "2026-W14"
  primary: string;
  secondary: string;
  bonus: string;
  yearEnd: [string, string, string];
  yearEndStatus: [GoalStatus, GoalStatus, GoalStatus];
  monthly: [string, string, string];
  monthlyStatus: [GoalStatus, GoalStatus, GoalStatus];
  habits: Habit[];
}

export interface DailyCheckIn {
  id: string;
  date: string; // "2026-01-14"
  memberId: string;
  batteryPercent: number; // kept for DB backwards-compat, always 0 now
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

// Q4 cohort started September 7, 2026
const GROUP_START = new Date("2026-09-07T00:00:00");

export function getGroupWeekNumber(date: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diff = date.getTime() - GROUP_START.getTime();
  return Math.max(1, Math.floor(diff / msPerWeek) + 1);
}

// Total weekdays in the Q4 cohort (Sept 7 – Oct 30, 2026)
export const COHORT_TOTAL_WEEKDAYS = 40;

export function getGroupDayNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const start = new Date(GROUP_START);
  start.setHours(0, 0, 0, 0);
  if (d < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= d) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, count);
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
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  // Q4 cohort: September–October 2026
  if (y === 2026 && (m === 9 || m === 10)) return "Q4 2026";
  const q = Math.ceil(m / 3);
  return `Q${q} ${y}`;
}
