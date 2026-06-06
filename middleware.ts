// middleware.ts — Proteksi halaman: redirect ke /login jika belum login
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
  // Halaman /login, /receipt, dan /auth tidak perlu auth
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/login") || pathname.startsWith("/receipt") || pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  // Cek token dari cookie supabase
  const token = request.cookies.get("sb-access-token")?.value
    ?? request.cookies.get(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0]}-auth-token`)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
