"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPinIcon,
  SparklesIcon,
  StarIcon,
  TrashIcon,
  WalkIcon,
  ChevronRightIcon,
} from "@/components/icons";
import { FeatureGate } from "@/components/FeatureGate";
import { DirectionsSheet } from "@/components/DirectionsSheet";
import { demoRoutes, getRoutes } from "@/lib/routes";
import { planDayToRoute } from "@/lib/planToRoute";
import { useLiveStore } from "@/stores/liveStore";
import { createClient } from "@/lib/supabase";
import { DEMO_EMAIL } from "@/lib/demoAuth";
import type { DemoRoute } from "@/types";

interface PlanStop {
  day: number;
  time: string;
  title: string;
  note?: string;
}

interface PlanPlace {
  name: string;
  address?: string;
  imageUrl?: string;
  rating?: number;
  walkMinutes?: number;
  latitude?: number;
  longitude?: number;
}

interface SavedPlan {
  id: string;
  title: string;
  summary: string;
  stops?: PlanStop[] | string[];
  doneStops?: string[];
  savedAt: string;
  places?: PlanPlace[];
  startDate?: string; // ISO date "YYYY-MM-DD" — first day of the actual trip
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toStructured(stops: PlanStop[] | string[] | undefined): PlanStop[] {
  if (!stops?.length) return [];
  if (typeof stops[0] === "string") {
    return (stops as string[]).map((title) => ({ day: 1, time: "", title }));
  }
  return stops as PlanStop[];
}

function stopKey(s: PlanStop) {
  return `${s.day}:${s.title}`;
}

function firstActiveDay(stops: PlanStop[], doneSet: Set<string>): number {
  const days = [...new Set(stops.map((s) => s.day))].sort((a, b) => a - b);
  const incomplete = days.find((d) =>
    stops.filter((s) => s.day === d).some((s) => !doneSet.has(stopKey(s))),
  );
  return incomplete ?? days[days.length - 1] ?? 1;
}

function matchPlace(title: string, places: PlanPlace[]): PlanPlace | undefined {
  const key = title.toLowerCase();
  return places.find((p) => p.name.toLowerCase() === key)
    ?? places.find((p) => key.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(key));
}

function regionLabel(region: string): string {
  return region.charAt(0).toUpperCase() + region.slice(1);
}

// ---------------------------------------------------------------------------
// Timeline / status helpers
// ---------------------------------------------------------------------------

type StopStatus = "done" | "missed" | "upcoming";

function parseStopTime(t: string): { h: number; m: number } | null {
  const hm = t.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) return { h: +hm[1], m: +hm[2] };
  const ampm = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (ampm) {
    let h = +ampm[1];
    const m = +(ampm[2] ?? "0");
    if (/pm/i.test(ampm[3]) && h !== 12) h += 12;
    if (/am/i.test(ampm[3]) && h === 12) h = 0;
    return { h, m };
  }
  return null;
}

