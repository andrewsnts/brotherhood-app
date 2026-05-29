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

// DELETE: wipe all auth tables so users can sign in fresh
// Safe to call — does NOT touch members, member_goals, daily_check_ins, etc.
export async function DELETE() {
  await sql`DELETE FROM sessions`;
  await sql`DELETE FROM accounts`;
  await sql`DELETE FROM verification_tokens`;
  await sql`DELETE FROM users`;
  return NextResponse.json({ ok: true, message: "Auth tables cleared. Sign in again." });
}
