"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export function HeaderActions() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
    });
  }, []);

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  const initial = (email.trim()[0] ?? "U").toUpperCase();

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
              <p className="truncate text-xs text-ink-muted">{email || "Signed in"}</p>
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
              onClick={() => { setOpen(false); handleSignOut(); }}
              className="block w-full px-4 py-2.5 text-left text-sm font-medium text-safety-critical hover:bg-sand-100"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
