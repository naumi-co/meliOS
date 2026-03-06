import { NextRequest, NextResponse } from "next/server";
import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "@/lib/auth";

const publicRoutes = ["/login", "/register", "/verify-email"];
const authApiPrefix = "/api/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow auth API routes
  if (pathname.startsWith(authApiPrefix)) {
    return NextResponse.next();
  }

  // Allow public routes without session check
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // For all other routes, check session
  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: { cookie: request.headers.get("cookie") ?? "" },
    }
  );

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
