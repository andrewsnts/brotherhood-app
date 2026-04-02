import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/checkins/today?memberId=xxx&date=2026-04-01
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
    const date = searchParams.get("date");

    if (!memberId || !date) {
      return NextResponse.json({ error: "memberId and date required" }, { status: 400 });
    }

    const rows = await sql`
      SELECT * FROM daily_check_ins
      WHERE member_id = ${memberId} AND date = ${date}
      LIMIT 1
    `;

    if (rows.length === 0) return NextResponse.json(null);

    const r = rows[0];
    return NextResponse.json({
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
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
