import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  // Refresh session token on every request
  const { data: { user } } = await supabase.auth.getUser();

  // Admin protection — requires a valid Supabase session with the admin email.
  // Covers both the /admin pages AND the /api/admin/* routes (the API routes
  // were previously open — anyone could POST/DELETE places without logging in).
  const isAdminArea =
    (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) ||
    // /api/admin/auth is the public login/logout endpoint — must stay open.
    (pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/auth"));
  if (isAdminArea) {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!user || (adminEmail && user.email !== adminEmail)) {
      // API calls get a 401; pages redirect to login.
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  // Run on every path except Next.js internals and static asset files, so the
  // session is refreshed for both page navigations and API calls.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
