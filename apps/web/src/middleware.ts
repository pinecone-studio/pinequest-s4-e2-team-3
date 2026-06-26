import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Supabase SSR session refresh.
//
// The browser client stores the auth session in cookies. Access tokens are
// short-lived, so on every request we let Supabase rotate them and write the
// refreshed cookies back onto the response. Without this, a logged-in user's
// session would silently expire and server routes (e.g. saving a trip) would
// see them as signed out.
//
// NOTE: this deliberately does NOT gate any routes. The app is a public demo
// (the `/preview` phone-frame loads the dashboard in an iframe and the screens
// render mock data), so forcing a login would break that experience. The only
// auth-gated action — saving a trip — protects itself inside its route handler.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session. Do not insert logic between client creation and this
  // call — Supabase relies on it to detect and rotate the auth token.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Run on every path except Next.js internals and static asset files, so the
  // session is refreshed for both page navigations and API calls.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
