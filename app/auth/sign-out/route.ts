import { NextResponse, type NextRequest } from "next/server";

function isSupabaseAuthCookie(name: string) {
  return name.startsWith("sb-") && (name.includes("auth-token") || name.includes("code-verifier"));
}

export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/auth/login", request.url));

  request.cookies.getAll().forEach((cookie) => {
    if (!isSupabaseAuthCookie(cookie.name)) return;
    response.cookies.set(cookie.name, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });
  });

  return response;
}

export function POST(request: NextRequest) {
  return GET(request);
}
