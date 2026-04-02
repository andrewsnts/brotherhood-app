import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ memberId: string; partId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { memberId, partId } = await params;
    const rows = await sql`
      SELECT * FROM iron_john_journals
      WHERE member_id = ${memberId} AND part_id = ${parseInt(partId)}
      LIMIT 1
    `;
    if (rows.length === 0) return NextResponse.json(null);
    const r = rows[0];
    return NextResponse.json({
      memberId: r.member_id,
      partId: r.part_id,
      reflection: r.reflection,
      practiceNote: r.practice_note,
      completedAt: r.completed_at,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { memberId, partId } = await params;
    const { reflection, practiceNote, completedAt } = await req.json();
    const id = `${memberId}-${partId}`;

    await sql`
      INSERT INTO iron_john_journals (id, member_id, part_id, reflection, practice_note, completed_at)
      VALUES (${id}, ${memberId}, ${parseInt(partId)}, ${reflection}, ${practiceNote}, ${completedAt ?? null})
      ON CONFLICT (id) DO UPDATE SET
        reflection = ${reflection},
        practice_note = ${practiceNote},
        completed_at = ${completedAt ?? null}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
