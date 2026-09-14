import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const members = await sql`SELECT id, name FROM members ORDER BY name`;
    const checkins = await sql`SELECT * FROM morning_checkins ORDER BY member_id, date DESC`;
    return NextResponse.json({ members, checkins, count: checkins.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