// Uses startDate (user's actual trip start) if set, otherwise falls back to savedAt.
function planDayStart(plan: SavedPlan, dayNum: number): Date {
  const d = new Date(plan.startDate ?? plan.savedAt);
  d.setDate(d.getDate() + dayNum - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function planDayEnd(plan: SavedPlan, dayNum: number): Date {
  const d = planDayStart(plan, dayNum);
  d.setHours(23, 59, 59, 999);
  return d;
}

function stopDatetime(plan: SavedPlan, stop: PlanStop): Date | null {
  const parsed = parseStopTime(stop.time ?? "");
  if (!parsed) return null;
  const d = planDayStart(plan, stop.day);
  d.setHours(parsed.h, parsed.m, 0, 0);
  return d;
}

function calcStopStatus(plan: SavedPlan, stop: PlanStop, isDone: boolean, now: Date): StopStatus {
  if (isDone) return "done";
  const dt = stopDatetime(plan, stop);
  if (dt) return dt < now ? "missed" : "upcoming";
  return planDayEnd(plan, stop.day) < now ? "missed" : "upcoming";
}

function isDayEnded(plan: SavedPlan, dayNum: number, now: Date): boolean {
  return planDayEnd(plan, dayNum) < now;
}

function formatDayDate(plan: SavedPlan, dayNum: number): string {
  return planDayStart(plan, dayNum).toLocaleDateString("en", { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Demo plan helpers
// ---------------------------------------------------------------------------

function routesToPlan(routes: DemoRoute[]): SavedPlan {
  return {
    id: "route:trip",
    title: `Mongolia in ${routes.length} days`,
    summary: routes.map((r) => regionLabel(r.region)).join(" → "),
    stops: routes.flatMap((route, i) =>
      route.stops.map((s) => ({ day: i + 1, time: "", title: s.name, note: s.context })),
    ),
    places: routes.flatMap((route) =>
      route.stops.map((s) => ({ name: s.name, imageUrl: s.imageUrl })),
    ),
    savedAt: new Date().toISOString(),
  };
}

function routeDayLabels(routes: DemoRoute[]): Record<number, string> {
  return Object.fromEntries(routes.map((r, i) => [i + 1, regionLabel(r.region)]));
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function JourneyPage() {
  const router = useRouter();
  const setRoute = useLiveStore((s) => s.setRoute);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [activeDayNum, setActiveDayNum] = useState<number>(1);
  const [routes, setRoutes] = useState<DemoRoute[]>(demoRoutes);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  // Refreshed every minute so status badges ("missed" / "upcoming") stay current.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  function startRoute(route: DemoRoute) {
    setRoute(route);
    router.push("/live");
  }

  async function startUserPlan(plan: SavedPlan, dayNum: number) {
    setStartError(null);
    setStarting(true);
    try {
      const route = await planDayToRoute(plan, dayNum);
      if (route) startRoute(route);
      else setStartError("Couldn't locate these stops on the map. Try adding more specific places.");
    } catch {
      setStartError("Couldn't start the live guide just now. Check your connection and try again.");
    } finally {
      setStarting(false);
    }
  }

  useEffect(() => {
    let plans: SavedPlan[] = [];
    try {
      plans = JSON.parse(localStorage.getItem("polaris:saved-plans") ?? "[]") as SavedPlan[];
    } catch { /* ignore corrupt storage */ }

    void (async () => {
      const { data } = await createClient().auth.getUser();
      const signedIn = !!data.user;
      const isDemo = data.user?.email?.toLowerCase() === DEMO_EMAIL.toLowerCase();

      let userPlans: SavedPlan[];
      try {
        const res = await fetch("/api/trips");
        if (signedIn && res.ok) {
          const apiPlans = (await res.json()) as SavedPlan[];
          // Merge startDate from localStorage (not stored in DB yet).
          const localById = new Map(plans.map((p) => [p.id, p]));
          const merged = apiPlans.map((p) => ({ ...p, startDate: localById.get(p.id)?.startDate }));
          // Also include any localStorage plans whose title isn't in the API yet
          // (saved locally but background POST hasn't completed).
          const apiTitles = new Set(apiPlans.map((p) => p.title.toLowerCase()));
          const pendingLocal = plans.filter(
            (p) => !p.id.startsWith("route:") && !apiTitles.has(p.title.toLowerCase()),
          );
          userPlans = [...pendingLocal, ...merged];
        } else {
          userPlans = plans.filter((p) => !p.id.startsWith("route:"));
        }
      } catch {
        userPlans = plans.filter((p) => !p.id.startsWith("route:"));
      }

      let all = userPlans;
      if (isDemo) {
        const rts = await getRoutes();
        setRoutes(rts);
        const prevTrip = plans.find((p) => p.id === "route:trip");
        const tripPlan: SavedPlan = { ...routesToPlan(rts), doneStops: prevTrip?.doneStops ?? [] };
        all = [tripPlan, ...userPlans];
      }

      localStorage.setItem("polaris:saved-plans", JSON.stringify(all));
      setSavedPlans(all);
      if (all.length > 0) {
        const first = all[0];
        setActivePlanId(first.id);
        setActiveDayNum(firstActiveDay(toStructured(first.stops), new Set(first.doneStops ?? [])));
      } else {
        setActivePlanId(null);
      }
      setLoading(false);
    })();
  }, []);

  const activePlan = savedPlans.find((p) => p.id === activePlanId) ?? null;
  const isTripPlan = activePlan?.id === "route:trip";
  const activeRoute = isTripPlan ? routes[activeDayNum - 1] ?? null : null;
  const structuredStops = toStructured(activePlan?.stops);
  const dayNumbers = [...new Set(structuredStops.map((s) => s.day))].sort((a, b) => a - b);
  const doneSet = new Set<string>(activePlan?.doneStops ?? []);
  const dayStops = structuredStops.filter((s) => s.day === activeDayNum);

  function selectPlan(id: string) {
    setActivePlanId(id);
    const plan = savedPlans.find((p) => p.id === id);
    if (plan) {
      const stops = toStructured(plan.stops);
      const done = new Set<string>(plan.doneStops ?? []);
      setActiveDayNum(firstActiveDay(stops, done));
    }
  }

  function toggleDone(stop: PlanStop) {
    if (!activePlan) return;
    const key = stopKey(stop);
    const current = new Set<string>(activePlan.doneStops ?? []);
    if (current.has(key)) current.delete(key);
    else current.add(key);
    const doneStops = [...current];
    const updated = savedPlans.map((p) =>
      p.id === activePlan.id ? { ...p, doneStops } : p,
    );
    setSavedPlans(updated);
    localStorage.setItem("polaris:saved-plans", JSON.stringify(updated));
    if (!activePlan.id.startsWith("route:")) {
      fetch("/api/trips", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activePlan.id, doneStops }),
      }).catch(() => { /* ignore */ });
    }
  }

  function moveToNextDay(stop: PlanStop) {
    if (!activePlan) return;
    const updatedStops = toStructured(activePlan.stops).map((s) =>
      s.day === stop.day && s.title === stop.title ? { ...s, day: s.day + 1 } : s,
    );
    const updated = savedPlans.map((p) =>
      p.id === activePlan.id ? { ...p, stops: updatedStops } : p,
    );
    setSavedPlans(updated);
    localStorage.setItem("polaris:saved-plans", JSON.stringify(updated));
    if (!activePlan.id.startsWith("route:")) {
      fetch("/api/trips", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activePlan.id, stops: updatedStops }),
      }).catch(() => { /* ignore */ });
    }
  }

  function deletePlan(id: string) {
    const updated = savedPlans.filter((p) => p.id !== id);
    setSavedPlans(updated);
    localStorage.setItem("polaris:saved-plans", JSON.stringify(updated));
    if (!id.startsWith("route:")) {
      fetch(`/api/trips?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => { /* ignore */ });
    }
    if (updated.length > 0) {
      setActivePlanId(updated[0].id);
      const stops = toStructured(updated[0].stops);
      const done = new Set<string>(updated[0].doneStops ?? []);
      setActiveDayNum(firstActiveDay(stops, done));
    } else {
      setActivePlanId(null);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">
          {activePlan
            ? `Michelle's plan · ${new Date(activePlan.savedAt).toLocaleDateString("en", { month: "short", day: "numeric" })}`
            : "Your journey"}
        </p>
        <h1 className="mt-2 font-serif text-4xl leading-tight tracking-tight text-balance text-ink">
          {activePlan ? activePlan.title : loading ? "Loading…" : "No plans yet"}
        </h1>
      </header>

      {loading ? (
        <LoadingState />
      ) : savedPlans.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {savedPlans.length > 1 && (
            <PlanTabs plans={savedPlans} activePlanId={activePlanId} onSelect={selectPlan} />
          )}

          {activePlan && (
            <>
              <FeatureGate
                feature="journeyPlanning"
                degradedNote="Using saved itinerary — live weather and crowd updates need a connection"
              >
                <div className="rounded-3xl bg-primary-50 px-4 py-3">
                  <p className="text-sm text-primary-700 leading-snug">{activePlan.summary}</p>
                </div>
              </FeatureGate>

              {dayNumbers.length > 1 && (
                <DayTabs
                  days={dayNumbers}
                  activeDay={activeDayNum}
                  doneSet={doneSet}
                  stops={structuredStops}
                  onSelect={setActiveDayNum}
                  labels={isTripPlan ? routeDayLabels(routes) : undefined}
                  plan={activePlan}
                  now={now}
                />
              )}

              {dayStops.length > 0 ? (
                <ol>
                  {dayStops.map((stop, idx) => (
                    <StopCard
                      key={`${stop.day}-${stop.title}-${idx}`}
                      stop={stop}
                      index={idx}
                      status={calcStopStatus(activePlan, stop, doneSet.has(stopKey(stop)), now)}
                      isLast={idx === dayStops.length - 1}
                      place={matchPlace(stop.title, activePlan.places ?? [])}
                      onToggle={() => toggleDone(stop)}
                      onMoveNextDay={() => moveToNextDay(stop)}
                    />
                  ))}
                </ol>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-ink-muted">No stops for this day.</p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <div className="flex gap-3">
                  {activeRoute ? (
                    <button
                      onClick={() => startRoute(activeRoute)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary-600 py-3 text-sm font-bold text-white hover:bg-primary-700"
                    >
                      <SparklesIcon size={14} />
                      Start live guide →
                    </button>
                  ) : dayStops.length > 0 ? (
                    <button
                      onClick={() => startUserPlan(activePlan, activeDayNum)}
                      disabled={starting}
                      className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary-600 py-3 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-60"
                    >
                      <SparklesIcon size={14} />
                      {starting ? "Preparing…" : "Start live guide →"}
                    </button>
                  ) : (
                    <Link
                      href="/ai"
                      className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary-600 py-3 text-sm font-bold text-white hover:bg-primary-700"
                    >
                      <SparklesIcon size={14} />
                      Plan more with Michelle
                    </Link>
                  )}
                  <button
                    onClick={() => deletePlan(activePlan.id)}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-sand-100 text-ink-muted hover:bg-red-50 hover:text-safety-critical"
                  >
                    <TrashIcon size={18} />
                  </button>
                </div>

                {!isTripPlan && (
                  <Link
                    href={`/ai?planId=${activePlan.id}`}
                    className="flex items-center justify-center gap-2 rounded-full border border-primary-200 bg-primary-50 py-3 text-sm font-bold text-primary-600 hover:bg-primary-100"
                  >
                    <SparklesIcon size={14} />
                    Continue chatting with Michelle
                  </Link>
                )}
              </div>

              {startError && (
                <p className="px-1 text-xs font-semibold text-safety-critical">{startError}</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="space-y-3">
      <div className="h-12 w-2/3 animate-pulse rounded-2xl bg-white/70" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-40 animate-pulse rounded-3xl bg-white/70" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-16 flex flex-col items-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
        <MapPinIcon size={28} className="text-primary-500" />
      </div>
      <div>
        <p className="font-serif text-xl text-ink">No plans yet</p>
        <p className="mt-1.5 max-w-xs text-sm text-ink-muted">
          Chat with Michelle to plan your Mongolia trip. When you save a plan, it appears here.
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
  );
}

// ---------------------------------------------------------------------------
// Plan tabs
// ---------------------------------------------------------------------------

function PlanTabs({
  plans,
  activePlanId,
  onSelect,
}: {
  plans: SavedPlan[];
  activePlanId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      {plans.map((plan) => {
        const isActive = plan.id === activePlanId;
        const label = plan.title.length > 18 ? plan.title.slice(0, 17) + "…" : plan.title;
        return (
          <button
            key={plan.id}
            onClick={() => onSelect(plan.id)}
            className={[
              "shrink-0 flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors",
              isActive ? "bg-primary-600 text-white" : "bg-white text-ink-muted hover:bg-sand-100 hover:text-ink",
            ].join(" ")}
          >
            <SparklesIcon size={12} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day tabs
// ---------------------------------------------------------------------------

function DayTabs({
  days,
  activeDay,
  doneSet,
  stops,
  onSelect,
  labels,
  plan,
  now,
}: {
  days: number[];
  activeDay: number;
  doneSet: Set<string>;
  stops: PlanStop[];
  onSelect: (day: number) => void;
  labels?: Record<number, string>;
  plan: SavedPlan;
  now: Date;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      {days.map((day) => {
        const dayStops = stops.filter((s) => s.day === day);
        const doneCount = dayStops.filter((s) => doneSet.has(stopKey(s))).length;
        const allDone = doneCount === dayStops.length && dayStops.length > 0;
        const ended = isDayEnded(plan, day, now);
        const hasMissed = ended && !allDone;
        const isActive = day === activeDay;
        const dateLabel = formatDayDate(plan, day);

        let sublabel: string;
        let sublabelColor: string;
        if (allDone) {
          sublabel = "✓ done";
          sublabelColor = isActive ? "text-white/70" : "text-green-500";
        } else if (hasMissed) {
          sublabel = "ended";
          sublabelColor = isActive ? "text-white/50" : "text-ink-muted/40";
        } else {
          sublabel = `${doneCount}/${dayStops.length}`;
          sublabelColor = isActive ? "text-white/70" : "text-ink-muted/50";
        }

        return (
          <button
            key={day}
            onClick={() => onSelect(day)}
            className={[
              "shrink-0 flex flex-col items-center rounded-2xl px-5 py-2.5 transition-colors",
              isActive
                ? "bg-primary-600 text-white"
                : ended && !allDone
                  ? "bg-sand-100 text-ink-muted/50 hover:bg-sand-200"
                  : "bg-white text-ink-muted hover:bg-sand-100 hover:text-ink",
            ].join(" ")}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Day</span>
            <span className="text-xl font-bold leading-tight">{day}</span>
            <span className="mt-0.5 text-[10px] font-semibold leading-tight opacity-80">{dateLabel}</span>
            {labels?.[day] && (
              <span className="mt-0.5 text-[11px] font-bold leading-tight">{labels[day]}</span>
            )}
            <span className={["text-[10px] font-semibold", sublabelColor].join(" ")}>
              {sublabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stop card — photo card + time + done toggle
// ---------------------------------------------------------------------------

function StopCard({
  stop,
  index,
  status,
  isLast,
  place,
  onToggle,
  onMoveNextDay,
}: {
  stop: PlanStop;
  index: number;
  status: StopStatus;
  isLast: boolean;
  place?: PlanPlace;
  onToggle: () => void;
  onMoveNextDay: () => void;
}) {
  const [mapOpen, setMapOpen] = useState(false);
  const done = status === "done";
  const missed = status === "missed";

  const imageUrl =
    place?.imageUrl ??
    `https://picsum.photos/seed/${encodeURIComponent(stop.title)}/700/400`;

  const exploreSpot = {
    id: "",
    title: stop.title,
    category: "Journey",
    categoryTone: "blue" as const,
    rating: place?.rating ?? 0,
    distance: "",
    walkTime: place?.walkMinutes ? `${place.walkMinutes} min walk` : "",
    description: stop.note ?? "",
    imageUrl,
    latitude: place?.latitude,
    longitude: place?.longitude,
  };

  const dotClass = done
    ? "border-green-500 bg-green-500 text-white"
    : missed
      ? "border-gray-300 bg-gray-100 text-gray-400"
      : "border-primary-600 bg-white text-primary-600 hover:bg-primary-50";

  return (
  <>
    <li className="flex gap-3">
      {/* Timeline column */}
      <div className="flex flex-col items-center" style={{ width: 40 }}>
        <button
          onClick={onToggle}
          title={done ? "Mark undone" : "Mark done"}
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
            dotClass,
          ].join(" ")}
        >
          {done ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          ) : missed ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ) : (
            index + 1
          )}
        </button>
        {!isLast && <span className="my-1 w-px flex-1 bg-sand-300" style={{ minHeight: 20 }} />}
      </div>

      {/* Photo card */}
      <div className="flex-1 pb-5">
        {stop.time ? (
          <p className={[
            "mb-1.5 text-xs font-bold uppercase tracking-wide",
            missed ? "text-ink-muted/40" : "text-ink-muted",
          ].join(" ")}>{stop.time}</p>
        ) : null}
        <article
          onClick={() => setMapOpen(true)}
          className={[
            "cursor-pointer overflow-hidden rounded-3xl bg-white shadow-ink-sm transition-[opacity,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-ink-md active:translate-y-0",
            done ? "opacity-60" : missed ? "opacity-40 grayscale" : "",
          ].join(" ")}
        >
          <div className="relative h-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={stop.title} className="h-full w-full object-cover" />
            {done && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="rounded-full bg-green-500 px-3 py-1 text-sm font-bold text-white">✓ Done</span>
              </div>
            )}
            {missed && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-ink-muted">Didn&apos;t go</span>
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className={[
              "text-base font-bold text-ink leading-snug",
              done ? "line-through decoration-ink-muted/60" : "",
            ].join(" ")}>
              {stop.title}
            </h3>
            {stop.note ? (
              <p className="mt-1 text-sm text-ink-muted leading-snug">{stop.note}</p>
            ) : null}
            {(place?.rating != null || place?.walkMinutes != null) && (
              <div className="mt-2 flex items-center gap-4 text-xs font-semibold text-ink-muted">
                {place?.rating != null && (
                  <span className="flex items-center gap-1">
                    <StarIcon size={11} className="text-safety-armed" />
                    {place.rating}
                  </span>
                )}
                {place?.walkMinutes != null && (
                  <span className="flex items-center gap-1">
                    <WalkIcon size={12} />
                    {place.walkMinutes} min walk
                  </span>
                )}
              </div>
            )}
          </div>
        </article>
        {missed && (
          <button
            onClick={onMoveNextDay}
            className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
          >
            Move to next day
            <ChevronRightIcon size={13} />
          </button>
        )}
      </div>
    </li>

    {mapOpen && <DirectionsSheet spot={exploreSpot} onClose={() => setMapOpen(false)} />}
  </>
  );
}

