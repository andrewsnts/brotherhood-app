import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT 'indigo'
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS member_goals (
        id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        week_key TEXT NOT NULL,
        primary_goal TEXT NOT NULL DEFAULT '',
        secondary_goal TEXT NOT NULL DEFAULT '',
        bonus_goal TEXT NOT NULL DEFAULT '',
        year_end_1 TEXT NOT NULL DEFAULT '',
        year_end_2 TEXT NOT NULL DEFAULT '',
        year_end_3 TEXT NOT NULL DEFAULT '',
        monthly_1 TEXT NOT NULL DEFAULT '',
        monthly_2 TEXT NOT NULL DEFAULT '',
        monthly_3 TEXT NOT NULL DEFAULT '',
        battery_purpose_clarity INTEGER NOT NULL DEFAULT 7,
        battery_time_management INTEGER NOT NULL DEFAULT 7,
        battery_personal_growth INTEGER NOT NULL DEFAULT 7,
        battery_fitness INTEGER NOT NULL DEFAULT 7,
        battery_nutrition INTEGER NOT NULL DEFAULT 7,
        battery_sleep INTEGER NOT NULL DEFAULT 7,
        battery_community INTEGER NOT NULL DEFAULT 7,
        battery_family INTEGER NOT NULL DEFAULT 7,
        battery_financial_wellbeing INTEGER NOT NULL DEFAULT 7
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS daily_check_ins (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        battery_percent INTEGER NOT NULL DEFAULT 70,
        primary_status TEXT NOT NULL DEFAULT 'not_done',
        secondary_status TEXT NOT NULL DEFAULT 'not_done',
        bonus_status TEXT NOT NULL DEFAULT 'not_done',
        why_missed TEXT NOT NULL DEFAULT '',
        wins TEXT NOT NULL DEFAULT '',
        feeling TEXT NOT NULL DEFAULT ''
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS iron_john_journals (
        id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL,
        part_id INTEGER NOT NULL,
        reflection TEXT NOT NULL DEFAULT '',
        practice_note TEXT NOT NULL DEFAULT '',
        completed_at TEXT
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT '',
        event_date TEXT NOT NULL,
        event_time TEXT NOT NULL DEFAULT '',
        recurrence TEXT NOT NULL DEFAULT 'none',
        created_at TEXT NOT NULL
      )
    `;

    // Add recurrence column to existing events table if missing
    await sql`
      ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT 'none'
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("setup error", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
