"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, MapPinIcon, SparklesIcon } from "@/components/icons";
import { getRoutes } from "@/lib/routes";
import { planDayToRoute, type PlanInput } from "@/lib/planToRoute";
import { createClient } from "@/lib/supabase";
import { DEMO_EMAIL } from "@/lib/demoAuth";
import { useLiveStore } from "@/stores/liveStore";
import type { DemoRoute } from "@/types";
import type { Theme } from "../types";
import { ThemeToggle } from "./ThemeToggle";

type PlanStop = { day: number; time: string; title: string; note?: string };
interface SavedPlan extends PlanInput {
  id: string;
  title: string;
  summary: string;
  stops?: PlanStop[] | string[];
}

// A plan's stops may be a plain string[] (older shape) or structured PlanStop[].
function structured(stops: SavedPlan["stops"]): PlanStop[] {
  if (!stops?.length) return [];
  if (typeof stops[0] === "string") {
    return (stops as string[]).map((title) => ({ day: 1, time: "", title }));
  }
  return stops as PlanStop[];
}

function dayNumbers(plan: SavedPlan): number[] {
  return [...new Set(structured(plan.stops).map((s) => s.day))].sort((a, b) => a - b);
}

// The traveller's own saved plans: localStorage first (has the just-saved plan
// even offline), overridden by the backend when signed in. Mirrors the Journey
// page's loading, minus the guided demo trip. ponytail: same merge, one screen over.
async function loadUserPlans(signedIn: boolean): Promise<SavedPlan[]> {
  let cached: SavedPlan[] = [];
  try {
    cached = JSON.parse(localStorage.getItem("polaris:saved-plans") ?? "[]") as SavedPlan[];
  } catch { /* ignore corrupt storage */ }
  cached = cached.filter((p) => !String(p.id).startsWith("route:"));
  try {
    const res = await fetch("/api/trips");
    if (signedIn && res.ok) {
      const backend = (await res.json()) as SavedPlan[];
      if (Array.isArray(backend)) return backend;
    }
  } catch { /* offline / signed out — keep local */ }
  return cached;
}

// Route picker — shown until a route is active. Lists the guided demo journeys
// (demo account) and the traveller's own saved plans, day by day.
export function RoutePicker({
  theme,
  onToggleTheme,
}: {
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const setRoute = useLiveStore((s) => s.setRoute);
  const setSimulated = useLiveStore((s) => s.setSimulated);
  const [routes, setRoutes] = useState<DemoRoute[]>([]);
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  // Which plan-day is being prepared (geocode + narration), so its card shows a
  // spinner; and the last conversion error to surface.
  const [startingKey, setStartingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await createClient().auth.getUser();
      const signedIn = !!data.user;
      const isDemo = data.user?.email?.toLowerCase() === DEMO_EMAIL.toLowerCase();
      const [demo, userPlans] = await Promise.all([
        isDemo ? getRoutes() : Promise.resolve<DemoRoute[]>([]),
        loadUserPlans(signedIn),
      ]);
      setRoutes(demo);
      setPlans(userPlans);
      setLoading(false);
    })();
  }, []);

  const startDemo = (route: DemoRoute) => {
    setRoute(route); // resets simulatedCoords to null…
    const first = route.stops[0];
    // …so every demo begins at the first stop, not the user's real GPS.
    if (first) setSimulated({ latitude: first.latitude, longitude: first.longitude });
  };

  // A user plan is just names + notes, so resolve it to a live route (geocode +
  // narration) before handing off. Real GPS drives it — no simulated position.
  const startPlanDay = async (plan: SavedPlan, day: number) => {
    setError(null);
    setStartingKey(`${plan.id}:${day}`);
    try {
      const route = await planDayToRoute(plan, day);
      if (route) setRoute(route);
      else setError("Couldn't locate these stops on the map. Try adding more specific places.");
    } catch {
      setError("Couldn't start the live guide just now. Check your connection and try again.");
    } finally {
      setStartingKey(null);
    }
  };

  const isEmpty = routes.length === 0 && plans.length === 0;

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
      ) : isEmpty ? (
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
          {/* The traveller's own saved plans — one card per day. */}
          {plans.map((plan) =>
            dayNumbers(plan).map((day) => {
              const dayStops = structured(plan.stops).filter((s) => s.day === day);
              const key = `${plan.id}:${day}`;
              const busy = startingKey === key;
              return (
                <button
                  key={key}
                  onClick={() => void startPlanDay(plan, day)}
                  disabled={!!startingKey}
                  className="w-full rounded-3xl bg-white p-5 text-left shadow-ink-sm backdrop-blur transition-colors hover:bg-sand-50 disabled:opacity-60 dark:bg-white/[0.07] dark:shadow-none dark:hover:bg-white/[0.12]"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wide text-primary-600 dark:text-primary-500">
                    Your plan · Day {day} · {dayStops.length} stops
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="flex-1 font-serif text-xl leading-tight">{plan.title}</p>
                    {busy ? (
                      <span className="shrink-0 text-xs font-semibold text-ink-muted dark:text-white/60">
                        Preparing…
                      </span>
                    ) : (
                      <ChevronRightIcon
                        size={18}
                        className="shrink-0 text-ink-muted/60 dark:text-white/40"
                      />
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted dark:text-white/55">
                    {dayStops.map((s) => s.title).join(" → ")}
                  </p>
                </button>
              );
            }),
          )}

          {/* Guided demo journeys (demo account only). */}
          {routes.map((route) => (
            <button
              key={route.id}
              onClick={() => startDemo(route)}
              disabled={!!startingKey}
              className="w-full rounded-3xl bg-white p-5 text-left shadow-ink-sm backdrop-blur transition-colors hover:bg-sand-50 disabled:opacity-60 dark:bg-white/[0.07] dark:shadow-none dark:hover:bg-white/[0.12]"
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

          {error && (
            <p className="px-1 text-xs font-semibold text-safety-critical">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
