"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Moon, Sun } from "lucide-react";
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
import { weatherEmoji, weatherLabel, type WeatherNow } from "@/lib/weather";
import { useLiveStore } from "@/stores/liveStore";
import { useLocationStore } from "@/stores/locationStore";
import { useLocation } from "@/hooks/useLocation";
import type { Coords, DemoRoute } from "@/types";

// Loaded lazily + client-only because the Google Maps SDK touches `window`.
const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

type Theme = "dark" | "light";

// Local light/night theme just for the Live Guide screen. Night (dark) is the
// default since this screen is designed dark-first; the choice is remembered.
function useLiveTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("live-theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  const toggleTheme = () =>
    setTheme((t) => {
      const next: Theme = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("live-theme", next);
      } catch {
        /* ignore storage failures (private mode etc.) */
      }
      return next;
    });

  return { theme, toggleTheme };
}

// Sun in night mode (tap → go light), Moon in light mode (tap → go night).
function ThemeToggle({
  theme,
  onToggle,
  className,
}: {
  theme: Theme;
  onToggle: () => void;
  className?: string;
}) {
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to night mode"}
      title={isDark ? "Light mode" : "Night mode"}
      className={[
        "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
        "bg-ink/5 text-ink hover:bg-ink/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
        className ?? "",
      ].join(" ")}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

// The live guide. It sits outside the (app) shell, so it has no sidebar/tab bar
// — just the map and the narration card. Defaults to night mode; the toggle in
// the top bar switches it to light. `.dark` is scoped to this wrapper, so the
// rest of the app is unaffected.
export default function LiveGuidePage() {
  const activeRoute = useLiveStore((s) => s.activeRoute);
  // Begin watching real GPS as soon as the screen mounts.
  useLocation();
  const { theme, toggleTheme } = useLiveTheme();

  // The `dark` class lives on the OUTER element; the themed colours live on the
  // inner element. Tailwind's class strategy compiles `dark:` to a descendant
  // selector (`.dark .dark\:bg-…`), so an element can't theme itself — the inner
  // div must be a *child* of the one carrying `.dark`.
  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="relative min-h-screen overflow-hidden bg-[#eef2fb] text-ink transition-colors dark:bg-[#0d1422] dark:text-white">
        {activeRoute ? <LiveBackground theme={theme} /> : <MapBackdrop />}
        <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-6 pt-6">
          {activeRoute ? (
            <LiveExperience theme={theme} onToggleTheme={toggleTheme} />
          ) : (
            <RoutePicker theme={theme} onToggleTheme={toggleTheme} />
          )}
        </div>
      </div>
    </div>
  );
}

// Decides what fills the screen behind the guide UI:
//   real Mapbox route map → cached static snapshot (offline) → stylised backdrop.
function LiveBackground({ theme }: { theme: Theme }) {
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
          theme={theme}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#eef2fb]/40 via-transparent to-[#eef2fb]/90 dark:from-[#0d1422]/40 dark:via-transparent dark:to-[#0d1422]/90" />
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
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#eef2fb]/40 via-transparent to-[#eef2fb]/90 dark:from-[#0d1422]/40 dark:via-transparent dark:to-[#0d1422]/90" />
      </div>
    );
  }

  return <MapBackdrop />;
}

