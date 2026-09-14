import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function calcStreak(descDates: string[]): number {
  if (descDates.length === 0) return 0;
  const dateSet = new Set(descDates);
  let streak = 0;
  // Start from most recent check-in, walk backward skipping weekends
  let cur = new Date(descDates[0] + "T12:00:00Z");
  for (let i = 0; i < 300; i++) {
    const dow = cur.getUTCDay();
    if (dow === 0 || dow === 6) { cur.setUTCDate(cur.getUTCDate() - 1); continue; }
    const d = cur.toISOString().split("T")[0];
    if (dateSet.has(d)) { streak++; cur.setUTCDate(cur.getUTCDate() - 1); }
    else break;
  }
  return streak;
}

export async function GET() {
  const rows = await sql`
    SELECT member_id, date FROM morning_checkins ORDER BY member_id, date DESC
  `;

  const byMember: Record<string, string[]> = {};
  for (const row of rows) {
    if (!byMember[row.member_id]) byMember[row.member_id] = [];
    byMember[row.member_id].push(row.date);
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const streaks: Record<string, number> = {};
  const todayCheckins: string[] = [];

  for (const [memberId, dates] of Object.entries(byMember)) {
    streaks[memberId] = calcStreak(dates);
    if (dates[0] === today) todayCheckins.push(memberId);
  }

  return NextResponse.json({ streaks, todayCheckins });
}

export async function POST(req: NextRequest) {
  const { memberId, date } = await req.json();
  if (!memberId || !date) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await sql`
    INSERT INTO morning_checkins (member_id, date, checked_in_at)
    VALUES (${memberId}, ${date}, ${new Date().toISOString()})
    ON CONFLICT (member_id, date) DO NOTHING
  `;

  const rows = await sql`
    SELECT date FROM morning_checkins WHERE member_id = ${memberId} ORDER BY date DESC
  `;
  const streak = calcStreak(rows.map((r: { date: string }) => r.date));

  return NextResponse.json({ ok: true, streak });
}
