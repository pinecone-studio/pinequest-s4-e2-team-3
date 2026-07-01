import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

// Supabase email confirmation lands here with ?token_hash=...&type=signup
// (or type=recovery for password reset). We exchange the token for a session
// and redirect the user into the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "signup" | "recovery" | "email" | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — send to login with an error hint.
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
