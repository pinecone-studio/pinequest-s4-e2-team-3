"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignIn } from "@clerk/nextjs/legacy";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";

export default function ForgotPasswordPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  // After we email the reset code, swap the form for the reset step.
  const [pendingReset, setPendingReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function describeError(err: unknown): string {
    return isClerkAPIResponseError(err)
      ? (err.errors[0]?.longMessage ?? err.errors[0]?.message ?? "Something went wrong")
      : "Something went wrong. Please try again.";
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setPendingReset(true);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
      } else {
        setError("Couldn't reset your password. Please try again.");
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        {!pendingReset ? (
          <>
            <h1 className="text-2xl font-bold text-primary-900 mb-1">Reset password</h1>
            <p className="text-gray-500 mb-6">
              Enter your email and we&apos;ll send you a reset code
            </p>

            <form onSubmit={handleSendCode} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500"
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={!isLoaded || submitting}
                className="w-full bg-primary-600 text-white rounded-xl py-3 font-semibold hover:bg-primary-700 transition-colors disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Send reset code"}
              </button>
            </form>

            <p className="text-center text-gray-500 mt-6 text-sm">
              Remembered it?{" "}
              <Link href="/login" className="text-primary-600 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-primary-900 mb-1">Set a new password</h1>
            <p className="text-gray-500 mb-6">
              We sent a code to <span className="font-medium text-ink">{email}</span>
            </p>

            <form onSubmit={handleReset} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Reset code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                autoComplete="one-time-code"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500"
              />
              <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500"
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={!isLoaded || submitting}
                className="w-full bg-primary-600 text-white rounded-xl py-3 font-semibold hover:bg-primary-700 transition-colors disabled:opacity-60"
              >
                {submitting ? "Resetting…" : "Reset password"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setPendingReset(false);
                setError(null);
              }}
              className="block w-full text-center text-gray-500 mt-6 text-sm hover:underline"
            >
              Use a different email
            </button>
          </>
        )}
      </div>
    </div>
  );
}
