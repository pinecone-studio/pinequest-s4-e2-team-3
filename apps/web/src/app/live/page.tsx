"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  BarsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  MicIcon,
  PauseIcon,
  PlayIcon,
  SendIcon,
  WalkIcon,
} from "@/components/icons";
import { demoRoutes } from "@/lib/routes";
import { googleMapsDirectionsUrl } from "@/lib/maps";
import { hasMapboxToken } from "@/lib/mapbox";
import { hasPack, loadPack, savePack } from "@/lib/offline";
import { useLiveGuide } from "@/hooks/useLiveGuide";
import { useLiveStore } from "@/stores/liveStore";
import { useLocationStore } from "@/stores/locationStore";
import { useLocation } from "@/hooks/useLocation";
import { formatDistance } from "@/lib/geo";
import type { Coords, DemoRoute } from "@/types";

// Loaded lazily + client-only because mapbox-gl touches `window` on import.
const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

// The dark, full-screen live guide. It sits outside the (app) shell, so it has
// no sidebar/tab bar — just the map and the narration card.
export default function LiveGuidePage() {
  const activeRoute = useLiveStore((s) => s.activeRoute);
  // Begin watching real GPS as soon as the screen mounts.
  useLocation();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0d1422] text-white">
      {activeRoute ? <LiveBackground /> : <MapBackdrop />}
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-6 pt-6">
        {activeRoute ? <LiveExperience /> : <RoutePicker />}
      </div>
    </div>
  );
}

// Decides what fills the screen behind the guide UI:
//   real Mapbox route map → cached static snapshot (offline) → stylised backdrop.
function LiveBackground() {
  const { activeRoute, currentStopIndex, simulatedCoords, forceOffline } =
    useLiveStore();
  const realCoords = useLocationStore((s) => s.coordinates);
  const position: Coords | null = simulatedCoords ?? realCoords;

  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!activeRoute) return <MapBackdrop />;

  const offline = forceOffline || !online;

  // Live interactive map when we have a token and a connection.
  if (hasMapboxToken && !offline) {
    return (
      <div className="absolute inset-0">
        <RouteMap
          route={activeRoute}
          currentIndex={currentStopIndex}
          position={position}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0d1422]/40 via-transparent to-[#0d1422]/90" />
      </div>
    );
  }

  // Offline: show the cached static snapshot if we have one.
  const pack = loadPack(activeRoute.id);
  if (offline && pack?.image) {
    return (
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pack.image}
          alt={`${activeRoute.title} route`}
          className="h-full w-full object-cover opacity-90"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0d1422]/40 via-transparent to-[#0d1422]/90" />
      </div>
    );
  }

  return <MapBackdrop />;
}

