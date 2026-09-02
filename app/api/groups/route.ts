import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// POST: create a new group and add the user as first member
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupName, displayName, color } = await req.json();
  if (!groupName?.trim() || !displayName?.trim()) {
    return NextResponse.json({ error: "Group name and display name required" }, { status: 400 });
  }

  // Generate unique invite code
  let inviteCode = generateCode();
  for (let i = 0; i < 5; i++) {
    const exists = await sql`SELECT id FROM groups WHERE invite_code = ${inviteCode}`;
    if (exists.length === 0) break;
    inviteCode = generateCode();
  }

  const groupId = crypto.randomUUID();
  await sql`
    INSERT INTO groups (id, name, invite_code, created_at)
    VALUES (${groupId}, ${groupName.trim()}, ${inviteCode}, ${new Date().toISOString()})
  `;

  const memberId = crypto.randomUUID();
  await sql`
    INSERT INTO members (id, name, color, group_id)
    VALUES (${memberId}, ${displayName.trim()}, ${color ?? "indigo"}, ${groupId})
  `;

  await sql`
    UPDATE users SET group_id = ${groupId}, member_id = ${memberId}
    WHERE id = ${session.user.id}
  `;

  return NextResponse.json({ ok: true, inviteCode, groupId, memberId });
}
