import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fingerspot-secret-key-change-in-production",
);

// Endpoints yang harus tetap bisa diakses tanpa cookie auth,
// supaya dashboard API (data absensi/user/pins/stats) tidak ke-redirect ke /login.
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/webhook/fingerspot",
  "/api/attlog",
  "/api/userinfo",
  "/api/pins",
  "/api/stats",
  "/api/api-logs",
  "/api/webhook-logs",
  "/api/payload",
  "/api/fingerspot",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("fingerspot-auth")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("fingerspot-auth");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
