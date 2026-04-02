import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

// Returns current ISO week key e.g. "2026-W14"
function getWeekKey(date: Date): string {
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

export async function POST() {
  try {
    const existing = await sql`SELECT id FROM members LIMIT 1`;
    if (existing.length > 0) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const weekKey = getWeekKey(new Date());

    await sql`INSERT INTO members (id, name, color) VALUES ('andrew', 'Andrew', 'indigo'), ('kiem', 'Kiem', 'purple') ON CONFLICT DO NOTHING`;

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
        ${'andrew-' + weekKey}, 'andrew', ${weekKey},
        'ZRC X assets x10', 'Get into AOD and make post', 'Finish the colour on Bioregional video.',
        'Finished and premiered Doc', 'Get married', 'Sell the doc',
        '1 additional option for storyline and format', 'Zircuit Content Plan', 'Posted MDMA video for Qi',
        8, 6, 7, 6, 6, 9, 9, 8, 9
      ) ON CONFLICT DO NOTHING
    `;

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
        ${'kiem-' + weekKey}, 'kiem', ${weekKey},
        '', '', '',
        '', '', '',
        '', '', '',
        7, 7, 7, 7, 7, 7, 7, 7, 7
      ) ON CONFLICT DO NOTHING
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("seed error", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
