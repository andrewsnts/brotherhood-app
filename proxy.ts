import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/setup") ||
    pathname.startsWith("/api/seed") ||
    pathname.startsWith("/api/debug") ||
    pathname.startsWith("/api/groups") ||
    pathname.startsWith("/_next") ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Signed in but not yet in a group → join/create a group
  if (!req.auth.user?.groupId && pathname !== "/join") {
    return NextResponse.redirect(new URL("/join", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
