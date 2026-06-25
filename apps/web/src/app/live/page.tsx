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
import { hasGoogleMapsKey } from "@/lib/googlemaps";
import { hasPack, loadPack, savePack } from "@/lib/offline";
import { useLiveGuide } from "@/hooks/useLiveGuide";
import { useLiveStore } from "@/stores/liveStore";
import { useLocationStore } from "@/stores/locationStore";
import { useLocation } from "@/hooks/useLocation";
import type { Coords, DemoRoute } from "@/types";

// Loaded lazily + client-only because the Google Maps SDK touches `window`.
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
  const [mapFailed, setMapFailed] = useState(false);
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

  // Live interactive map when we have a key, a connection, and it loads.
  // If the map errors (e.g. an invalid key) we fall through to the stylised
  // backdrop so the screen never shows a blank void.
  if (hasGoogleMapsKey && !offline && !mapFailed) {
    return (
      <div className="absolute inset-0">
        <RouteMap
          route={activeRoute}
          currentIndex={currentStopIndex}
          position={position}
          onError={() => setMapFailed(true)}
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

      <div className="mt-5 space-y-3">
        {demoRoutes.map((route) => (
          <button
            key={route.id}
            onClick={() => start(route)}
            className="w-full rounded-3xl bg-white/[0.07] p-5 text-left backdrop-blur transition-colors hover:bg-white/[0.12]"
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary-500">
              {route.region} · {route.stops.length} stops
            </p>
            <div className="mt-1 flex items-center gap-2">
              <p className="flex-1 font-serif text-xl leading-tight">{route.title}</p>
              <ChevronRightIcon size={18} className="shrink-0 text-white/40" />
            </div>
            <p className="mt-1 line-clamp-1 text-sm text-white/55">{route.summary}</p>
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

  // Secondary panels (Local tips + demo controls) are hidden by default so Nova
  // stays the focus; one button reveals them.
  const [showExtras, setShowExtras] = useState(false);

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
      <TopBar liveOn={liveOn} onToggleLive={() => setLiveOn(!liveOn)} />

      <JourneyPill
        currentName={currentStop?.name ?? ""}
        nextName={nextStop?.name}
      />

      <div className="flex-1" />

      <button
        onClick={() => setShowExtras(!showExtras)}
        className="mb-3 ml-auto flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70 backdrop-blur hover:bg-white/15"
      >
        {showExtras ? "Hide details" : "Tips & controls"}
        <ChevronRightIcon
          size={14}
          className={[
            "transition-transform",
            showExtras ? "-rotate-90" : "rotate-90",
          ].join(" ")}
        />
      </button>

      {showExtras && currentStop && (
        <LocalTips
          stop={currentStop}
          mapsUrl={googleMapsDirectionsUrl(currentStop, effectiveCoords)}
          offlineSaved={offlineSaved}
          saving={saving}
          onDownload={downloadPack}
        />
      )}

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

      {showExtras && (
        <PresenterStrip
          arrived={arrived}
          currentName={currentStop?.name ?? ""}
          nextName={nextStop?.name}
          offlineSaved={offlineSaved}
          offlinePreview={forceOffline}
          onArrive={simulateArrival}
          onWalkNext={walkToNext}
          onTogglePreview={() => setForceOffline(!forceOffline)}
          onChangeRoute={reset}
        />
      )}
    </>
  );
}

function TopBar({
  liveOn,
  onToggleLive,
}: {
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

// Shows where you are now and where you're heading next — the whole point of the
// guide is the journey, so both stops stay visible.
function JourneyPill({
  currentName,
  nextName,
}: {
  currentName: string;
  nextName?: string;
}) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600">
        <MapPinIcon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold leading-tight">
          <span className="text-white/50">Now · </span>
          {currentName}
        </p>
        {nextName ? (
          <p className="mt-0.5 truncate text-xs font-semibold leading-tight text-white/60">
            Next · {nextName}
          </p>
        ) : (
          <p className="mt-0.5 text-xs font-semibold leading-tight text-white/40">
            Final stop
          </p>
        )}
      </div>
    </div>
  );
}

// Recessed "presenter" strip: the demo/dev controls, deliberately low-emphasis so
// they read as a tool rather than product chrome. Drives the on-stage walkthrough
// (simulate arrival → walk to next), plus offline preview and route switching.
function PresenterStrip({
  arrived,
  currentName,
  nextName,
  offlineSaved,
  offlinePreview,
  onArrive,
  onWalkNext,
  onTogglePreview,
  onChangeRoute,
}: {
  arrived: boolean;
  currentName: string;
  nextName?: string;
  offlineSaved: boolean;
  offlinePreview: boolean;
  onArrive: () => void;
  onWalkNext: () => void;
  onTogglePreview: () => void;
  onChangeRoute: () => void;
}) {
  return (
    <div className="mt-3 flex items-center gap-1.5 rounded-2xl bg-white/[0.04] p-1.5">
      <span className="pl-2 pr-0.5 text-[9px] font-bold uppercase tracking-wider text-white/30">
        Demo
      </span>

      {!arrived ? (
        <button
          onClick={onArrive}
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2 text-xs font-bold text-white/80 hover:bg-white/15"
        >
          <WalkIcon size={14} /> Simulate arrival
        </button>
      ) : nextName ? (
        <button
          onClick={onWalkNext}
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2 text-xs font-bold text-white/80 hover:bg-white/15"
        >
          <WalkIcon size={14} /> Walk to next
        </button>
      ) : (
        <span className="flex min-w-0 flex-1 items-center justify-center truncate rounded-xl bg-white/5 py-2 text-xs font-bold text-white/40">
          Arrived · {currentName}
        </span>
      )}

      {offlineSaved && (
        <button
          onClick={onTogglePreview}
          title="Preview how the journey looks with no internet"
          className={[
            "shrink-0 rounded-xl px-2.5 py-2 text-xs font-bold transition-colors",
            offlinePreview
              ? "bg-safety-armed text-white"
              : "bg-white/10 text-white/60 hover:bg-white/15",
          ].join(" ")}
        >
          {offlinePreview ? "Offline view" : "Preview offline"}
        </button>
      )}

      <button
        onClick={onChangeRoute}
        title="Change route"
        className="shrink-0 rounded-xl bg-white/10 px-2.5 py-2 text-xs font-bold text-white/60 hover:bg-white/15"
      >
        Routes
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
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 150;

  // Re-collapse whenever the narration / answer changes.
  useEffect(() => setExpanded(false), [text]);

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

      <p
        className={[
          "mt-4 text-lg leading-snug",
          !expanded && isLong ? "line-clamp-3" : "",
        ].join(" ")}
      >
        {text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1.5 text-xs font-bold text-primary-500 hover:text-primary-400"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}

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

// Collapsible "Local tips" panel: the product content for the current stop —
// transport, "ask a local" phrases, Google Maps hand-off, and the offline pack.
// Collapsed by default so Nova's narration stays the hero.
function LocalTips({
  stop,
  mapsUrl,
  offlineSaved,
  saving,
  onDownload,
}: {
  stop: import("@/types").RouteStop;
  mapsUrl: string;
  offlineSaved: boolean;
  saving: boolean;
  onDownload: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3 overflow-hidden rounded-2xl bg-white/[0.05]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <MapPinIcon size={15} className="shrink-0 text-primary-500" />
        <span className="text-sm font-bold text-white">Local tips</span>
        <span className="text-xs text-white/40">transport · phrases · map</span>
        <ChevronRightIcon
          size={16}
          className={[
            "ml-auto shrink-0 text-white/40 transition-transform",
            open ? "rotate-90" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4">
          {stop.transport && stop.transport.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/50">
                Getting there
              </p>
              <ul className="mt-2 space-y-1.5">
                {stop.transport.map((t) => (
                  <li
                    key={t.label}
                    className="flex items-center gap-2 text-sm text-white/80"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                    {t.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {stop.askLocalPhrases && stop.askLocalPhrases.length > 0 && (
            <div>
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
            className="flex items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-bold text-primary-900"
          >
            <MapPinIcon size={16} className="text-primary-600" />
            Open route in Google Maps
          </a>

          <button
            onClick={onDownload}
            disabled={saving}
            className={[
              "flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold transition-colors",
              offlineSaved
                ? "bg-safety-safe/20 text-safety-safe"
                : "bg-white/10 text-white/80 hover:bg-white/15",
            ].join(" ")}
          >
            {saving
              ? "Saving…"
              : offlineSaved
                ? "Saved for offline ✓"
                : "Download offline pack"}
          </button>
        </div>
      )}
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
