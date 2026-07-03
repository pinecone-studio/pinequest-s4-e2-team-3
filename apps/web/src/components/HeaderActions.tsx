"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { signOutAndClear } from "@/lib/authSession";
import { useOnlineStatus } from "@/context/OnlineStatus";

export function HeaderActions() {
  const router = useRouter();
  const { online } = useOnlineStatus();
  // null = auth check pending, "" = confirmed signed out, otherwise the email.
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
    });
  }, []);

  async function handleSignOut() {
    if (!online) return;
    await signOutAndClear();
    router.push("/login");
  }

  const initial = (email?.trim()[0] ?? "").toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/sos"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-safety-critical/30 bg-white"
      >
        <span className="text-[11px] font-extrabold tracking-wide text-safety-critical">
          SOS
        </span>
      </Link>

      {/* Signed out (email === "") gets an honest Sign in link instead of a
          fake avatar; while the check is pending (null) the circle is blank. */}
      {email === "" ? (
        <Link
          href="/login"
          className="flex h-11 items-center rounded-full bg-primary-600 px-4 text-sm font-semibold text-white"
        >
          Sign in
        </Link>
      ) : (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#c9d8f5] to-[#9fb6e8] font-bold text-primary-900"
        >
          {initial}
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-lg shadow-ink/10"
          >
            <div className="border-b border-ink/5 px-4 py-3">
              <p className="truncate text-xs text-ink-muted">{email}</p>
            </div>

            <Link
              href="/sos"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm font-medium text-ink hover:bg-sand-100"
            >
              Emergency SOS
            </Link>

            <button
              type="button"
              role="menuitem"
              disabled={!online}
              title={online ? undefined : "Sign out needs a connection"}
              onClick={() => { if (!online) return; setOpen(false); handleSignOut(); }}
              className="block w-full px-4 py-2.5 text-left text-sm font-medium text-safety-critical hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Sign out{!online && <span className="ml-1 text-xs font-normal text-ink-muted">(offline)</span>}
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
