import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";
import { Tag } from "@/components/Tag";
import { PlayIcon } from "@/components/icons";
import { guide, nearbySpots, todaysJourney, trip, weather } from "@/lib/mockData";
import type { NearbySpot } from "@/types";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <Header />
      <WeatherStrip />
      <TodaysJourneyCard />

      <section>
        <SectionHeader title="Right now, near you" action="Explore" />
        <div className="flex gap-3 overflow-x-auto pb-1">
          {nearbySpots.map((spot) => (
            <NearbyCard key={spot.id} spot={spot} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-start justify-between">
      <div>
        <p className="text-sm font-semibold text-ink-muted">
          {trip.weekday} · {trip.city}
        </p>
        <h1 className="mt-1 font-serif text-4xl leading-none text-ink">
          {trip.greeting}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/sos"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-safety-critical/30 bg-white"
        >
          <span className="text-[11px] font-extrabold tracking-wide text-safety-critical">
            SOS
          </span>
        </Link>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#c9d8f5] to-[#9fb6e8] font-bold text-primary-900">
          S
        </span>
      </div>
    </header>
  );
}

function WeatherStrip() {
  return (
    <div className="grid grid-cols-3 gap-2">
      <StatCard label="Weather" value={`${weather.temperature}°`} sub={weather.description} />
      <StatCard label="Energy" value={weather.energy} />
      <StatCard label="Day" value={trip.dayLabel} />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-ink/5 bg-white/70 p-3 backdrop-blur">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold leading-tight text-ink">{value}</p>
      {sub ? <p className="text-sm font-semibold text-ink">{sub}</p> : null}
    </div>
  );
}

// The hero image card: today's journey with the guide-ready pill and a serif title.
function TodaysJourneyCard() {
  return (
    <section className="relative overflow-hidden rounded-[26px] shadow-lg shadow-ink/20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={todaysJourney.imageUrl}
        alt={todaysJourney.title}
        className="h-72 w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />

      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/90 py-1.5 pl-2 pr-3 backdrop-blur">
        <span className="h-4 w-4 rounded-full bg-gradient-to-br from-primary-500 to-primary-700" />
        <span className="text-xs font-bold text-ink">{guide.name} is ready</span>
      </div>

      <div className="absolute inset-x-5 bottom-5">
        <p className="text-xs font-bold uppercase tracking-wide text-white/80">
          Today&apos;s journey
        </p>
        <h2 className="mt-1 font-serif text-3xl leading-tight text-white">
          {todaysJourney.title}
        </h2>
        <Link
          href="/journey"
          className="mt-4 flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-primary-900"
        >
          <PlayIcon size={14} className="text-primary-600" />
          Start my journey
        </Link>
      </div>
    </section>
  );
}

// A compact photo card in the horizontally-scrolling "near you" row.
function NearbyCard({ spot }: { spot: NearbySpot }) {
  return (
    <Link
      href="/explore"
      className="w-44 shrink-0 overflow-hidden rounded-3xl bg-white shadow-sm"
    >
      <div className="relative h-28">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={spot.imageUrl}
          alt={spot.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute left-2 top-2">
          <Tag label={spot.badge} tone={spot.badgeTone} />
        </div>
      </div>
      <p className="p-3 text-sm font-bold text-ink">{spot.title}</p>
    </Link>
  );
}
