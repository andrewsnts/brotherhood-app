import {
  Member,
  MemberGoals,
  DailyCheckIn,
  DEFAULT_BATTERY,
  MEMBER_COLORS,
  getWeekKey,
} from "./types";

const KEYS = {
  members: "bh_members",
  goals: "bh_goals",
  checkIns: "bh_checkins",
  seeded: "bh_seeded",
};

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Seed ──────────────────────────────────────────────────

export function seedIfEmpty() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(KEYS.seeded)) return;

  const weekKey = getWeekKey(new Date());

  const andrew: Member = { id: "andrew", name: "Andrew", color: "indigo" };
  const kiem: Member = { id: "kiem", name: "Kiem", color: "purple" };
  save(KEYS.members, [andrew, kiem]);

  const andrewGoals: MemberGoals = {
    memberId: "andrew",
    weekKey,
    primary: "ZRC X assets x10",
    secondary: "Get into AOD and make post",
    bonus: "Finish the colour on Bioregional video.",
    yearEnd: ["Finished and premiered Doc", "Get married", "Sell the doc"],
    yearEndStatus: ["not_done", "not_done", "not_done"],
    monthly: [
      "1 additional option for storyline and format",
      "Zircuit Content Plan",
      "Posted MDMA video for Qi",
    ],
    monthlyStatus: ["not_done", "not_done", "not_done"],
    battery: {
      purposeClarity: 8,
      timeManagement: 6,
      personalGrowth: 7,
      fitness: 6,
      nutrition: 6,
      sleep: 9,
      community: 9,
      family: 8,
      financialWellbeing: 9,
    },
  };

  const kiemGoals: MemberGoals = {
    memberId: "kiem",
    weekKey,
    primary: "",
    secondary: "",
    bonus: "",
    yearEnd: ["", "", ""],
    yearEndStatus: ["not_done", "not_done", "not_done"],
    monthly: ["", "", ""],
    monthlyStatus: ["not_done", "not_done", "not_done"],
    battery: { ...DEFAULT_BATTERY },
  };

  save(KEYS.goals, [andrewGoals, kiemGoals]);
  save(KEYS.checkIns, []);
  localStorage.setItem(KEYS.seeded, "1");
}

// ── Members ──────────────────────────────────────────────

export function getMembers(): Member[] {
  return load<Member[]>(KEYS.members, []);
}

export function saveMembers(members: Member[]) {
  save(KEYS.members, members);
}

export function addMember(name: string): Member {
  const members = getMembers();
  const color = MEMBER_COLORS[members.length % MEMBER_COLORS.length];
  const member: Member = { id: crypto.randomUUID(), name: name.trim(), color };
  saveMembers([...members, member]);
  return member;
}

export function deleteMember(id: string) {
  saveMembers(getMembers().filter((m) => m.id !== id));
}

// ── Goals ─────────────────────────────────────────────────

export function getAllGoals(): MemberGoals[] {
  return load<MemberGoals[]>(KEYS.goals, []);
}

export function getGoalsForMember(
  memberId: string,
  weekKey?: string
): MemberGoals | null {
  const key = weekKey ?? getWeekKey(new Date());
  return (
    getAllGoals().find((g) => g.memberId === memberId && g.weekKey === key) ??
    null
  );
}

export function saveGoals(goals: MemberGoals) {
  const all = getAllGoals().filter(
    (g) => !(g.memberId === goals.memberId && g.weekKey === goals.weekKey)
  );
  save(KEYS.goals, [...all, goals]);
}

export function getOrCreateGoals(
  memberId: string,
  weekKey?: string
): MemberGoals {
  const key = weekKey ?? getWeekKey(new Date());
  return (
    getGoalsForMember(memberId, key) ?? {
      memberId,
      weekKey: key,
      primary: "",
      secondary: "",
      bonus: "",
      yearEnd: ["", "", ""],
      yearEndStatus: ["not_done", "not_done", "not_done"],
      monthly: ["", "", ""],
      monthlyStatus: ["not_done", "not_done", "not_done"],
      battery: { ...DEFAULT_BATTERY },
    }
  );
}

// ── Check-ins ─────────────────────────────────────────────

export function getAllCheckIns(): DailyCheckIn[] {
  return load<DailyCheckIn[]>(KEYS.checkIns, []);
}

export function getTodayCheckIns(date: string): DailyCheckIn[] {
  return getAllCheckIns().filter((c) => c.date === date);
}

export function getCheckInForMemberToday(
  memberId: string,
  date: string
): DailyCheckIn | null {
  return (
    getAllCheckIns().find(
      (c) => c.memberId === memberId && c.date === date
    ) ?? null
  );
}

export function saveCheckIn(checkIn: DailyCheckIn) {
  const all = getAllCheckIns().filter(
    (c) => !(c.memberId === checkIn.memberId && c.date === checkIn.date)
  );
  save(KEYS.checkIns, [...all, checkIn]);
}

export function getCheckInHistory(memberId: string): DailyCheckIn[] {
  return getAllCheckIns()
    .filter((c) => c.memberId === memberId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getLatestCheckInThisWeek(
  memberId: string,
  weekKey: string
): DailyCheckIn | null {
  const all = getAllCheckIns()
    .filter((c) => c.memberId === memberId)
    .sort((a, b) => b.date.localeCompare(a.date));

  for (const c of all) {
    const d = new Date(c.date + "T12:00:00");
    if (getWeekKey(d) === weekKey) return c;
  }
  return null;
}
