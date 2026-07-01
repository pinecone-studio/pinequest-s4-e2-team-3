import { createClient } from "@/lib/supabase";

// Shared demo account so the "Enter demo" buttons create a REAL Supabase session
// (sign in) instead of just routing — that way Sign out has a session to clear.
// It's a throwaway demo login, hence the credentials live in the client.
export const DEMO_EMAIL = "sarus0659@gmail.com";
export const DEMO_PASSWORD = "Sevosama";

// Per-judge logins (login buttons 1-6). These are ORDINARY user accounts — they do
// NOT get the demo route / presenter controls (that stays sevo-only, DEMO_EMAIL).
// Just a one-tap sign-in per judge. Throwaway logins, so the credentials live here.
export const JUDGE_ACCOUNTS: { email: string; password: string }[] = [
  { email: "baagiiharu@gmail.com", password: "Aa12345678" },
  { email: "hs5879993@gmail.com", password: "Bb12345678" },
  { email: "sh4215994@gmail.com", password: "Cc12345678" },
  { email: "bath6069@gmail.com", password: "Dd12345678" },
  { email: "hharu5794@gmail.com", password: "Ee12345678" },
  { email: "temka435@gmail.com", password: "Ff12345678" },
];

// Sign in the demo account. Returns an error message, or null on success.
export async function signInDemo(): Promise<string | null> {
  const { error } = await createClient().auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  return error?.message ?? null;
}
