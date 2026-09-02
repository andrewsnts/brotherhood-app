import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await sql`SELECT id, name, color FROM members ORDER BY name`;
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, name, color } = await req.json();
    const rows = await sql`
      INSERT INTO members (id, name, color) VALUES (${id}, ${name}, ${color})
      ON CONFLICT (id) DO UPDATE SET name = ${name}, color = ${color}
      RETURNING id, name, color
    `;
    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
