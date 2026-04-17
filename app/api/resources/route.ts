import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function rowToResource(r: Record<string, unknown>) {
  return {
    id: r.id,
    memberId: r.member_id,
    category: r.category,
    title: r.title,
    url: r.url,
    description: r.description,
    createdAt: r.created_at,
  };
}

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM resources ORDER BY created_at DESC`;
    return NextResponse.json(rows.map(rowToResource));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const r = await req.json();
    await sql`
      INSERT INTO resources (id, member_id, category, title, url, description, created_at)
      VALUES (${r.id}, ${r.memberId}, ${r.category}, ${r.title}, ${r.url ?? ""}, ${r.description ?? ""}, ${r.createdAt})
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await sql`DELETE FROM resources WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
