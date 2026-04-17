import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function rowToEvent(r: Record<string, unknown>) {
  return {
    id: r.id,
    memberId: r.member_id,
    title: r.title,
    description: r.description,
    location: r.location,
    eventDate: r.event_date,
    eventTime: r.event_time,
    createdAt: r.created_at,
  };
}

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM events ORDER BY event_date ASC, event_time ASC`;
    return NextResponse.json(rows.map(rowToEvent));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const e = await req.json();
    await sql`
      INSERT INTO events (id, member_id, title, description, location, event_date, event_time, created_at)
      VALUES (${e.id}, ${e.memberId}, ${e.title}, ${e.description ?? ""}, ${e.location ?? ""}, ${e.eventDate}, ${e.eventTime ?? ""}, ${e.createdAt})
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await sql`DELETE FROM events WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
