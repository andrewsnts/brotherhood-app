import { NextRequest, NextResponse } from "next/server";

const PASSWORD = "DWAB";
const COOKIE = "bh_auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (password === PASSWORD) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  }

  return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
}
