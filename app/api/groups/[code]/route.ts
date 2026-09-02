import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const upper = code.toUpperCase();

  const groups = await sql`SELECT id, name, invite_code FROM groups WHERE invite_code = ${upper}`;
  if (groups.length === 0) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  const group = groups[0];

  // Members in this group that no user has claimed yet
  const unclaimed = await sql`
    SELECT m.id, m.name, m.color FROM members m
    LEFT JOIN users u ON u.member_id = m.id
    WHERE m.group_id = ${group.id} AND u.id IS NULL
    ORDER BY m.name
  `;

  return NextResponse.json({ group, unclaimedMembers: unclaimed });
}
