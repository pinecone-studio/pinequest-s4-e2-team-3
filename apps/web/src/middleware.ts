import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// The auth screens are the only public pages — everything else (the app shell,
// live guide, SOS, etc.) requires a signed-in user. Unauthenticated visitors are
// redirected to NEXT_PUBLIC_CLERK_SIGN_IN_URL (/login).
const isPublicRoute = createRouteMatcher(["/login", "/register", "/forgot-password"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
