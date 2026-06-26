"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  ChatIcon,
  CompassIcon,
  HomeIcon,
  MicIcon,
  SparklesIcon,
} from "@/components/icons";

type NavItem = {
  href: string;
  label: string;
  Icon: (props: { size?: number; className?: string }) => React.ReactNode;
};

// Order matches the Polaris bottom bar: Home · Explore · AI (centre) · Translate · Journey.
const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/explore", label: "Explore", Icon: CompassIcon },
  { href: "/ai", label: "AI", Icon: SparklesIcon },
  { href: "/translate", label: "Translate", Icon: MicIcon },
  { href: "/journey", label: "Journey", Icon: ChatIcon },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      <DesktopSidebar pathname={pathname} />
      <MobileTabBar pathname={pathname} />
    </>
  );
}

// Left sidebar on large screens.
function DesktopSidebar({ pathname }: { pathname: string }) {
  const router = useRouter();
  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sand-200 bg-sand-50 px-4 py-6 lg:flex">
      <Link href="/" className="mb-8 flex items-center gap-2 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white">
          <SparklesIcon size={20} />
        </span>
        <span className="text-xl font-bold text-ink">Polaris</span>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-primary-600 text-white"
                  : "text-ink-muted hover:bg-sand-200 hover:text-ink",
              ].join(" ")}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => signOut()}
        className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-sand-200 hover:text-ink"
      >
        <svg
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Sign out
      </button>
    </aside>
  );
}

// Floating bottom tab bar on small screens, with the AI action raised in the centre.
function MobileTabBar({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 rounded-t-3xl bg-white shadow-[0_-6px_24px_rgba(27,38,64,0.08)] lg:hidden">
      <ul className="mx-auto flex w-full max-w-sm items-end justify-around px-2 pb-5 pt-2">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname === href;
          const isCenter = href === "/ai";

          if (isCenter) {
            return (
              <li key={href}>
                <Link href={href} className="flex flex-col items-center gap-1 active:opacity-70">
                  <span className="-mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-600/30 transition-transform active:scale-95">
                    <Icon size={26} />
                  </span>
                  <span className="text-[11px] font-semibold text-primary-600">
                    {label}
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={href}>
              <Link
                href={href}
                className={[
                  "flex flex-col items-center gap-1 transition-opacity active:opacity-60",
                  isActive ? "text-primary-600" : "text-ink-muted",
                ].join(" ")}
              >
                <Icon size={24} />
                <span className="text-[11px] font-semibold">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
