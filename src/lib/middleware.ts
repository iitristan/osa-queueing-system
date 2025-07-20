import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabase } from "./supabase";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  // If no token and trying to access protected routes, redirect to login
  if (!token) {
    if (request.nextUrl.pathname.startsWith("/admin") || 
        request.nextUrl.pathname.startsWith("/display")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Check user role from Supabase
  const { data: user, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", token.sub)
    .single();

  if (error) {
    console.error("Error fetching user role:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Allow access to queue for admin users
  if (user?.role === "admin" && request.nextUrl.pathname.startsWith("/display")) {
    return NextResponse.next();
  }

  // Allow access to admin routes only for admin users
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (user?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: ["/admin/:path*", "/display/:path*"],
};