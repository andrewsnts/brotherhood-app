import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// POST: join an existing group by invite code, creating or claiming a member slot
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { inviteCode, displayName, color, claimMemberId } = await req.json();

  const groups = await sql`SELECT id FROM groups WHERE invite_code = ${inviteCode.toUpperCase()}`;
  if (groups.length === 0) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }
  const groupId = groups[0].id;

  let memberId: string;

  if (claimMemberId) {
    // Verify the slot is still unclaimed and belongs to this group
    const available = await sql`
      SELECT m.id FROM members m
      LEFT JOIN users u ON u.member_id = m.id
      WHERE m.id = ${claimMemberId} AND m.group_id = ${groupId} AND u.id IS NULL
    `;
    if (available.length === 0) {
      return NextResponse.json({ error: "That member slot is no longer available" }, { status: 409 });
    }
    memberId = claimMemberId;
  } else {
    if (!displayName?.trim()) {
      return NextResponse.json({ error: "Display name required" }, { status: 400 });
    }
    memberId = crypto.randomUUID();
    await sql`
      INSERT INTO members (id, name, color, group_id)
      VALUES (${memberId}, ${displayName.trim()}, ${color ?? "indigo"}, ${groupId})
    `;
  }

  await sql`
    UPDATE users SET group_id = ${groupId}, member_id = ${memberId}
    WHERE id = ${session.user.id}
  `;

  return NextResponse.json({ ok: true, groupId, memberId });
}
