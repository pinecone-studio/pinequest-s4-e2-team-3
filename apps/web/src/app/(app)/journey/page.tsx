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
} from "@/components/icons";
import { demoRoutes } from "@/lib/routes";
import { useLiveStore } from "@/stores/liveStore";

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
}

interface SavedPlan {
  id: string;
  title: string;
  summary: string;
  stops?: PlanStop[] | string[];
  doneStops?: string[];
  savedAt: string;
  places?: PlanPlace[];
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function JourneyPage() {
  const router = useRouter();
  const setRoute = useLiveStore((s) => s.setRoute);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [activeDayNum, setActiveDayNum] = useState<number>(1);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("polaris:saved-plans");
      if (raw) {
        const plans = JSON.parse(raw) as SavedPlan[];
        setSavedPlans(plans);
        if (plans.length > 0) {
          const first = plans[0];
          setActivePlanId(first.id);
          const stops = toStructured(first.stops);
          const doneSet = new Set<string>(first.doneStops ?? []);
          setActiveDayNum(firstActiveDay(stops, doneSet));
        }
      }
    } catch { /* ignore */ }
  }, []);

  const activePlan = savedPlans.find((p) => p.id === activePlanId) ?? null;
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
    const updated = savedPlans.map((p) =>
      p.id === activePlan.id ? { ...p, doneStops: [...current] } : p,
    );
    setSavedPlans(updated);
    localStorage.setItem("polaris:saved-plans", JSON.stringify(updated));
  }

  function deletePlan(id: string) {
    const updated = savedPlans.filter((p) => p.id !== id);
    setSavedPlans(updated);
    localStorage.setItem("polaris:saved-plans", JSON.stringify(updated));
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
          {activePlan ? activePlan.title : "No plans yet"}
        </h1>
      </header>

      {savedPlans.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {savedPlans.length > 1 && (
            <PlanTabs plans={savedPlans} activePlanId={activePlanId} onSelect={selectPlan} />
          )}

          {activePlan && (
            <>
              <div className="rounded-3xl bg-primary-50 px-4 py-3">
                <p className="text-sm text-primary-700 leading-snug">{activePlan.summary}</p>
              </div>

              {dayNumbers.length > 1 && (
                <DayTabs
                  days={dayNumbers}
                  activeDay={activeDayNum}
                  doneSet={doneSet}
                  stops={structuredStops}
                  onSelect={setActiveDayNum}
                />
              )}

              {dayStops.length > 0 ? (
                <ol>
                  {dayStops.map((stop, idx) => (
                    <StopCard
                      key={`${stop.day}-${stop.title}-${idx}`}
                      stop={stop}
                      index={idx}
                      done={doneSet.has(stopKey(stop))}
                      isLast={idx === dayStops.length - 1}
                      place={matchPlace(stop.title, activePlan.places ?? [])}
                      onToggle={() => toggleDone(stop)}
                    />
                  ))}
                </ol>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-ink-muted">No stops for this day.</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Link
                  href="/ai"
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary-600 py-3 text-sm font-bold text-white hover:bg-primary-700"
                >
                  <SparklesIcon size={14} />
                  Plan more with Michelle
                </Link>
                <button
                  onClick={() => deletePlan(activePlan.id)}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-sand-100 text-ink-muted hover:bg-red-50 hover:text-safety-critical"
                >
                  <TrashIcon size={18} />
                </button>
              </div>
            </>
          )}

          <button
            onClick={() => {
              const route = demoRoutes.find((r) => r.region === "ulaanbaatar") ?? demoRoutes[0];
              setRoute(route);
              router.push("/live");
            }}
            className="block w-full rounded-full bg-primary-600 py-3.5 text-center text-sm font-bold text-white hover:bg-primary-700"
          >
            Start the live guide
          </button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

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
}: {
  days: number[];
  activeDay: number;
  doneSet: Set<string>;
  stops: PlanStop[];
  onSelect: (day: number) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      {days.map((day) => {
        const dayStops = stops.filter((s) => s.day === day);
        const doneCount = dayStops.filter((s) => doneSet.has(stopKey(s))).length;
        const allDone = doneCount === dayStops.length && dayStops.length > 0;
        const isActive = day === activeDay;
        return (
          <button
            key={day}
            onClick={() => onSelect(day)}
            className={[
              "shrink-0 flex flex-col items-center rounded-2xl px-5 py-2.5 transition-colors",
              isActive ? "bg-primary-600 text-white" : "bg-white text-ink-muted hover:bg-sand-100 hover:text-ink",
            ].join(" ")}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Day</span>
            <span className="text-xl font-bold leading-tight">{day}</span>
            <span className={[
              "text-[10px] font-semibold",
              isActive ? "text-white/70" : allDone ? "text-green-500" : "text-ink-muted/50",
            ].join(" ")}>
              {allDone ? "✓ done" : `${doneCount}/${dayStops.length}`}
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
  done,
  isLast,
  place,
  onToggle,
}: {
  stop: PlanStop;
  index: number;
  done: boolean;
  isLast: boolean;
  place?: PlanPlace;
  onToggle: () => void;
}) {
  const imageUrl =
    place?.imageUrl ??
    `https://picsum.photos/seed/${encodeURIComponent(stop.title)}/700/400`;

  return (
    <li className="flex gap-3">
      {/* Timeline column */}
      <div className="flex flex-col items-center" style={{ width: 40 }}>
        <button
          onClick={onToggle}
          title={done ? "Mark undone" : "Mark done"}
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
            done
              ? "border-green-500 bg-green-500 text-white"
              : "border-primary-600 bg-white text-primary-600 hover:bg-primary-50",
          ].join(" ")}
        >
          {done ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
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
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-muted">{stop.time}</p>
        ) : null}
        <article className={["overflow-hidden rounded-3xl bg-white shadow-ink-sm transition-opacity", done ? "opacity-60" : ""].join(" ")}>
          <div className="relative h-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={stop.title} className="h-full w-full object-cover" />
            {done && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="rounded-full bg-green-500 px-3 py-1 text-sm font-bold text-white">✓ Done</span>
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className={["text-base font-bold text-ink leading-snug", done ? "line-through decoration-ink-muted/60" : ""].join(" ")}>
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
      </div>
    </li>
  );
}
