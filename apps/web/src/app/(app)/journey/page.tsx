"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Tag } from "@/components/Tag";
import {
  ClockIcon,
  CloseIcon,
  MapPinIcon,
  PencilIcon,
  SparklesIcon,
  SunIcon,
  TrashIcon,
} from "@/components/icons";
import {
  journeyAdaptationNote,
  trip,
  tripDays as initialTripDays,
} from "@/lib/mockData";
import { demoRoutes } from "@/lib/routes";
import { useLiveStore } from "@/stores/liveStore";
import type { JourneyStop, TripDay } from "@/types";

interface PlanStop {
  day: number;
  time: string;
  title: string;
  note?: string;
}

interface SavedPlan {
  id: string;
  title: string;
  summary: string;
  stops?: PlanStop[];
  savedAt: string;
}

// Turn a saved plan's flat stop list into the day-by-day timeline the Journey
// page renders. Defaults the fields the chat plan doesn't carry (image, walk…).
function planToDays(stops: PlanStop[]): TripDay[] {
  const byDay = new Map<number, JourneyStop[]>();
  stops.forEach((s, i) => {
    const list = byDay.get(s.day) ?? [];
    list.push({
      id: `plan-${s.day}-${i}`,
      time: s.time,
      tag: "Plan",
      tagTone: "blue",
      title: s.title,
      note: s.note ?? "",
      walk: "",
      dwell: "",
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(s.title)}/600/400`,
      status: "upcoming",
    });
    byDay.set(s.day, list);
  });
  return [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, dayStops]) => ({ dayNumber: day, label: `Day ${day}`, stops: dayStops }));
}

function findCurrentDayIndex(days: TripDay[]): number {
  const idx = days.findIndex((d) =>
    d.stops.some((s) => s.status === "current")
  );
  return idx >= 0 ? idx : 0;
}

export default function JourneyPage() {
  const router = useRouter();
  const setRoute = useLiveStore((s) => s.setRoute);
  const [days, setDays] = useState<TripDay[]>(initialTripDays);
  const [activeDayIdx, setActiveDayIdx] = useState(() =>
    findCurrentDayIndex(initialTripDays)
  );
  const [editingStop, setEditingStop] = useState<JourneyStop | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("polaris:saved-plans");
      if (!raw) return;
      const plans: SavedPlan[] = JSON.parse(raw);
      setSavedPlans(plans);
      // Drive the timeline from the most recent saved plan that has scheduled stops.
      const latest = plans.find((p) => p.stops?.length);
      if (latest?.stops?.length) {
        const planDays = planToDays(latest.stops);
        setDays(planDays);
        setActiveDayIdx(0);
      }
    } catch { /* ignore */ }
  }, []);

  const activeDay = days[activeDayIdx];

  function handleSaveEdit(updated: JourneyStop) {
    setDays((prev) =>
      prev.map((day, i) =>
        i !== activeDayIdx
          ? day
          : {
              ...day,
              stops: day.stops.map((s) =>
                s.id === updated.id ? updated : s
              ),
            }
      )
    );
    setEditingStop(null);
  }

  function handleDelete(id: string) {
    setDays((prev) =>
      prev.map((day, i) =>
        i !== activeDayIdx
          ? day
          : { ...day, stops: day.stops.filter((s) => s.id !== id) }
      )
    );
    setDeleteTargetId(null);
  }

  return (
    <>
      <div className="space-y-5">
        <header>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">
            Day {activeDay.dayNumber} of {days.length} · Adaptive
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-tight tracking-tight text-balance text-ink">
            Your {trip.city} journey
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{activeDay.label}</p>
        </header>

        <DaySelector
          days={days}
          activeDayIdx={activeDayIdx}
          onChange={setActiveDayIdx}
        />

        <AdaptationNote />

        {savedPlans.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Plans from Michelle</p>
              <button
                onClick={() => {
                  localStorage.removeItem("polaris:saved-plans");
                  setSavedPlans([]);
                  setDays(initialTripDays);
                  setActiveDayIdx(findCurrentDayIndex(initialTripDays));
                }}
                className="text-xs font-semibold text-ink-muted hover:text-ink"
              >
                Clear all
              </button>
            </div>
            {savedPlans.map((plan) => (
              <div key={plan.id} className="rounded-2xl bg-white p-4 shadow-ink-sm">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white">
                    <SparklesIcon size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-ink leading-tight">{plan.title}</p>
                    <p className="mt-1 text-sm text-ink-muted leading-snug line-clamp-3">{plan.summary}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {activeDay.stops.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sand-100">
              <MapPinIcon size={24} className="text-ink-muted" />
            </div>
            <div>
              <p className="font-semibold text-ink">Nothing planned yet</p>
              <p className="mt-1 text-sm text-ink-muted">Ask Michelle to build your day, stop by stop.</p>
            </div>
            <Link
              href="/ai"
              className="flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-700"
            >
              <SparklesIcon size={14} />
              Plan with Michelle
            </Link>
          </div>
        ) : (
          <ol>
            {activeDay.stops.map((stop, index) => (
              <TimelineStop
                key={stop.id}
                stop={stop}
                isLast={index === activeDay.stops.length - 1}
                onEdit={() => setEditingStop(stop)}
                onDelete={() => setDeleteTargetId(stop.id)}
              />
            ))}
          </ol>
        )}

        <button
          onClick={() => {
            const route = demoRoutes.find((r) => r.region === "ulaanbaatar") ?? demoRoutes[0];
            setRoute(route);
            router.push("/live");
          }}
          className="block w-full rounded-full bg-primary-600 py-3.5 text-center text-sm font-bold text-white"
        >
          Start the live guide
        </button>
      </div>

      {editingStop && (
        <EditModal
          stop={editingStop}
          onSave={handleSaveEdit}
          onClose={() => setEditingStop(null)}
        />
      )}

      {deleteTargetId && (
        <DeleteConfirm
          onConfirm={() => handleDelete(deleteTargetId)}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}
    </>
  );
}

function DaySelector({
  days,
  activeDayIdx,
  onChange,
}: {
  days: TripDay[];
  activeDayIdx: number;
  onChange: (idx: number) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {days.map((day, idx) => {
        const isActive = idx === activeDayIdx;
        const isCurrent = day.stops.some((s) => s.status === "current");
        return (
          <button
            key={day.dayNumber}
            onClick={() => onChange(idx)}
            className={[
              "relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              isActive
                ? "bg-primary-600 text-white"
                : "bg-white text-ink-muted hover:bg-sand-100 hover:text-ink",
            ].join(" ")}
          >
            Day {day.dayNumber}
            {isCurrent && !isActive && (
              <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-primary-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function AdaptationNote() {
  return (
    <div className="flex gap-3 rounded-3xl border border-safety-armed/20 bg-sand-amber p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-safety-armed text-white">
        <SunIcon size={18} />
      </span>
      <p className="text-sm font-semibold text-ink">{journeyAdaptationNote}</p>
    </div>
  );
}

function TimelineStop({
  stop,
  isLast,
  onEdit,
  onDelete,
}: {
  stop: JourneyStop;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isSkipped = stop.status === "skipped";

  return (
    <li className="flex gap-3">
      <div className="flex w-12 flex-col items-center">
        <span
          className={[
            "text-xs font-bold",
            isSkipped ? "text-ink-muted/60" : "text-ink",
          ].join(" ")}
        >
          {stop.time}
        </span>
        <TimelineDot status={stop.status} />
        {!isLast && <span className="w-px flex-1 bg-sand-300" />}
      </div>

      <div
        className={["flex-1 pb-5", isSkipped ? "opacity-50" : ""].join(" ")}
      >
        <article className="overflow-hidden rounded-3xl bg-white shadow-ink-sm">
          <div className="relative h-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={stop.imageUrl}
              alt={stop.title}
              className={[
                "h-full w-full object-cover",
                isSkipped ? "grayscale" : "",
              ].join(" ")}
            />
            <div className="absolute left-3 top-3">
              <Tag label={stop.tag} tone={stop.tagTone} />
            </div>
            {isSkipped && (
              <div className="absolute right-3 top-3">
                <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                  Not visited
                </span>
              </div>
            )}
          </div>

          <div className="p-4">
            <h3
              className={[
                "text-lg font-bold text-ink",
                isSkipped ? "line-through decoration-ink-muted/60" : "",
              ].join(" ")}
            >
              {stop.title}
            </h3>
            <p className="mt-1 text-sm text-ink-muted">{stop.note}</p>
            {(stop.walk || stop.dwell) && (
              <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-ink-muted">
                {stop.walk && (
                  <span className="flex items-center gap-1">
                    <MapPinIcon size={14} />
                    {stop.walk}
                  </span>
                )}
                {stop.dwell && (
                  <span className="flex items-center gap-1">
                    <ClockIcon size={14} />
                    {stop.dwell}
                  </span>
                )}
              </div>
            )}

            <div className="mt-3 flex gap-2 border-t border-ink/5 pt-3">
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 rounded-full bg-sand-100 px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-sand-200 hover:text-ink"
              >
                <PencilIcon size={12} />
                Edit
              </button>
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 rounded-full bg-sand-100 px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-red-50 hover:text-safety-critical"
              >
                <TrashIcon size={12} />
                Remove
              </button>
            </div>
          </div>
        </article>
      </div>
    </li>
  );
}

function TimelineDot({ status }: { status: JourneyStop["status"] }) {
  if (status === "current") {
    return (
      <span className="my-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-primary-600">
        <span className="h-2 w-2 rounded-full bg-primary-600" />
      </span>
    );
  }
  if (status === "done") {
    return <span className="my-1 h-4 w-4 rounded-full bg-safety-safe" />;
  }
  if (status === "skipped") {
    return (
      <span className="my-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink-muted/20">
        <span className="h-px w-2.5 rounded-full bg-ink-muted/60" />
      </span>
    );
  }
  return (
    <span className="my-1 h-4 w-4 rounded-full border-2 border-safety-armed bg-white" />
  );
}

function EditModal({
  stop,
  onSave,
  onClose,
}: {
  stop: JourneyStop;
  onSave: (s: JourneyStop) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<JourneyStop>(stop);

  function update<K extends keyof JourneyStop>(key: K, value: JourneyStop[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative space-y-4 rounded-t-3xl bg-white p-6 animate-slide-up">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Edit stop</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-sand-100 text-ink-muted"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-ink-muted">
              Time
            </span>
            <input
              type="text"
              value={draft.time}
              onChange={(e) => update("time", e.target.value)}
              className="mt-1 w-full rounded-xl border border-ink/10 bg-sand-50 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-ink-muted">
              Title
            </span>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => update("title", e.target.value)}
              className="mt-1 w-full rounded-xl border border-ink/10 bg-sand-50 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-ink-muted">
              Note
            </span>
            <textarea
              value={draft.note}
              onChange={(e) => update("note", e.target.value)}
              rows={3}
              className="mt-1 w-full resize-none rounded-xl border border-ink/10 bg-sand-50 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-ink-muted">
                Distance
              </span>
              <input
                type="text"
                value={draft.walk}
                onChange={(e) => update("walk", e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink/10 bg-sand-50 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-ink-muted">
                Duration
              </span>
              <input
                type="text"
                value={draft.dwell}
                onChange={(e) => update("dwell", e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink/10 bg-sand-50 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-ink/15 py-3 text-sm font-bold text-ink-muted hover:bg-sand-100"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(draft)}
            className="flex-1 rounded-full bg-primary-600 py-3 text-sm font-bold text-white hover:bg-primary-700"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 text-center animate-scale-in">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <TrashIcon size={24} className="text-safety-critical" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-ink">Remove this stop?</h3>
          <p className="mt-1 text-sm text-ink-muted">
            This stop will be removed from your plan.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border border-ink/15 py-3 text-sm font-bold text-ink-muted hover:bg-sand-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-full bg-safety-critical py-3 text-sm font-bold text-white hover:opacity-90"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
