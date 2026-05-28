import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { memberId } = await req.json();
  if (!memberId || typeof memberId !== "string") {
    return NextResponse.json({ error: "memberId required" }, { status: 400 });
  }

  // Make sure the member actually exists
  const members = await sql`SELECT id FROM members WHERE id = ${memberId}`;
  if (members.length === 0) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  await sql`
    UPDATE users SET member_id = ${memberId} WHERE id = ${session.user.id}
  `;

  return NextResponse.json({ ok: true });
}
