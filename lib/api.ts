import { Member, MemberGoals, DailyCheckIn, DEFAULT_BATTERY, MEMBER_COLORS } from "./types";

// ── Members ──────────────────────────────────────────────────────────────────

export async function getMembers(): Promise<Member[]> {
  const res = await fetch("/api/members");
  if (!res.ok) throw new Error("Failed to fetch members");
  return res.json();
}

export async function upsertMember(member: Member): Promise<Member> {
  const res = await fetch("/api/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(member),
  });
  if (!res.ok) throw new Error("Failed to save member");
  return res.json();
}

export async function updateMemberColor(id: string, color: string): Promise<void> {
  await fetch(`/api/members/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ color }),
  });
}

export async function deleteMember(id: string): Promise<void> {
  await fetch(`/api/members/${id}`, { method: "DELETE" });
}

export async function addMember(name: string, existingCount: number): Promise<Member> {
  const color = MEMBER_COLORS[existingCount % MEMBER_COLORS.length];
  const member: Member = { id: crypto.randomUUID(), name: name.trim(), color };
  return upsertMember(member);
}

// ── Goals ─────────────────────────────────────────────────────────────────────

export async function getGoals(memberId: string, weekKey: string): Promise<MemberGoals> {
  const res = await fetch(`/api/goals?memberId=${memberId}&weekKey=${encodeURIComponent(weekKey)}`);
  if (!res.ok) throw new Error("Failed to fetch goals");
  const data = await res.json();
  if (!data) {
    return {
      memberId,
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
  }
  return data;
}

export async function getAllGoalsForMember(memberId: string): Promise<MemberGoals[]> {
  const res = await fetch(`/api/goals/all?memberId=${memberId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function saveGoals(goals: MemberGoals): Promise<void> {
  const res = await fetch("/api/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(goals),
  });
  if (!res.ok) throw new Error("Failed to save goals");
}

// ── Check-ins ─────────────────────────────────────────────────────────────────

export async function getAllCheckIns(): Promise<DailyCheckIn[]> {
  const res = await fetch("/api/checkins");
  if (!res.ok) throw new Error("Failed to fetch check-ins");
  return res.json();
}

export async function getCheckInForMemberToday(
  memberId: string,
  date: string
): Promise<DailyCheckIn | null> {
  const res = await fetch(
    `/api/checkins/today?memberId=${memberId}&date=${date}`
  );
  if (!res.ok) return null;
  return res.json();
}

export async function getLatestCheckInThisWeek(
  memberId: string,
  weekKey: string
): Promise<DailyCheckIn | null> {
  const res = await fetch(
    `/api/checkins/week?memberId=${memberId}&weekKey=${encodeURIComponent(weekKey)}`
  );
  if (!res.ok) return null;
  return res.json();
}

export async function saveCheckIn(checkIn: DailyCheckIn): Promise<void> {
  const res = await fetch("/api/checkins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(checkIn),
  });
  if (!res.ok) throw new Error("Failed to save check-in");
}

// ── Iron John ─────────────────────────────────────────────────────────────────

export interface IronJohnJournal {
  memberId: string;
  partId: number;
  reflection: string;
  practiceNote: string;
  completedAt: string | null;
}

export async function getIronJohnJournal(
  memberId: string,
  partId: number
): Promise<IronJohnJournal | null> {
  const res = await fetch(`/api/ironjohn/${memberId}/${partId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function saveIronJohnJournal(journal: IronJohnJournal): Promise<void> {
  const res = await fetch(`/api/ironjohn/${journal.memberId}/${journal.partId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(journal),
  });
  if (!res.ok) throw new Error("Failed to save journal");
}

// ── Init ──────────────────────────────────────────────────────────────────────

export async function initDb(): Promise<void> {
  await fetch("/api/setup", { method: "POST" });
  await fetch("/api/seed", { method: "POST" });
}
