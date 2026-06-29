import { createClient } from "@/lib/supabase";

// Shared demo account so the "Enter demo" buttons create a REAL Supabase session
// (sign in) instead of just routing — that way Sign out has a session to clear.
// It's a throwaway demo login, hence the credentials live in the client.
export const DEMO_EMAIL = "sarus0659@gmail.com";
export const DEMO_PASSWORD = "Sevosama";

// Sign in the demo account. Returns an error message, or null on success.
export async function signInDemo(): Promise<string | null> {
  const { error } = await createClient().auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  return error?.message ?? null;
}
