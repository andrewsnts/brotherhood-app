import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function rowToCheckIn(r: Record<string, unknown>) {
  return {
    id: r.id,
    date: r.date,
    memberId: r.member_id,
    batteryPercent: r.battery_percent,
    primaryStatus: r.primary_status,
    secondaryStatus: r.secondary_status,
    bonusStatus: r.bonus_status,
    whyMissed: r.why_missed,
    wins: r.wins,
    feeling: r.feeling,
  };
}

// GET /api/checkins?memberId=xxx  — all history for a member
// GET /api/checkins               — all check-ins
export async function GET(req: NextRequest) {
  try {
    const memberId = new URL(req.url).searchParams.get("memberId");
    const rows = memberId
      ? await sql`SELECT * FROM daily_check_ins WHERE member_id = ${memberId} ORDER BY date DESC`
      : await sql`SELECT * FROM daily_check_ins ORDER BY date DESC`;
    return NextResponse.json(rows.map(rowToCheckIn));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/checkins — upsert
export async function POST(req: NextRequest) {
  try {
    const c = await req.json();
    await sql`
      INSERT INTO daily_check_ins (
        id, date, member_id, battery_percent,
        primary_status, secondary_status, bonus_status,
        why_missed, wins, feeling
      ) VALUES (
        ${c.id}, ${c.date}, ${c.memberId}, ${c.batteryPercent},
        ${c.primaryStatus}, ${c.secondaryStatus}, ${c.bonusStatus},
        ${c.whyMissed}, ${c.wins}, ${c.feeling}
      )
      ON CONFLICT (id) DO UPDATE SET
        battery_percent = ${c.batteryPercent},
        primary_status = ${c.primaryStatus},
        secondary_status = ${c.secondaryStatus},
        bonus_status = ${c.bonusStatus},
        why_missed = ${c.whyMissed},
        wins = ${c.wins},
        feeling = ${c.feeling}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
