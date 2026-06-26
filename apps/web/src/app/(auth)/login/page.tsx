"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { SparklesIcon } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); return; }
      router.push("/");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
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
          <h1 className="mb-1 text-2xl font-bold text-ink">Sign in</h1>
          <p className="mb-6 text-ink-muted">Welcome back to Polaris</p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              autoComplete="current-password"
              className="w-full rounded-xl border border-sand-200 bg-sand-50 px-4 py-3 text-ink outline-none placeholder:text-ink-muted focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />

            {error && <p className="text-sm text-safety-critical">{error}</p>}

            <div className="text-right">
              <Link href="/forgot-password" className="text-sm font-medium text-primary-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-primary-600 py-3 font-semibold text-white transition-colors hover:bg-primary-700 active:scale-[0.97] disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Presentation shortcut: skip the credentials form and jump straight
              into the app demo. Handy when walking through the product live. */}
          <div className="mt-6 border-t border-sand-200 pt-6">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full rounded-xl border border-primary-600 py-3 font-semibold text-primary-600 transition-colors hover:bg-primary-50 active:scale-[0.97]"
            >
              Enter demo →
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary-600 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
