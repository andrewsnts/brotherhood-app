import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

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

    if (rows.length === 0) return NextResponse.json(null);

    const r = rows[0];
    return NextResponse.json({
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

    await sql`
      INSERT INTO member_goals (
        id, member_id, week_key,
        primary_goal, secondary_goal, bonus_goal,
        year_end_1, year_end_2, year_end_3,
        monthly_1, monthly_2, monthly_3,
        battery_purpose_clarity, battery_time_management, battery_personal_growth,
        battery_fitness, battery_nutrition, battery_sleep,
        battery_community, battery_family, battery_financial_wellbeing
      ) VALUES (
        ${id}, ${g.memberId}, ${g.weekKey},
        ${g.primary}, ${g.secondary}, ${g.bonus},
        ${g.yearEnd[0]}, ${g.yearEnd[1]}, ${g.yearEnd[2]},
        ${g.monthly[0]}, ${g.monthly[1]}, ${g.monthly[2]},
        ${g.battery.purposeClarity}, ${g.battery.timeManagement}, ${g.battery.personalGrowth},
        ${g.battery.fitness}, ${g.battery.nutrition}, ${g.battery.sleep},
        ${g.battery.community}, ${g.battery.family}, ${g.battery.financialWellbeing}
      )
      ON CONFLICT (id) DO UPDATE SET
        primary_goal = ${g.primary},
        secondary_goal = ${g.secondary},
        bonus_goal = ${g.bonus},
        year_end_1 = ${g.yearEnd[0]}, year_end_2 = ${g.yearEnd[1]}, year_end_3 = ${g.yearEnd[2]},
        monthly_1 = ${g.monthly[0]}, monthly_2 = ${g.monthly[1]}, monthly_3 = ${g.monthly[2]},
        battery_purpose_clarity = ${g.battery.purposeClarity},
        battery_time_management = ${g.battery.timeManagement},
        battery_personal_growth = ${g.battery.personalGrowth},
        battery_fitness = ${g.battery.fitness},
        battery_nutrition = ${g.battery.nutrition},
        battery_sleep = ${g.battery.sleep},
        battery_community = ${g.battery.community},
        battery_family = ${g.battery.family},
        battery_financial_wellbeing = ${g.battery.financialWellbeing}
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
