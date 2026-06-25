import type { ReactNode } from "react";
import Link from "next/link";
import { HeaderActions } from "@/components/HeaderActions";
import { LiveClock } from "@/components/LiveClock";
import { SectionHeader } from "@/components/SectionHeader";
import { Tag } from "@/components/Tag";
import { MapPinIcon, PlayIcon } from "@/components/icons";
import { guide, nearbySpots, trip, weather } from "@/lib/mockData";
import type { NearbySpot, Tone } from "@/types";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <Header />
      <StatStrip />
      <LiveGuideCard />

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

      <HeaderActions />
    </header>
  );
}

function StatStrip() {
  return (
    <div className="grid grid-cols-3 gap-2">
      <StatCard label="Weather" value={`${weather.temperature}°`} sub={weather.description} />
      <StatCard label="Local time" value={<LiveClock />} sub="Ulaanbaatar" />
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
  value: ReactNode;
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

// The hero: your AI local guide, ready to walk a route with you (→ /live).
// Kept deliberately minimal — presence, name, one line, one action.
function LiveGuideCard() {
  return (
    <section className="relative overflow-hidden rounded-[26px] bg-[#0d1422] p-6 shadow-lg shadow-ink/20">
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_80%_10%,#1f56e0_0%,#16233d_45%,#0d1422_75%)]" />
      <div className="relative flex flex-col gap-5">
        <div className="flex w-fit items-center gap-2 rounded-full bg-white/10 py-1.5 pl-2 pr-3 backdrop-blur">
          <span className="h-4 w-4 rounded-full bg-gradient-to-br from-primary-500 to-primary-700" />
          <span className="text-xs font-bold text-white">{guide.name} is ready</span>
        </div>

        <div>
          <h2 className="font-serif text-3xl leading-tight text-white">Live Guide</h2>
          <p className="mt-1 text-sm text-white/70">Your voice companion for Mongolia.</p>
        </div>

        <Link
          href="/live"
          className="flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-primary-900"
        >
          <PlayIcon size={14} className="text-primary-600" />
          Start live guide
        </Link>
      </div>
    </section>
  );
}

// Gradient tints per tone so cards look premium without remote photos.
const cardTint: Record<Tone, string> = {
  blue: "from-[#2f6bff] to-[#1f3a8a]",
  amber: "from-[#f59e0b] to-[#b45309]",
  green: "from-[#1F9D6B] to-[#0f5c3f]",
  purple: "from-[#7c5cff] to-[#4c1d95]",
  white: "from-sand-200 to-sand-300",
};

// A compact card in the horizontally-scrolling "near you" row.
function NearbyCard({ spot }: { spot: NearbySpot }) {
  return (
    <Link
      href="/explore"
      className="w-44 shrink-0 overflow-hidden rounded-3xl bg-white shadow-sm"
    >
      <div
        className={`relative h-28 bg-gradient-to-br ${cardTint[spot.badgeTone]}`}
      >
        <div className="absolute left-2 top-2">
          <Tag label={spot.badge} tone={spot.badgeTone} />
        </div>
        <MapPinIcon
          size={26}
          className="absolute bottom-2 right-2 text-white/40"
        />
      </div>
      <p className="p-3 text-sm font-bold text-ink">{spot.title}</p>
    </Link>
  );
}
