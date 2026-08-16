import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { TRUECAP_RETURN_PATH_HEADER } from "@/lib/auth-return-path";

export async function updateSession(request: NextRequest) {
  // Pages cannot otherwise recover their current pathname from a Server
  // Component layout. Overwrite (never trust) any client-supplied value and
  // forward only the path — no query values, property data, or external URL.
  const forwardedHeaders = () => {
    const headers = new Headers(request.headers);
    headers.set(TRUECAP_RETURN_PATH_HEADER, request.nextUrl.pathname);
    return headers;
  };

  let supabaseResponse = NextResponse.next({
    request: { headers: forwardedHeaders() },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            // Re-clone after request.cookies.set so downstream Server
            // Components see a freshly rotated auth cookie on this request.
            request: { headers: forwardedHeaders() },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}
