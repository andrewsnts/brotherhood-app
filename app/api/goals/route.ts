import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_HABITS } from "@/lib/types";

function parseHabits(raw: unknown) {
  if (Array.isArray(raw) && raw.length > 0) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* fall through */ }
  }
  return DEFAULT_HABITS.map((h) => ({ ...h }));
}

// GET /api/goals?memberId=xxx&weekKey=2026-W14
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
    const weekKey = searchParams.get("weekKey");

    if (!memberId || !weekKey) {
      return NextResponse.json({ error: "memberId and weekKey required" }, { status: 400 });
    }

    const rows = await sql`
      SELECT * FROM member_goals WHERE member_id = ${memberId} AND week_key = ${weekKey} LIMIT 1
    `;

    // No goals for this week — inherit monthly/yearEnd/habits from most recent previous week
    if (rows.length === 0) {
      const prev = await sql`
        SELECT * FROM member_goals
        WHERE member_id = ${memberId} AND week_key < ${weekKey}
        ORDER BY week_key DESC LIMIT 1
      `;
      if (prev.length === 0) return NextResponse.json(null);
      const p = prev[0];
      return NextResponse.json({
        memberId,
        weekKey,
        primary: "",
        secondary: "",
        bonus: "",
        yearEnd: [p.year_end_1, p.year_end_2, p.year_end_3],
        yearEndStatus: [
          p.year_end_1_status ?? "not_done",
          p.year_end_2_status ?? "not_done",
          p.year_end_3_status ?? "not_done",
        ],
        monthly: [p.monthly_1, p.monthly_2, p.monthly_3],
        monthlyStatus: [
          p.monthly_1_status ?? "not_done",
          p.monthly_2_status ?? "not_done",
          p.monthly_3_status ?? "not_done",
        ],
        habits: parseHabits(p.habits),
      });
    }

    const r = rows[0];
    return NextResponse.json({
      memberId: r.member_id,
      weekKey: r.week_key,
      primary: r.primary_goal,
      secondary: r.secondary_goal,
      bonus: r.bonus_goal,
      yearEnd: [r.year_end_1, r.year_end_2, r.year_end_3],
      yearEndStatus: [
        r.year_end_1_status ?? "not_done",
        r.year_end_2_status ?? "not_done",
        r.year_end_3_status ?? "not_done",
      ],
      monthly: [r.monthly_1, r.monthly_2, r.monthly_3],
      monthlyStatus: [
        r.monthly_1_status ?? "not_done",
        r.monthly_2_status ?? "not_done",
        r.monthly_3_status ?? "not_done",
      ],
      habits: parseHabits(r.habits),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/goals — upsert
export async function POST(req: NextRequest) {
  try {
    const g = await req.json();
    const id = `${g.memberId}-${g.weekKey}`;

    const yes = ["completed", "in_progress", "not_done"];
    const safeStatus = (v: unknown) => (yes.includes(v as string) ? v : "not_done");
    const [yes1, yes2, yes3] = (g.yearEndStatus ?? []).map(safeStatus);
    const [mon1, mon2, mon3] = (g.monthlyStatus ?? []).map(safeStatus);
    const habitsJson = JSON.stringify(g.habits ?? []);

    await sql`
      INSERT INTO member_goals (
        id, member_id, week_key,
        primary_goal, secondary_goal, bonus_goal,
        year_end_1, year_end_2, year_end_3,
        year_end_1_status, year_end_2_status, year_end_3_status,
        monthly_1, monthly_2, monthly_3,
        monthly_1_status, monthly_2_status, monthly_3_status,
        habits
      ) VALUES (
        ${id}, ${g.memberId}, ${g.weekKey},
        ${g.primary}, ${g.secondary}, ${g.bonus},
        ${g.yearEnd[0]}, ${g.yearEnd[1]}, ${g.yearEnd[2]},
        ${yes1}, ${yes2}, ${yes3},
        ${g.monthly[0]}, ${g.monthly[1]}, ${g.monthly[2]},
        ${mon1}, ${mon2}, ${mon3},
        ${habitsJson}
      )
      ON CONFLICT (id) DO UPDATE SET
        primary_goal = ${g.primary},
        secondary_goal = ${g.secondary},
        bonus_goal = ${g.bonus},
        year_end_1 = ${g.yearEnd[0]}, year_end_2 = ${g.yearEnd[1]}, year_end_3 = ${g.yearEnd[2]},
        year_end_1_status = ${yes1}, year_end_2_status = ${yes2}, year_end_3_status = ${yes3},
        monthly_1 = ${g.monthly[0]}, monthly_2 = ${g.monthly[1]}, monthly_3 = ${g.monthly[2]},
        monthly_1_status = ${mon1}, monthly_2_status = ${mon2}, monthly_3_status = ${mon3},
        habits = ${habitsJson}
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
