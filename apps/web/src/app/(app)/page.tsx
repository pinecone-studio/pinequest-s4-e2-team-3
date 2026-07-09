"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { HeaderActions } from "@/components/HeaderActions";
import { LiveClock, LiveWeekday } from "@/components/LiveClock";
import { SectionHeader } from "@/components/SectionHeader";
import { MapPinIcon, MicIcon, PlayIcon, ShieldIcon } from "@/components/icons";
import { guide, todaysJourney, trip, weather } from "@/lib/mockData";
import { LiveGuideAvatar } from "@/components/LiveGuideAvatar";
import { NearbySection } from "./NearbySection";
import { createClient } from "@/lib/supabase";

export default function HomePage() {
  // The deployed root should immediately show the phone-frame demo (/preview),
  // not the bare dashboard. The frame loads this same route in an iframe, so we
  // detect whether we're inside it: at top level we hand off to /preview, and
  // inside the frame we render the real dashboard. This also keeps the in-frame
  // "Home" tab working without nesting a frame inside the frame.
  const [framed, setFramed] = useState<boolean | null>(null);

  useEffect(() => {
    const insideFrame = window.self !== window.top;
    if (!insideFrame) {
      window.location.replace("/preview");
      return;
    }
    // In-frame the dashboard needs a signed-in user, same as the middleware
    // gate on the other app screens ("/" can't be gated there because at top
    // level it must stay reachable to hand off to /preview).
    void createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) setFramed(true);
        else window.location.replace("/login");
      });
  }, []);

  if (framed !== true) return null;

  return (
    <div className="space-y-6">
      <Header />
      <StatStrip />
      <LiveGuideCard />

      <section className="!mt-3">
        <SectionHeader
          title="Right now, near you"
          action="Explore"
          actionHref="/explore"
        />
        <NearbySection />
      </section>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-muted">
          {trip.weekday} · {trip.city}
        </p>
        <h1 className="mt-1 font-serif text-4xl leading-none tracking-tight text-ink">
          {trip.greeting}
        </h1>
      </div>

      <div className="shrink-0">
        <HeaderActions />
      </div>
    </header>
  );
}

function StatStrip() {
  return (
    <div className="grid grid-cols-3 gap-2">
      <StatCard
        label="Weather"
        value={`${weather.temperature}°`}
        sub={weather.description}
      />
      <StatCard label="Local time" value={<LiveClock />} sub="Ulaanbaatar" />
      <StatCard label="Day" value={<LiveWeekday />} />
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
    <div className="rounded-2xl bg-white p-3 shadow-ink-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold leading-tight text-ink">{value}</p>
      {sub ? <p className="text-sm font-semibold text-ink">{sub}</p> : null}
    </div>
  );
}

function LiveGuideCard() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-primary-900 shadow-ink-lg">
      {/* Corner-focused gradient: bright blue at top-right, deep navy elsewhere */}
      <div className="absolute inset-0 bg-[radial-gradient(140%_130%_at_105%_-5%,#2f6bff_0%,#14213d_58%)]" />

      {/* Concentric depth rings — purely decorative, clipped by overflow-hidden */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-8 -right-8 h-52 w-52 text-white opacity-[0.07]"
        viewBox="0 0 100 100"
        fill="none"
      >
        <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="1" />
        <circle
          cx="50"
          cy="50"
          r="34"
          stroke="currentColor"
          strokeWidth="0.8"
        />
        <circle
          cx="50"
          cy="50"
          r="20"
          stroke="currentColor"
          strokeWidth="0.6"
        />
        <circle cx="50" cy="50" r="8" fill="currentColor" opacity="0.35" />
      </svg>

      {/* Floating guide character with "Travel with me" speech bubble */}
      <div className="pointer-events-none absolute right-4 top-4 z-10">
        <LiveGuideAvatar />
      </div>

      <div className="relative p-5">
        {/* Live indicator — a pulse dot + label, no pill wrapper */}
        <div className="mb-4 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-safety-safe opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-safety-safe" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">
            {guide.name} · Ready
          </span>
        </div>

        <h2 className="font-serif text-[28px] leading-[1.1] text-white">
          Live Guide
        </h2>
        <p className="mt-2 max-w-[66%] text-sm leading-snug text-white/55">
          Experience More, Worry Less.
        </p>

        <Link
          href="/live"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary-900 transition-opacity hover:opacity-90"
        >
          <PlayIcon size={12} className="text-primary-600" />
          Start guide
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
