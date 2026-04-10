import { NextRequest, NextResponse } from "next/server";

const COOKIE = "bh_auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow login page and its API route through
  if (pathname.startsWith("/login") || pathname.startsWith("/api/login")) {
    return NextResponse.next();
  }

  const auth = req.cookies.get(COOKIE)?.value;
  if (auth === "1") return NextResponse.next();

  // Redirect to login, preserving destination
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
