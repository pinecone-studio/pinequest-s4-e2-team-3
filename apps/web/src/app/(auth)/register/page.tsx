"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { signInDemo } from "@/lib/demoAuth";
import { SparklesIcon } from "@/components/icons";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // "Enter demo" — sign in the shared demo account for real, then go to the app.
  async function enterDemo() {
    setError(null);
    setSubmitting(true);
    try {
      const msg = await signInDemo();
      if (msg) { setError(msg); return; }
      router.push("/");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        console.error("Signup error:", { message: error.message, status: error.status, name: error.name });
        const raw = error.message?.trim();
        const msg = raw && raw !== "0"
          ? raw
          : `Sign up failed (status ${error.status ?? "unknown"}). Most likely cause: Supabase email rate limit hit, or email confirmation is enabled without SMTP. Go to Supabase → Authentication → Providers → Email → turn off "Confirm email".`;
        setError(msg);
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
                <SparklesIcon size={22} />
              </span>
              <span className="text-xl font-bold text-ink">Polaris</span>
            </Link>
          </div>
          <div className="rounded-3xl bg-white p-8 shadow-[0_4px_24px_rgba(27,38,64,0.08)] text-center">
            <div className="mb-4 text-4xl">✉️</div>
            <h1 className="mb-1 text-2xl font-bold text-ink">Check your email</h1>
            <p className="text-ink-muted">
              We sent a confirmation link to{" "}
              <span className="font-medium text-ink">{email}</span>. Click it to activate your account.
            </p>
            <Link href="/login" className="mt-6 block text-sm font-medium text-primary-600 hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
              <SparklesIcon size={22} />
            </span>
            <span className="text-xl font-bold text-ink">Polaris</span>
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-[0_4px_24px_rgba(27,38,64,0.08)]">
          <h1 className="mb-1 text-2xl font-bold text-ink">Create account</h1>
          <p className="mb-6 text-ink-muted">Start your travel journey</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              className="w-full rounded-xl border border-sand-200 bg-sand-50 px-4 py-3 text-ink outline-none placeholder:text-ink-muted focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-xl border border-sand-200 bg-sand-50 px-4 py-3 text-ink outline-none placeholder:text-ink-muted focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full rounded-xl border border-sand-200 bg-sand-50 px-4 py-3 text-ink outline-none placeholder:text-ink-muted focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />

            {error && <p className="text-sm text-safety-critical">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-primary-600 py-3 font-semibold text-white transition-colors hover:bg-primary-700 active:scale-[0.97] disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create account"}
            </button>
          </form>

          {/* Presentation shortcut: skip sign-up and jump straight into the
              project demo. Used when walking through the product live. */}
          <div className="mt-6 border-t border-sand-200 pt-6">
            <button
              type="button"
              onClick={enterDemo}
              disabled={submitting}
              className="block w-full rounded-xl border border-primary-600 py-3 text-center font-semibold text-primary-600 transition-colors hover:bg-primary-50 active:scale-[0.97] disabled:opacity-60"
            >
              Enter demo →
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
