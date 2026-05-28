import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  let userRecord = null;

  if (session?.user?.id) {
    const rows = await sql`
      SELECT id, email, name, member_id
      FROM users
      WHERE id = ${session.user.id}
    `;
    userRecord = rows[0] ?? null;
  }

  // Also show all users so we can see what's in the DB
  const allUsers = await sql`
    SELECT id, email, name, member_id FROM users ORDER BY email
  `;

  return NextResponse.json({
    session,
    userRecord,
    allUsers,
  });
}

// DELETE: clear the current user's member_id so they go through link-member again
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  await sql`UPDATE users SET member_id = NULL WHERE id = ${session.user.id}`;
  return NextResponse.json({ ok: true, cleared: session.user.id });
}
