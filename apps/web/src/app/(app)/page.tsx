import Link from "next/link";
import { HeaderActions } from "@/components/HeaderActions";
import { SectionHeader } from "@/components/SectionHeader";
import { MapPinIcon, MicIcon, PlayIcon, ShieldIcon } from "@/components/icons";
import { guide, todaysJourney, trip, weather } from "@/lib/mockData";
import { NearbySection } from "./NearbySection";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <Header />
      <StatStrip />
      <LiveGuideCard />
      <QuickActions />

      <section>
        <SectionHeader title="Right now, near you" action="Explore" actionHref="/explore" />
        <NearbySection />
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
      <StatCard label="Altitude" value="1,350 m" sub="UB is high" />
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

// The hero: your AI local guide, ready to walk a route with you (→ /live).
function LiveGuideCard() {
  return (
    <section className="relative overflow-hidden rounded-[26px] bg-[#0d1422] p-6 shadow-lg shadow-ink/20">
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_80%_10%,#1f56e0_0%,#16233d_45%,#0d1422_75%)]" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1.5 pl-2 pr-3 backdrop-blur">
          <span className="h-4 w-4 rounded-full bg-gradient-to-br from-primary-500 to-primary-700" />
          <span className="text-xs font-bold text-white">{guide.name} is ready</span>
        </div>

        <p className="mt-5 text-xs font-bold uppercase tracking-wide text-white/60">
          Live guide
        </p>
        <h2 className="mt-1 font-serif text-3xl leading-tight text-white">
          {todaysJourney.title}
        </h2>
        <p className="mt-2 text-sm leading-snug text-white/70">
          {todaysJourney.subtitle}
        </p>

        <Link
          href="/live"
          className="mt-5 flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-primary-900"
        >
          <PlayIcon size={14} className="text-primary-600" />
          Start live guide
        </Link>
      </div>
    </section>
  );
}

// Quick entry into the companion's other surfaces (teammates' screens).
function QuickActions() {
  const actions = [
    { href: "/translate", label: "Phrases", Icon: MicIcon },
    { href: "/explore", label: "Explore", Icon: MapPinIcon },
    { href: "/sos", label: "Safety", Icon: ShieldIcon },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {actions.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center gap-2 rounded-2xl border border-ink/5 bg-white/70 py-4 backdrop-blur"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <Icon size={20} />
          </span>
          <span className="text-xs font-bold text-ink">{label}</span>
        </Link>
      ))}
    </div>
  );
}

