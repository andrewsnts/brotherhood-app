import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/goals/all?memberId=xxx  — all goal records for a member across all weeks
export async function GET(req: NextRequest) {
  try {
    const memberId = new URL(req.url).searchParams.get("memberId");
    if (!memberId) {
      return NextResponse.json({ error: "memberId required" }, { status: 400 });
    }

    const rows = await sql`
      SELECT * FROM member_goals
      WHERE member_id = ${memberId}
      ORDER BY week_key DESC
    `;

    return NextResponse.json(
      rows.map((r) => ({
        memberId: r.member_id,
        weekKey: r.week_key,
        primary: r.primary_goal,
        secondary: r.secondary_goal,
        bonus: r.bonus_goal,
        yearEnd: [r.year_end_1, r.year_end_2, r.year_end_3],
        monthly: [r.monthly_1, r.monthly_2, r.monthly_3],
        battery: {
          purposeClarity: r.battery_purpose_clarity,
          timeManagement: r.battery_time_management,
          personalGrowth: r.battery_personal_growth,
          fitness: r.battery_fitness,
          nutrition: r.battery_nutrition,
          sleep: r.battery_sleep,
          community: r.battery_community,
          family: r.battery_family,
          financialWellbeing: r.battery_financial_wellbeing,
        },
      }))
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
