import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const allUsers = await sql`
    SELECT id, email, name, member_id FROM users ORDER BY email
  `;
  return NextResponse.json({ allUsers });
}

// DELETE: wipe all auth tables so users can sign in fresh
export async function DELETE() {
  await sql`DELETE FROM sessions`;
  await sql`DELETE FROM accounts`;
  await sql`DELETE FROM verification_tokens`;
  await sql`DELETE FROM users`;
  return NextResponse.json({ ok: true, message: "Auth tables cleared." });
}
