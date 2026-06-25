import Link from "next/link";
import { Tag } from "@/components/Tag";
import { ClockIcon, MapPinIcon, SunIcon } from "@/components/icons";
import {
  journeyAdaptationNote,
  journeyStops,
  todaysJourney,
  trip,
} from "@/lib/mockData";
import type { JourneyStop } from "@/types";

export default function JourneyPage() {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">
          Day {trip.dayLabel.split(" ")[0]} · Adaptive
        </p>
        <h1 className="mt-2 font-serif text-4xl leading-tight text-ink">
          Your {trip.city} journey
        </h1>
        <p className="mt-2 text-sm text-ink-muted">{todaysJourney.subtitle}</p>
      </header>

      <AdaptationNote />

      <ol>
        {journeyStops.map((stop, index) => (
          <TimelineStop
            key={stop.id}
            stop={stop}
            isLast={index === journeyStops.length - 1}
          />
        ))}
      </ol>

      <Link
        href="/live"
        className="block rounded-full bg-primary-600 py-3.5 text-center text-sm font-bold text-white"
      >
        Start the live guide
      </Link>
    </div>
  );
}

function AdaptationNote() {
  return (
    <div className="flex gap-3 rounded-3xl border border-safety-armed/20 bg-[#fdeede] p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-safety-armed text-white">
        <SunIcon size={18} />
      </span>
      <p className="text-sm font-semibold text-ink">{journeyAdaptationNote}</p>
    </div>
  );
}

function TimelineStop({ stop, isLast }: { stop: JourneyStop; isLast: boolean }) {
  return (
    <li className="flex gap-3">
      <div className="flex w-12 flex-col items-center">
        <span className="text-xs font-bold text-ink">{stop.time}</span>
        <TimelineDot status={stop.status} />
        {!isLast ? <span className="w-px flex-1 bg-sand-300" /> : null}
      </div>

      <div className="flex-1 pb-5">
        <article className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="relative h-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={stop.imageUrl}
              alt={stop.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute left-3 top-3">
              <Tag label={stop.tag} tone={stop.tagTone} />
            </div>
          </div>

          <div className="p-4">
            <h3 className="text-lg font-bold text-ink">{stop.title}</h3>
            <p className="mt-1 text-sm text-ink-muted">{stop.note}</p>
            <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-ink-muted">
              <span className="flex items-center gap-1">
                <MapPinIcon size={14} />
                {stop.walk}
              </span>
              <span className="flex items-center gap-1">
                <ClockIcon size={14} />
                {stop.dwell}
              </span>
            </div>
          </div>
        </article>
      </div>
    </li>
  );
}

// Coloured marker: current = filled blue, done = green, upcoming = amber ring.
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
  return (
    <span className="my-1 h-4 w-4 rounded-full border-2 border-safety-armed bg-white" />
  );
}
