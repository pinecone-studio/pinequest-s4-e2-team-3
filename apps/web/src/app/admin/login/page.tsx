"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Restore lockout from sessionStorage so refresh doesn't reset it
  useEffect(() => {
    const stored = sessionStorage.getItem("admin_locked_until");
    if (stored) {
      const until = parseInt(stored, 10);
      if (until > Date.now()) setLockedUntil(until);
      else sessionStorage.removeItem("admin_locked_until");
    }
    const storedAttempts = sessionStorage.getItem("admin_attempts");
    if (storedAttempts) setAttempts(parseInt(storedAttempts, 10));
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        setCountdown(0);
        sessionStorage.removeItem("admin_locked_until");
        sessionStorage.removeItem("admin_attempts");
      } else {
        setCountdown(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && lockedUntil > Date.now();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isLocked) return;

    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (res.ok) {
      sessionStorage.removeItem("admin_locked_until");
      sessionStorage.removeItem("admin_attempts");
      router.replace("/admin");
    } else {
      const data = await res.json();
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      sessionStorage.setItem("admin_attempts", String(newAttempts));

      if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_SECONDS * 1000;
        setLockedUntil(until);
        sessionStorage.setItem("admin_locked_until", String(until));
        setError(`${MAX_ATTEMPTS} удаа буруу оруулсан. ${LOCKOUT_SECONDS} секунд хүлээнэ үү.`);
      } else {
        setError(data.error ?? "Алдаа гарлаа");
      }
      setPassword("");
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-800 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Pinequest Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Нэвтрэх мэдээллээ оруулна уу</p>
        </div>

        {/* Lockout banner */}
        {isLocked && (
          <div className="mb-4 rounded-xl bg-red-950 border border-red-800 px-4 py-3 text-center">
            <p className="text-red-400 text-sm font-semibold">Хандалт түр хаагдсан</p>
            <p className="text-red-300 text-2xl font-bold mt-1">{countdown}с</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="И-мэйл"
            required
            disabled={isLocked}
            autoFocus
            className="w-full rounded-xl bg-gray-800 border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 text-sm disabled:opacity-40"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Нууц үг"
            required
            disabled={isLocked}
            className="w-full rounded-xl bg-gray-800 border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 text-sm disabled:opacity-40"
          />

          {error && !isLocked && (
            <div className="flex items-center gap-2 rounded-xl bg-red-950 border border-red-800 px-3 py-2">
              <span className="text-red-400 text-xs">{error}</span>
              {attempts > 0 && attempts < MAX_ATTEMPTS && (
                <span className="ml-auto text-red-600 text-xs shrink-0">
                  {MAX_ATTEMPTS - attempts} оролдлого үлдсэн
                </span>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isLocked || !email || !password}
            className="w-full rounded-xl bg-white text-gray-900 font-bold py-3 text-sm disabled:opacity-40 hover:bg-gray-100 transition-colors mt-1"
          >
            {loading ? "Нэвтэрч байна…" : "Нэвтрэх"}
          </button>
        </form>
      </div>
    </div>
  );
}
