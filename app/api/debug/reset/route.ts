import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/debug/reset — wipes auth tables so users can sign in fresh
// Safe: does NOT touch members, member_goals, daily_check_ins, etc.
export async function GET() {
  await sql`DELETE FROM sessions`;
  await sql`DELETE FROM accounts`;
  await sql`DELETE FROM verification_tokens`;
  await sql`DELETE FROM users`;
  return NextResponse.json({ ok: true, message: "Auth tables cleared. Sign in again at /login." });
}