// ---------------------------------------------------------------------------
// Route picker — shown until a route is active. Each route is a demo journey.
// ---------------------------------------------------------------------------
function RoutePicker({
  theme,
  onToggleTheme,
}: {
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const setRoute = useLiveStore((s) => s.setRoute);

  const start = (route: DemoRoute) => {
    setRoute(route);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/5 dark:bg-white/10"
        >
          <ChevronLeftIcon size={20} />
        </Link>
        <span className="text-sm font-semibold text-ink-muted dark:text-white/70">
          Live Guide
        </span>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} className="ml-auto" />
      </div>

      <h1 className="mt-6 font-serif text-3xl leading-tight">
        Where shall we go?
      </h1>

      <div className="mt-5 space-y-3">
        {demoRoutes.map((route) => (
          <button
            key={route.id}
            onClick={() => start(route)}
            className="w-full rounded-3xl bg-white p-5 text-left shadow-ink-sm backdrop-blur transition-colors hover:bg-sand-50 dark:bg-white/[0.07] dark:shadow-none dark:hover:bg-white/[0.12]"
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary-600 dark:text-primary-500">
              {route.region} · {route.stops.length} stops
            </p>
            <div className="mt-1 flex items-center gap-2">
              <p className="flex-1 font-serif text-xl leading-tight">{route.title}</p>
              <ChevronRightIcon
                size={18}
                className="shrink-0 text-ink-muted/60 dark:text-white/40"
              />
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-ink-muted dark:text-white/55">
              {route.stops.map((s) => s.name).join(" → ")}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live experience — the working guide once a route is chosen.
// ---------------------------------------------------------------------------
function LiveExperience({
  theme,
  onToggleTheme,
}: {
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const guide = useLiveGuide();
  const {
    arrivedStopIds,
    offlineReadyIds,
    forceOffline,
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
    audioLoading,
    lastAnswer,
    voiceError,
    weather,
    weatherTip,
    voiceInSupported,
    replay,
    pause,
    ask,
    startListening,
  } = guide;

  // Narration shown on the card: the stop's text plus the live weather tip
  // (Nova speaks the same combination on arrival). An AI answer replaces it.
  const narrationText =
    lastAnswer ??
    [currentStop?.narration, weatherTip].filter(Boolean).join(" ");

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
      <TopBar theme={theme} onToggleTheme={onToggleTheme} />

      <JourneyPill
        currentName={currentStop?.name ?? ""}
        nextName={nextStop?.name}
        weather={weather}
      />

      <div className="flex-1" />

      <button
        onClick={() => setShowExtras(!showExtras)}
        className="mb-3 ml-auto flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1.5 text-xs font-bold text-ink-muted backdrop-blur hover:bg-ink/10 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15"
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
        audioLoading={audioLoading}
        listening={listening}
        text={narrationText}
        isAnswer={!!lastAnswer}
        voiceError={voiceError}
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
  theme,
  onToggleTheme,
}: {
  theme: Theme;
  onToggleTheme: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/"
        aria-label="Back"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/5 dark:bg-white/10"
      >
        <ChevronLeftIcon size={20} />
      </Link>

      <ThemeToggle theme={theme} onToggle={onToggleTheme} className="ml-auto" />

      <Link
        href="/sos"
        className="flex h-10 items-center rounded-full bg-safety-critical px-4 text-xs font-extrabold tracking-wide text-white"
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
  weather,
}: {
  currentName: string;
  nextName?: string;
  weather: WeatherNow | null;
}) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-ink/5 px-3 py-2.5 dark:bg-white/10">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white">
        <MapPinIcon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold leading-tight">
          <span className="text-ink-muted dark:text-white/50">Now · </span>
          {currentName}
        </p>
        {nextName ? (
          <p className="mt-0.5 truncate text-xs font-semibold leading-tight text-ink-muted dark:text-white/60">
            Next · {nextName}
          </p>
        ) : (
          <p className="mt-0.5 text-xs font-semibold leading-tight text-ink-muted/70 dark:text-white/40">
            Final stop
          </p>
        )}
      </div>

      {weather && (
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold leading-none">
            {weatherEmoji(weather.weatherCode)} {weather.temperature}°
          </p>
          <p className="mt-1 text-[10px] font-semibold capitalize leading-none text-ink-muted dark:text-white/50">
            {weatherLabel(weather.weatherCode)}
          </p>
        </div>
      )}
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
    <div className="mt-3 flex items-center gap-1.5 rounded-2xl bg-ink/[0.04] p-1.5 dark:bg-white/[0.04]">
      <span className="pl-2 pr-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-muted/60 dark:text-white/30">
        Demo
      </span>

      {!arrived ? (
        <button
          onClick={onArrive}
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink/5 py-2 text-xs font-bold text-ink hover:bg-ink/10 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15"
        >
          <WalkIcon size={14} /> Simulate arrival
        </button>
      ) : nextName ? (
        <button
          onClick={onWalkNext}
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink/5 py-2 text-xs font-bold text-ink hover:bg-ink/10 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15"
        >
          <WalkIcon size={14} /> Walk to next
        </button>
      ) : (
        <span className="flex min-w-0 flex-1 items-center justify-center truncate rounded-xl bg-ink/5 py-2 text-xs font-bold text-ink-muted dark:bg-white/5 dark:text-white/40">
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
              : "bg-ink/5 text-ink-muted hover:bg-ink/10 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/15",
          ].join(" ")}
        >
          {offlinePreview ? "Offline view" : "Preview offline"}
        </button>
      )}

      <button
        onClick={onChangeRoute}
        title="Change route"
        className="shrink-0 rounded-xl bg-ink/5 px-2.5 py-2 text-xs font-bold text-ink-muted hover:bg-ink/10 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/15"
      >
        Routes
      </button>
    </div>
  );
}

function NarrationCard({
  speaking,
  thinking,
  audioLoading,
  listening,
  text,
  isAnswer,
  voiceError,
  voiceInSupported,
  onReplay,
  onPause,
  onMic,
  onAsk,
}: {
  speaking: boolean;
  thinking: boolean;
  audioLoading: boolean;
  listening: boolean;
  text: string;
  isAnswer: boolean;
  voiceError: string | null;
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

  const loading = thinking || audioLoading; // working, no audio yet
  // Nova is "busy" whenever she's thinking, preparing, or speaking — the user
  // must pause her before they can talk (otherwise the voices overlap and lag).
  const busy = loading || speaking;

  const status = listening
    ? "listening…"
    : thinking
      ? "thinking…"
      : audioLoading
        ? "preparing…"
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
    <div className="rounded-3xl bg-white p-5 shadow-ink-sm backdrop-blur dark:bg-white/[0.07] dark:shadow-none">
      <div className="flex items-center gap-3">
        <span className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700" />
        <div>
          <p className="font-bold">Nova</p>
          {voiceError ? (
            <p className="text-xs font-semibold text-safety-critical">{voiceError}</p>
          ) : (
            <p className="text-xs text-ink-muted dark:text-white/60">{status}</p>
          )}
        </div>
        {loading ? (
          <span
            className="ml-auto h-5 w-5 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500"
            role="status"
            aria-label="Nova is preparing"
          />
        ) : (
          <BarsIcon
            size={22}
            className={[
              "ml-auto transition-colors",
              speaking ? "text-primary-500" : "text-ink-muted/50 dark:text-white/30",
            ].join(" ")}
          />
        )}
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
          className="mt-1.5 text-xs font-bold text-primary-600 hover:text-primary-500 dark:text-primary-500 dark:hover:text-primary-400"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={speaking ? onPause : onReplay}
          disabled={loading}
          className={[
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white transition-opacity",
            loading ? "opacity-70" : "",
          ].join(" ")}
          aria-label={loading ? "Preparing" : speaking ? "Pause" : "Replay"}
        >
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : speaking ? (
            <PauseIcon size={20} />
          ) : (
            <PlayIcon size={18} />
          )}
        </button>

        {/* Ask by text — always available, robust on a noisy stage. */}
        <div className="flex flex-1 items-center gap-2 rounded-full bg-ink/5 px-4 py-2 dark:bg-white/10">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Ask Nova…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink-muted dark:placeholder:text-white/40"
          />
          <button
            onClick={submit}
            aria-label="Send"
            className="text-ink-muted hover:text-ink dark:text-white/70 dark:hover:text-white"
          >
            <SendIcon size={18} />
          </button>
        </div>

        {voiceInSupported && (
          <button
            onClick={onMic}
            disabled={busy}
            aria-label={busy ? "Pause Nova to talk" : "Talk to Nova"}
            title={busy ? "Pause Nova to talk" : "Talk to Nova"}
            className={[
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors",
              busy
                ? "cursor-not-allowed bg-ink/5 text-ink-muted/40 dark:bg-white/5 dark:text-white/20"
                : listening
                  ? "bg-safety-critical text-white"
                  : "bg-ink/5 text-ink dark:bg-white/10 dark:text-white",
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
    <div className="mb-3 overflow-hidden rounded-2xl bg-ink/[0.04] dark:bg-white/[0.05]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <MapPinIcon size={15} className="shrink-0 text-primary-500" />
        <span className="text-sm font-bold text-ink dark:text-white">Local tips</span>
        <span className="text-xs text-ink-muted/70 dark:text-white/40">
          transport · phrases · map
        </span>
        <ChevronRightIcon
          size={16}
          className={[
            "ml-auto shrink-0 text-ink-muted/70 transition-transform dark:text-white/40",
            open ? "rotate-90" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4">
          {stop.transport && stop.transport.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted dark:text-white/50">
                Getting there
              </p>
              <ul className="mt-2 space-y-1.5">
                {stop.transport.map((t) => (
                  <li
                    key={t.label}
                    className="flex items-center gap-2 text-sm text-ink dark:text-white/80"
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
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted dark:text-white/50">
                Ask a local
              </p>
              <ul className="mt-2 space-y-2.5">
                {stop.askLocalPhrases.map((p) => (
                  <li key={p.en}>
                    <p className="text-sm font-semibold text-ink dark:text-white">{p.en}</p>
                    <p className="text-sm text-primary-600 dark:text-primary-500">{p.mn}</p>
                    <p className="text-xs italic text-ink-muted/80 dark:text-white/45">
                      {p.roman}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-full bg-primary-600 py-3 text-sm font-bold text-white dark:bg-white dark:text-primary-900"
          >
            <MapPinIcon size={16} className="text-white dark:text-primary-600" />
            Open route in Google Maps
          </a>

          <button
            onClick={onDownload}
            disabled={saving}
            className={[
              "flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold transition-colors",
              offlineSaved
                ? "bg-safety-safe/20 text-safety-safe"
                : "bg-ink/5 text-ink hover:bg-ink/10 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15",
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
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_70%_20%,#dbe6ff_0%,#eef2fb_60%)] dark:bg-[radial-gradient(120%_90%_at_70%_20%,#16233d_0%,#0d1422_60%)]" />
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
