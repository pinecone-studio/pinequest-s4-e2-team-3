"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, MapPinIcon, SparklesIcon } from "@/components/icons";
import { getRoutes } from "@/lib/routes";
import { createClient } from "@/lib/supabase";
import { DEMO_EMAIL } from "@/lib/demoAuth";
import { useLiveStore } from "@/stores/liveStore";
import type { DemoRoute } from "@/types";
import type { Theme } from "../types";
import { ThemeToggle } from "./ThemeToggle";

// Route picker — shown until a route is active. Each route is a demo journey.
export function RoutePicker({
  theme,
  onToggleTheme,
}: {
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const setRoute = useLiveStore((s) => s.setRoute);
  const setSimulated = useLiveStore((s) => s.setSimulated);
  // The guided demo routes belong to the demo (sevo) account only — other
  // signed-in users have no pre-authored live journey, so they see the empty
  // state. Mirrors the same gate the Journey page applies to the trip plan.
  const [routes, setRoutes] = useState<DemoRoute[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void (async () => {
      const { data } = await createClient().auth.getUser();
      const isDemo = data.user?.email?.toLowerCase() === DEMO_EMAIL.toLowerCase();
      if (isDemo) setRoutes(await getRoutes());
      setLoading(false);
    })();
  }, []);

  const start = (route: DemoRoute) => {
    setRoute(route); // resets simulatedCoords to null…
    const first = route.stops[0];
    // …so every demo begins at the first stop, not the user's real GPS.
    if (first) setSimulated({ latitude: first.latitude, longitude: first.longitude });
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/5 dark:bg-white/10"
        >
          <ChevronLeftIcon size={20} />
        </Link>
        <span className="text-sm font-semibold text-ink-muted dark:text-white/70">
          Live Guide
        </span>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} className="ml-auto" />
      </div>

      <h1 className="mt-6 font-serif text-3xl leading-tight">
        Where shall we go?
      </h1>

      {loading ? (
        <div className="mt-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-3xl bg-white/70 dark:bg-white/[0.07]"
            />
          ))}
        </div>
      ) : routes.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-white/10">
            <MapPinIcon size={28} className="text-primary-500" />
          </div>
          <div>
            <p className="font-serif text-xl">No live journey yet</p>
            <p className="mt-1.5 max-w-xs text-sm text-ink-muted dark:text-white/55">
              Plan a trip with Michelle first — once you have a day-by-day plan,
              you can walk it here with the live guide.
            </p>
          </div>
          <Link
            href="/ai"
            className="flex items-center gap-2 rounded-full bg-primary-600 px-6 py-3 text-sm font-bold text-white hover:bg-primary-700"
          >
            <SparklesIcon size={14} />
            Plan with Michelle
          </Link>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {routes.map((route) => (
            <button
              key={route.id}
              onClick={() => start(route)}
              className="w-full rounded-3xl bg-white p-5 text-left shadow-ink-sm backdrop-blur transition-colors hover:bg-sand-50 dark:bg-white/[0.07] dark:shadow-none dark:hover:bg-white/[0.12]"
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-primary-600 dark:text-primary-500">
                {route.region} · {route.stops.length} stops
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="flex-1 font-serif text-xl leading-tight">{route.title}</p>
                <ChevronRightIcon
                  size={18}
                  className="shrink-0 text-ink-muted/60 dark:text-white/40"
                />
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-ink-muted dark:text-white/55">
                {route.stops.map((s) => s.name).join(" → ")}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