// ---------------------------------------------------------------------------
// Route picker — shown until a route is active. Each route is a demo journey.
// ---------------------------------------------------------------------------
function RoutePicker() {
  const setRoute = useLiveStore((s) => s.setRoute);
  const setLiveOn = useLiveStore((s) => s.setLiveOn);

  const start = (route: DemoRoute) => {
    setRoute(route);
    setLiveOn(true);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
        >
          <ChevronLeftIcon size={20} />
        </Link>
        <span className="text-sm font-semibold text-white/70">Live Guide</span>
      </div>

      <h1 className="mt-6 font-serif text-3xl leading-tight">
        Where shall we go?
      </h1>
      <p className="mt-2 text-sm text-white/60">
        Pick a journey. I&apos;ll travel it with you — speaking up when you reach
        each place, and answering whenever you ask.
      </p>

      <div className="mt-6 space-y-3">
        {demoRoutes.map((route) => (
          <button
            key={route.id}
            onClick={() => start(route)}
            className="w-full rounded-3xl bg-white/[0.07] p-5 text-left backdrop-blur transition-colors hover:bg-white/[0.12]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-primary-500">
                {route.region}
              </span>
              <span className="flex items-center gap-1 text-xs text-white/50">
                <MapPinIcon size={13} />
                {route.stops.length} stops
              </span>
            </div>
            <p className="mt-1.5 font-serif text-xl">{route.title}</p>
            <p className="mt-1 text-sm text-white/60">{route.summary}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-white">
              Start journey <ChevronRightIcon size={15} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live experience — the working guide once a route is chosen.
// ---------------------------------------------------------------------------
function LiveExperience() {
  const guide = useLiveGuide();
  const {
    liveOn,
    arrivedStopIds,
    offlineReadyIds,
    forceOffline,
    setLiveOn,
    setSimulated,
    advanceStop,
    reset,
    setOfflineReady,
    setForceOffline,
  } = useLiveStore();

  const {
    activeRoute,
    currentStop,
    nextStop,
    effectiveCoords,
    distanceToCurrent,
    isSpeaking,
    listening,
    thinking,
    lastAnswer,
    voiceInSupported,
    replay,
    pause,
    ask,
    startListening,
  } = guide;

  const arrived = currentStop ? arrivedStopIds.includes(currentStop.id) : false;

  // --- Offline pack ---
  const offlineSaved = activeRoute ? offlineReadyIds.includes(activeRoute.id) : false;
  const [saving, setSaving] = useState(false);

  // Reflect any previously-saved pack on mount.
  useEffect(() => {
    if (activeRoute && hasPack(activeRoute.id)) setOfflineReady(activeRoute.id);
  }, [activeRoute, setOfflineReady]);

  const downloadPack = async () => {
    if (!activeRoute || saving) return;
    setSaving(true);
    await savePack(activeRoute);
    setOfflineReady(activeRoute.id);
    setSaving(false);
  };

  // --- Simulate control (so arrivals can be demoed without being in Mongolia) ---
  const simulateArrival = () => {
    if (currentStop)
      setSimulated({
        latitude: currentStop.latitude,
        longitude: currentStop.longitude,
      });
  };
  const walkToNext = () => {
    if (!nextStop) return;
    advanceStop();
    setSimulated({
      latitude: nextStop.latitude,
      longitude: nextStop.longitude,
    });
  };

  return (
    <>
      <TopBar
        region={activeRoute?.region ?? ""}
        distanceLabel={
          distanceToCurrent != null ? formatDistance(distanceToCurrent) : "—"
        }
        liveOn={liveOn}
        onToggleLive={() => setLiveOn(!liveOn)}
      />

      <NextStopPill
        label={arrived ? nextStop?.name ?? "Final stop" : currentStop?.name ?? ""}
        prefix={arrived ? "Next" : "Now"}
      />

      <div className="flex-1" />

      <OfflineBar
        saved={offlineSaved}
        saving={saving}
        offlinePreview={forceOffline}
        onDownload={downloadPack}
        onTogglePreview={() => setForceOffline(!forceOffline)}
      />

      <SimulatePanel
        arrived={arrived}
        currentName={currentStop?.name ?? ""}
        nextName={nextStop?.name}
        onArrive={simulateArrival}
        onWalkNext={walkToNext}
        onChangeRoute={reset}
      />

      <NarrationCard
        speaking={isSpeaking}
        thinking={thinking}
        listening={listening}
        text={lastAnswer ?? currentStop?.narration ?? ""}
        isAnswer={!!lastAnswer}
        voiceInSupported={voiceInSupported}
        onReplay={replay}
        onPause={pause}
        onMic={startListening}
        onAsk={ask}
      />

      {currentStop && (
        <StopDetails
          stop={currentStop}
          mapsUrl={googleMapsDirectionsUrl(currentStop, effectiveCoords)}
        />
      )}
    </>
  );
}

function TopBar({
  region,
  distanceLabel,
  liveOn,
  onToggleLive,
}: {
  region: string;
  distanceLabel: string;
  liveOn: boolean;
  onToggleLive: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/"
        aria-label="Back"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
      >
        <ChevronLeftIcon size={20} />
      </Link>

      <StatusPill>
        <MapPinIcon size={13} />
        {distanceLabel}
      </StatusPill>
      <StatusPill>
        <span className="capitalize">{region}</span>
      </StatusPill>

      <button
        onClick={onToggleLive}
        className={[
          "ml-auto flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors",
          liveOn ? "bg-safety-safe text-white" : "bg-white/10 text-white/60",
        ].join(" ")}
      >
        <span
          className={[
            "h-2 w-2 rounded-full",
            liveOn ? "bg-white" : "bg-white/40",
          ].join(" ")}
        />
        {liveOn ? "Live" : "Paused"}
      </button>

      <Link
        href="/sos"
        className="flex h-10 items-center rounded-full bg-safety-critical px-4 text-xs font-extrabold tracking-wide"
      >
        SOS
      </Link>
    </div>
  );
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-bold">
      {children}
    </span>
  );
}

function NextStopPill({ label, prefix }: { label: string; prefix: string }) {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-full bg-white/10 px-3 py-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-600">
        <MapPinIcon size={13} />
      </span>
      <span className="text-xs font-semibold text-white/70">{prefix}</span>
      <span className="truncate text-sm font-bold">{label}</span>
      <ChevronRightIcon size={16} className="ml-auto shrink-0 text-white/50" />
    </div>
  );
}

// Offline travel pack: download a snapshot of the whole journey (map + words)
// so it's viewable with no network. The eye toggle previews the offline view.
function OfflineBar({
  saved,
  saving,
  offlinePreview,
  onDownload,
  onTogglePreview,
}: {
  saved: boolean;
  saving: boolean;
  offlinePreview: boolean;
  onDownload: () => void;
  onTogglePreview: () => void;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <button
        onClick={onDownload}
        disabled={saving}
        className={[
          "flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold transition-colors",
          saved
            ? "bg-safety-safe/20 text-safety-safe"
            : "bg-white/10 text-white/80 hover:bg-white/15",
        ].join(" ")}
      >
        <MapPinIcon size={15} />
        {saving
          ? "Saving…"
          : saved
            ? "Saved for offline ✓"
            : "Download offline pack"}
      </button>
      {saved && (
        <button
          onClick={onTogglePreview}
          className={[
            "rounded-full px-3 py-2.5 text-xs font-bold transition-colors",
            offlinePreview
              ? "bg-safety-armed text-white"
              : "bg-white/10 text-white/60 hover:bg-white/15",
          ].join(" ")}
        >
          {offlinePreview ? "Offline view" : "Preview offline"}
        </button>
      )}
    </div>
  );
}

// On-stage demo control: drop the traveller onto a stop to trigger the guide.
function SimulatePanel({
  arrived,
  currentName,
  nextName,
  onArrive,
  onWalkNext,
  onChangeRoute,
}: {
  arrived: boolean;
  currentName: string;
  nextName?: string;
  onArrive: () => void;
  onWalkNext: () => void;
  onChangeRoute: () => void;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {!arrived ? (
        <button
          onClick={onArrive}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/10 py-2.5 text-xs font-bold text-white/80 hover:bg-white/15"
        >
          <WalkIcon size={15} /> Simulate arrival
        </button>
      ) : nextName ? (
        <button
          onClick={onWalkNext}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/10 py-2.5 text-xs font-bold text-white/80 hover:bg-white/15"
        >
          <WalkIcon size={15} /> Walk to {nextName}
        </button>
      ) : (
        <span className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/5 py-2.5 text-xs font-bold text-white/40">
          Journey complete · {currentName}
        </span>
      )}
      <button
        onClick={onChangeRoute}
        className="rounded-full bg-white/10 px-3 py-2.5 text-xs font-bold text-white/60 hover:bg-white/15"
      >
        Change route
      </button>
    </div>
  );
}

function NarrationCard({
  speaking,
  thinking,
  listening,
  text,
  isAnswer,
  voiceInSupported,
  onReplay,
  onPause,
  onMic,
  onAsk,
}: {
  speaking: boolean;
  thinking: boolean;
  listening: boolean;
  text: string;
  isAnswer: boolean;
  voiceInSupported: boolean;
  onReplay: () => void;
  onPause: () => void;
  onMic: () => void;
  onAsk: (q: string) => void;
}) {
  const [draft, setDraft] = useState("");

  const status = listening
    ? "listening…"
    : thinking
      ? "thinking…"
      : speaking
        ? "speaking · live guide"
        : isAnswer
          ? "answer"
          : "live guide";

  const submit = () => {
    if (!draft.trim()) return;
    onAsk(draft.trim());
    setDraft("");
  };

  return (
    <div className="rounded-3xl bg-white/[0.07] p-5 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700" />
        <div>
          <p className="font-bold">Nova</p>
          <p className="text-xs text-white/60">{status}</p>
        </div>
        <BarsIcon
          size={22}
          className={[
            "ml-auto transition-colors",
            speaking ? "text-primary-500" : "text-white/30",
          ].join(" ")}
        />
      </div>

      <p className="mt-4 min-h-[3.5rem] text-lg leading-snug">{text}</p>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={speaking ? onPause : onReplay}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-600"
          aria-label={speaking ? "Pause" : "Replay"}
        >
          {speaking ? <PauseIcon size={20} /> : <PlayIcon size={18} />}
        </button>

        {/* Ask by text — always available, robust on a noisy stage. */}
        <div className="flex flex-1 items-center gap-2 rounded-full bg-white/10 px-4 py-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Ask Nova…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
          />
          <button onClick={submit} aria-label="Send" className="text-white/70 hover:text-white">
            <SendIcon size={18} />
          </button>
        </div>

        {voiceInSupported && (
          <button
            onClick={onMic}
            aria-label="Talk to Nova"
            className={[
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
              listening ? "bg-safety-critical" : "bg-white/10",
            ].join(" ")}
          >
            <MicIcon size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

// Context + transport + phrases + the Google Maps hand-off for the current stop.
function StopDetails({
  stop,
  mapsUrl,
}: {
  stop: import("@/types").RouteStop;
  mapsUrl: string;
}) {
  return (
    <div className="mt-3 space-y-3">
      {stop.transport && stop.transport.length > 0 && (
        <div className="rounded-2xl bg-white/[0.05] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-white/50">
            Getting there
          </p>
          <ul className="mt-2 space-y-1.5">
            {stop.transport.map((t) => (
              <li key={t.label} className="flex items-center gap-2 text-sm text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                {t.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {stop.askLocalPhrases && stop.askLocalPhrases.length > 0 && (
        <div className="rounded-2xl bg-white/[0.05] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-white/50">
            Ask a local
          </p>
          <ul className="mt-2 space-y-2.5">
            {stop.askLocalPhrases.map((p) => (
              <li key={p.en}>
                <p className="text-sm font-semibold text-white">{p.en}</p>
                <p className="text-sm text-primary-500">{p.mn}</p>
                <p className="text-xs italic text-white/45">{p.roman}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-bold text-primary-900"
      >
        <MapPinIcon size={16} className="text-primary-600" />
        Open route in Google Maps
      </a>
    </div>
  );
}

// A simple stylised route backdrop — a dotted path with a pulsing current marker.
function MapBackdrop() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_70%_20%,#16233d_0%,#0d1422_60%)]" />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d="M30 28 C 20 45, 60 50, 50 62 S 60 85, 52 95"
          fill="none"
          stroke="#2f6bff"
          strokeWidth="3"
          strokeDasharray="1 5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="absolute left-[30%] top-[28%] h-3 w-3 -translate-x-1/2 rounded-full bg-safety-safe" />
      <span className="absolute left-[50%] top-[62%] flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-primary-600 ring-8 ring-primary-600/20">
        <span className="h-2.5 w-2.5 rounded-full bg-white" />
      </span>
    </div>
  );
}
