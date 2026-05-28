import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Always allow auth routes, setup, and static assets
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/setup") ||
    pathname.startsWith("/api/seed") ||
    pathname.startsWith("/_next") ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  // Not signed in → go to login
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Signed in but hasn't linked a member yet → go to link-member
  if (!req.auth.user?.memberId && pathname !== "/link-member") {
    return NextResponse.redirect(new URL("/link-member", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
