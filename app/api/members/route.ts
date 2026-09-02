import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.groupId) {
    return NextResponse.json([]);
  }
  const rows = await sql`
    SELECT id, name, color FROM members
    WHERE group_id = ${session.user.groupId}
    ORDER BY name
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.groupId) {
    return NextResponse.json({ error: "Not in a group" }, { status: 403 });
  }
  const { id, name, color } = await req.json();
  const rows = await sql`
    INSERT INTO members (id, name, color, group_id)
    VALUES (${id}, ${name}, ${color}, ${session.user.groupId})
    ON CONFLICT (id) DO UPDATE SET name = ${name}, color = ${color}
    RETURNING id, name, color
  `;
  return NextResponse.json(rows[0]);
}
