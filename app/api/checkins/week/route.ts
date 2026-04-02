import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/checkins/week?memberId=xxx&weekKey=2026-W14
// Returns the latest check-in for that member within a given ISO week
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
    const weekKey = searchParams.get("weekKey");

    if (!memberId || !weekKey) {
      return NextResponse.json({ error: "memberId and weekKey required" }, { status: 400 });
    }

    // Derive date range from weekKey e.g. "2026-W14"
    const [year, wStr] = weekKey.split("-W");
    const weekNum = parseInt(wStr, 10);
    // Monday of that ISO week
    const jan4 = new Date(parseInt(year), 0, 4);
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (weekNum - 1) * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const rows = await sql`
      SELECT * FROM daily_check_ins
      WHERE member_id = ${memberId}
        AND date >= ${fmt(monday)}
        AND date <= ${fmt(sunday)}
      ORDER BY date DESC
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
