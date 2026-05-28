import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Always allow auth routes, setup, and static assets
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/setup") ||
    pathname.startsWith("/api/seed") ||
    pathname.startsWith("/api/debug") ||
    pathname.startsWith("/_next") ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  // Not signed in → go to login
  if (!req.auth) {
    console.log("[proxy] no auth session → redirect /login | path:", pathname);
    return NextResponse.redirect(new URL("/login", req.url));
  }

  console.log("[proxy] auth session:", JSON.stringify({
    path: pathname,
    id: req.auth.user?.id,
    email: req.auth.user?.email,
    memberId: req.auth.user?.memberId,
  }));

  // Signed in but hasn't linked a member yet → go to link-member
  // Also allow /api/link-member so the POST from the picker works
  const isLinkMemberPath = pathname === "/link-member" || pathname.startsWith("/api/link-member");
  if (!req.auth.user?.memberId && !isLinkMemberPath) {
    console.log("[proxy] no memberId → redirect /link-member");
    return NextResponse.redirect(new URL("/link-member", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
