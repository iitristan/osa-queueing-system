import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextRequestWithAuth } from "next-auth/middleware";

export async function middleware(request: NextRequestWithAuth) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    "/login",
    "/register",
    "/auth/error",
    "/auth/verify-request",
  ];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  if (!token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Role-based access control
  const userRole = token.role as string;
  const adminRoutes = ["/admin", "/api/admin"];
  const userRoutes = ["/display", "/api/user"];

  if (
    adminRoutes.some((route) => pathname.startsWith(route)) &&
    userRole !== "admin"
  ) {
    return NextResponse.redirect(new URL("/display", request.url));
  }

  if (
    userRoutes.some((route) => pathname.startsWith(route)) &&
    !["admin", "user"].includes(userRole)
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
