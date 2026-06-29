"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Layers, Moon, Sun } from "lucide-react";
import {
  BarsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  MicIcon,
  PauseIcon,
  PlayIcon,
  SendIcon,
  SparklesIcon,
  WalkIcon,
} from "@/components/icons";
import { demoRoutes, getRoutes } from "@/lib/routes";
import type { BusLeg, BusRoute, BusStep } from "@/lib/transit";
import { googleMapsDirectionsUrl } from "@/lib/maps";
import { GOOGLE_MAPS_KEY, hasGoogleMapsKey, loadGoogleMaps } from "@/lib/googlemaps";
import { formatDistance, haversineMeters } from "@/lib/geo";
import { resolvePosition } from "@/lib/position";
import { buildRoutePath } from "@/lib/routePath";
import { hasPack, loadPack, savePack } from "@/lib/offline";
import { useLiveGuide } from "@/hooks/useLiveGuide";
import { weatherEmoji, weatherLabel, type WeatherNow } from "@/lib/weather";
import { useLiveStore } from "@/stores/liveStore";
import { useLocationStore } from "@/stores/locationStore";
import { useLocation } from "@/hooks/useLocation";
import { useOnline } from "@/hooks/useOnline";
import type { Coords, DemoRoute, PlaceOption, RouteStop } from "@/types";

// Loaded lazily + client-only because the Google Maps SDK touches `window`.
const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });
const OfflineMap = dynamic(() => import("@/components/OfflineMap"), { ssr: false });

// A place the traveller has chosen to head to (plan stop or a nearby pick).
type Target = { name: string; latitude: number; longitude: number };

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, "");

// Turn a Google transit leg into plain "board bus N at X, get off at Y" steps.
function parseBusSteps(leg: google.maps.DirectionsLeg): BusStep[] {
  return leg.steps.map((s): BusStep => {
    if (s.travel_mode === google.maps.TravelMode.TRANSIT && s.transit) {
      const t = s.transit;
      const line = t.line?.short_name || t.line?.name || "Bus";
      return {
        mode: "transit",
        text: `Bus ${line} toward ${t.headsign ?? t.arrival_stop?.name ?? "destination"}`,
        sub: `Board at ${t.departure_stop?.name ?? "stop"} · ${t.num_stops} stop${t.num_stops === 1 ? "" : "s"} · get off at ${t.arrival_stop?.name ?? "stop"}`,
      };
    }
    return { mode: "walk", text: stripHtml(s.instructions || "Walk"), sub: s.duration?.text };
  });
}

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
        {/* When a route is live, let pointer events fall THROUGH the empty parts
            of this column to the map behind it, so the map drags/pans like Google
            Maps. The interactive pieces (bars, cards, buttons) re-enable
            pointer-events on themselves. */}
        <div
          className={[
            "relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-6 pt-6",
            activeRoute ? "pointer-events-none" : "",
          ].join(" ")}
        >
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
  const { activeRoute, currentStopIndex, simulatedCoords, forceOffline, suggestions, selectedPlace, returnTarget, returnMode, busLegs, mapType } =
    useLiveStore();
  const realCoords = useLocationStore((s) => s.coordinates);
  const position: Coords | null = resolvePosition(simulatedCoords, realCoords, activeRoute);

  const online = useOnline();
  const [mapFailed, setMapFailed] = useState(false);

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
          suggestions={suggestions}
          selectedPlace={selectedPlace}
          returnTarget={returnTarget}
          returnMode={returnMode}
          busLegs={busLegs}
          mapType={mapType}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#eef2fb]/40 via-transparent to-[#eef2fb]/90 dark:from-[#0d1422]/40 dark:via-transparent dark:to-[#0d1422]/90" />
      </div>
    );
  }

  // Offline: prefer the interactive cached-tile map (zoom / pan / live GPS); fall
  // back to the saved static snapshot, then the stylised backdrop.
  if (offline) {
    const pack = loadPack(activeRoute.id);
    if (pack?.tiles) {
      // z-0 traps Leaflet's internal pane/control z-indexes inside this box so
      // the guide UI (z-10 column) still paints on top of the map.
      return (
        <div className="absolute inset-0 z-0">
          <OfflineMap
            stops={activeRoute.stops}
            encodedPath={pack.encodedPath}
            position={position}
            theme={theme}
            returnTarget={returnTarget}
            returnMode={returnMode}
            busLegs={busLegs}
          />
        </div>
      );
    }
    return (
      <div className="absolute inset-0">
        {pack?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pack.image}
            alt={`${activeRoute.title} route`}
            className="h-full w-full object-cover opacity-90"
          />
        ) : (
          <MapBackdrop />
        )}
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
  const setSimulated = useLiveStore((s) => s.setSimulated);
  // Journeys from the backend; falls back to the bundled routes offline.
  const [routes, setRoutes] = useState<DemoRoute[]>(demoRoutes);
  useEffect(() => {
    void getRoutes().then(setRoutes);
  }, []);

  const start = (route: DemoRoute) => {
    setRoute(route); // resets simulatedCoords to null…
    const first = route.stops[0];
    // …so every demo begins at the first stop, not the user's real GPS.
    if (first) setSimulated({ latitude: first.latitude, longitude: first.longitude });
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
        {routes.map((route) => (
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
    returnTarget,
    busLegs,
    setSimulated,
    advanceStop,
    reset,
    setSuggestions,
    setReturnTarget,
    setBusLegs,
    setOfflineReady,
    setForceOffline,
  } = useLiveStore();

  // Offline (real signal loss or the demo toggle): the chat/Places-backed features
  // (nearby suggestions, asking Michelle) can't reach the network, so we hide them.
  const online = useOnline();
  const offline = forceOffline || !online;

  const {
    activeRoute,
    currentStop,
    currentNarration,
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
    suggestions,
    voiceInSupported,
    replay,
    pause,
    ask,
    announce,
    startListening,
  } = guide;

  // Narration shown on the card: the stop's text plus the live weather tip
  // (Michelle speaks the same combination on arrival). An AI answer replaces it.
  const narrationText =
    lastAnswer ??
    [currentNarration, weatherTip].filter(Boolean).join(" ");

  const arrived = currentStop ? arrivedStopIds.includes(currentStop.id) : false;

  // Secondary panels (Local tips + demo controls) are hidden by default so Michelle
  // stays the focus; one button reveals them.
  const [showExtras, setShowExtras] = useState(false);
  // The conversational hub: the "what's next?" decision card, the full-plan list,
  // a chosen target awaiting a transport choice, and the bus-route sheet.
  const [cardOpen, setCardOpen] = useState(false);
  const [fullPlanOpen, setFullPlanOpen] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);
  // "Somewhere else" first asks what the traveller feels like, before suggesting.
  const [intentOpen, setIntentOpen] = useState(false);
  // True after a side-trip to a nearby place, so we can offer "Back to my route".
  const [detour, setDetour] = useState(false);
  // The bus route's steps (which bus, board/alight stops) once "By bus" is picked.
  const [busPlan, setBusPlan] = useState<BusStep[] | null>(null);

  // Choose a place to head to → preview the leg on the map → ask transport.
  const pickTarget = (t: Target) => {
    setSuggestions([]);
    setCardOpen(false);
    setFullPlanOpen(false);
    setBusPlan(null);
    setBusLegs(null);
    setDetour(false); // heading to a plan target = back on the route
    setReturnTarget({ latitude: t.latitude, longitude: t.longitude }); // road preview
    setTarget(t);
  };
  const chooseBus = (steps: BusStep[], legs?: BusLeg[]) => {
    if (target) {
      // Redraw the same map's guide line as a transit (bus) route + show steps.
      // legs = real per-leg geometry; without them the map uses Google transit.
      setReturnTarget({ latitude: target.latitude, longitude: target.longitude }, "transit");
      setBusLegs(legs ?? null);
      setBusPlan(steps);
      const firstBus = steps.find((s) => s.mode === "transit");
      announce(
        firstBus
          ? `${firstBus.text}. ${firstBus.sub ?? ""} The full route is below and on the map.`
          : `Here's your bus route to ${target.name.split(",")[0]} on the map.`,
      );
    }
    setTarget(null);
  };
  const chooseCar = () => {
    setBusPlan(null);
    setBusLegs(null);
    if (target)
      announce(
        `For a taxi you can call UBCab, or just raise your hand by the road. I'll guide you to ${target.name.split(",")[0]}.`,
      );
    setTarget(null); // returnTarget stays (road line) → guide line to it
  };
  // Ask the traveller what they feel like first; the answer (a quick chip or a
  // typed/spoken request) drives a tailored nearby recommendation.
  const somewhereElse = () => {
    setCardOpen(false);
    setIntentOpen(true);
    announce("What do you feel like? Grab a bite, see a sight, a coffee, or somewhere to rest?");
  };
  const pickIntent = (q: string) => {
    setIntentOpen(false);
    void ask(q);
  };
  // A nearby suggestion is always close, so skip the bus/taxi choice and just
  // guide there on foot (road line) — no TransportCard.
  const goToNearby = (t: Target) => {
    setSuggestions([]);
    setBusPlan(null);
    setBusLegs(null);
    setReturnTarget({ latitude: t.latitude, longitude: t.longitude }, "walk");
    setDetour(true);
    announce(
      `Heading to ${t.name.split(",")[0]} — it's close, I'll guide you there on foot. When you're done, tap "Back to my route" to keep going.`,
    );
  };
  // A typed/spoken request answers the intent prompt too → close it.
  useEffect(() => {
    if (suggestions.length) setIntentOpen(false);
  }, [suggestions]);

  // --- Offline pack ---
  const offlineSaved = activeRoute ? offlineReadyIds.includes(activeRoute.id) : false;
  const [saving, setSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState<{ done: number; total: number } | null>(null);
  const savingRef = useRef(false);

  // Build (or rebuild) the offline pack: AI narration text + voice audio + map.
  const downloadPack = async () => {
    if (!activeRoute || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSavingProgress({ done: 0, total: activeRoute.stops.length });
    try {
      await savePack(activeRoute, (done, total) => setSavingProgress({ done, total }));
      setOfflineReady(activeRoute.id);
    } finally {
      savingRef.current = false;
      setSaving(false);
      setSavingProgress(null);
    }
  };

  // On route activation: reflect an existing pack, else auto-build it once while
  // online so the journey is ready when the signal drops.
  useEffect(() => {
    if (!activeRoute) return;
    if (hasPack(activeRoute.id)) setOfflineReady(activeRoute.id);
    else if (navigator.onLine) void downloadPack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoute?.id]);

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

  // --- Auto-walk: animate the position ALONG THE ROAD so a demo "walks" the
  // journey hands-free (the arrival logic narrates each stop as we pass it).
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simActiveRef = useRef(false); // survives the async path load / re-renders
  const [simulating, setSimulating] = useState(false);

  // Pause the walk while Michelle is talking/preparing, so she finishes narrating a
  // stop before the marker moves on (otherwise it outruns the voice → overlap).
  const busyRef = useRef(false);
  busyRef.current = isSpeaking || audioLoading || thinking;

  const STEP_MS = 1100; // a little slow, so the journey is easy to follow

  const stopSimulation = () => {
    simActiveRef.current = false;
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    setSimulating(false);
  };

  const startSimulation = async () => {
    if (!activeRoute || activeRoute.stops.length === 0 || simActiveRef.current) return;
    simActiveRef.current = true;
    setSimulating(true);

    // Walk the recommended detour (current position → returnTarget) when one is
    // set, otherwise walk the whole main route. buildRoutePath only reads
    // latitude/longitude, so a 2-point leg is enough for the detour case.
    const anchor = guide.effectiveCoords;
    const detour = returnTarget && anchor;
    const legStops: RouteStop[] = detour
      ? ([
          { latitude: anchor!.latitude, longitude: anchor!.longitude },
          { latitude: returnTarget!.latitude, longitude: returnTarget!.longitude },
        ] as RouteStop[])
      : activeRoute.stops;

    // A detour autowalk takes a FIXED total time regardless of distance, so a
    // long recommended route just moves faster and a short one slower — same
    // duration either way. Fixed step count + a computed interval below gives
    // that. Main routes keep the per-leg equal-time default.
    const stepsPerLeg = detour ? 48 : 14; // detour: enough points for smooth motion

    // A recommended bus route: walk exactly the geometry drawn on the map (walk
    // legs + transit legs), not a straight driving line to returnTarget.
    const busPts: Coords[] | null =
      busLegs && busLegs.length ? busLegs.flatMap((l) => l.pts) : null;

    let pts: Coords[] = [];
    if (busPts && busPts.length > 1) {
      pts = busPts;
    } else {
      // Prefer real road geometry; fall back to straight legs if it can't load.
      try {
        const google = await loadGoogleMaps(GOOGLE_MAPS_KEY);
        pts = (await buildRoutePath(google, legStops, stepsPerLeg)).map((p) => ({
          latitude: p.lat,
          longitude: p.lng,
        }));
      } catch {
        pts = [];
      }
    }
    if (!simActiveRef.current) return; // user stopped while the path loaded

    if (pts.length === 0) {
      for (let i = 0; i < legStops.length - 1; i++) {
        const a = legStops[i];
        const b = legStops[i + 1];
        for (let s = 0; s < stepsPerLeg; s++) {
          const t = s / stepsPerLeg;
          pts.push({
            latitude: a.latitude + (b.latitude - a.latitude) * t,
            longitude: a.longitude + (b.longitude - a.longitude) * t,
          });
        }
      }
      const last = legStops[legStops.length - 1];
      pts.push({ latitude: last.latitude, longitude: last.longitude });
    }
    if (pts.length === 0) {
      stopSimulation();
      return;
    }

    // Resume from the path point nearest the current position, so a refresh (or
    // pressing play mid-route) continues from here instead of jumping to the
    // start. ponytail: O(n) scan, n≈14·stops — fine for a demo route.
    let i = anchor
      ? pts.reduce(
          (best, p, idx) =>
            haversineMeters(anchor, p) < haversineMeters(anchor, pts[best]) ? idx : best,
          0,
        )
      : 0;
    setSimulated(pts[i]);
    // Detour: spread the remaining points over a fixed total time (≈4s) so every
    // recommended route finishes in the same time. ponytail: DETOUR_TOTAL_MS is
    // the knob — smaller = faster. Main routes keep the slower per-step pace.
    const DETOUR_TOTAL_MS = 4000;
    const remaining = Math.max(1, pts.length - i);
    const intervalMs = detour
      ? Math.max(40, Math.round(DETOUR_TOTAL_MS / remaining))
      : STEP_MS;
    simTimerRef.current = setInterval(() => {
      // Hold position while Michelle is speaking / preparing a narration.
      if (busyRef.current) return;
      i += 1;
      if (i >= pts.length) {
        stopSimulation();
        return;
      }
      setSimulated(pts[i]);
    }, intervalMs);
  };

  // Stop the timer if the screen unmounts (e.g. switching routes).
  useEffect(() => {
    return () => {
      simActiveRef.current = false;
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, []);

  // When the traveller reaches a stop, Michelle reads it (arrival narration) and
  // the "what's next?" card opens — unless we're mid Auto-walk demo or already
  // mid-decision. ponytail: keyed on the stop id so it fires once per arrival.
  // Skip the clears on the first run after a reload, else a persisted bus/detour
  // route gets wiped on mount and the map falls back to the main route.
  const arrivalMounted = useRef(false);
  useEffect(() => {
    if (arrived && !simulating && !target) {
      if (arrivalMounted.current) {
        setBusPlan(null);
        setBusLegs(null);
        setDetour(false); // reached a plan stop → no longer on a side-trip
      }
      setCardOpen(true);
    }
    arrivalMounted.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrived, currentStop?.id]);

  return (
    <>
      <TopBar theme={theme} onToggleTheme={onToggleTheme} />

      <JourneyPill
        currentName={currentStop?.name ?? ""}
        nextName={nextStop?.name}
        weather={weather}
      />

      {savingProgress && (
        <div className="pointer-events-none mt-2 flex items-center gap-2 self-start rounded-full bg-ink/5 px-3 py-1.5 text-xs font-semibold text-ink-muted dark:bg-white/10 dark:text-white/60">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
          Preparing offline guide… {savingProgress.done}/{savingProgress.total}
        </div>
      )}

      {forceOffline && !savingProgress && (
        <div className="pointer-events-none mt-2 self-start rounded-full bg-ink/80 px-3 py-1.5 text-xs font-bold text-white shadow-sm dark:bg-white/15">
          {offlineSaved
            ? "📦 Offline preview — saved map, text & voice"
            : "📦 Offline preview — nothing saved yet, reconnect to prepare"}
        </div>
      )}

      <div className="flex-1" />

      {/* Scrollable bottom cluster — keeps the demo controls (Routes, Auto-walk)
          reachable when suggestions/tips push the stack past the screen. */}
      <div className="pointer-events-auto flex max-h-[58vh] shrink-0 flex-col overflow-y-auto">
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

      {/* The conversational hub. Priority: transport choice → decision card →
          nearby picks → a quiet "What's next?" entry. */}
      {target ? (
        <TransportCard
          origin={effectiveCoords}
          target={target}
          onBus={chooseBus}
          onCar={chooseCar}
          onBack={() => {
            setTarget(null);
            setReturnTarget(null);
            setBusLegs(null);
          }}
        />
      ) : intentOpen ? (
        <IntentCard
          onPick={pickIntent}
          onBack={() => {
            setIntentOpen(false);
            setCardOpen(true);
          }}
        />
      ) : cardOpen ? (
        <NextStepCard
          nextStop={nextStop}
          stops={activeRoute?.stops ?? []}
          currentStopId={currentStop?.id ?? null}
          fullPlanOpen={fullPlanOpen}
          onToggleFullPlan={() => setFullPlanOpen((v) => !v)}
          onTakeMeThere={() =>
            nextStop &&
            pickTarget({
              name: nextStop.name,
              latitude: nextStop.latitude,
              longitude: nextStop.longitude,
            })
          }
          onSomewhereElse={somewhereElse}
          offline={offline}
          onPickStop={(s) =>
            pickTarget({ name: s.name, latitude: s.latitude, longitude: s.longitude })
          }
          onClose={() => setCardOpen(false)}
        />
      ) : suggestions.length === 0 && !busPlan ? (
        <button
          onClick={() => setCardOpen(true)}
          className={[
            "pointer-events-auto mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold",
            detour
              ? "bg-primary-600 text-white"
              : "bg-ink/5 text-ink hover:bg-ink/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
          ].join(" ")}
        >
          {detour ? "↩ Back to my route" : "What's next? →"}
        </button>
      ) : null}

      {busPlan && <BusPlanCard steps={busPlan} onClose={() => setBusPlan(null)} />}

      {suggestions.length > 0 && (
        <SuggestionList
          suggestions={suggestions}
          userCoords={effectiveCoords}
          onDismiss={() => setSuggestions([])}
          onPick={(place) =>
            goToNearby({
              name: place.name,
              latitude: place.latitude,
              longitude: place.longitude,
            })
          }
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
        offline={offline}
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
          simulating={simulating}
          onArrive={simulateArrival}
          onWalkNext={walkToNext}
          onToggleSimulate={() => (simActiveRef.current ? stopSimulation() : startSimulation())}
          onTogglePreview={() => setForceOffline(!forceOffline)}
          onChangeRoute={reset}
        />
      )}
      </div>
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
  const mapType = useLiveStore((s) => s.mapType);
  const toggleMapType = useLiveStore((s) => s.toggleMapType);
  const forceOffline = useLiveStore((s) => s.forceOffline);
  const online = useOnline();
  const satellite = mapType === "hybrid";
  // The satellite/map toggle only affects the online Google map — hide it offline.
  const showLayers = online && !forceOffline;
  return (
    <div className="pointer-events-auto flex items-center gap-2">
      <Link
        href="/"
        aria-label="Back"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/5 dark:bg-white/10"
      >
        <ChevronLeftIcon size={20} />
      </Link>

      {showLayers && (
        <button
          type="button"
          onClick={toggleMapType}
          aria-label={satellite ? "Switch to map view" : "Switch to satellite view"}
          title={satellite ? "Map view" : "Satellite view"}
          className={[
            "ml-auto flex h-10 w-10 items-center justify-center rounded-full transition-colors",
            satellite
              ? "bg-primary-600 text-white"
              : "bg-ink/5 text-ink hover:bg-ink/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
          ].join(" ")}
        >
          <Layers size={18} />
        </button>
      )}

      <ThemeToggle theme={theme} onToggle={onToggleTheme} className={showLayers ? "" : "ml-auto"} />

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
    <div className="pointer-events-auto mt-3 flex items-center gap-3 rounded-2xl bg-ink/5 px-3 py-2.5 dark:bg-white/10">
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
  simulating,
  onArrive,
  onWalkNext,
  onToggleSimulate,
  onTogglePreview,
  onChangeRoute,
}: {
  arrived: boolean;
  currentName: string;
  nextName?: string;
  offlineSaved: boolean;
  offlinePreview: boolean;
  simulating: boolean;
  onArrive: () => void;
  onWalkNext: () => void;
  onToggleSimulate: () => void;
  onTogglePreview: () => void;
  onChangeRoute: () => void;
}) {
  return (
    <div className="pointer-events-auto mt-3 flex flex-wrap items-center gap-1.5 rounded-2xl bg-ink/[0.04] p-1.5 dark:bg-white/[0.04]">
      <span className="pl-2 pr-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-muted/60 dark:text-white/30">
        Demo
      </span>

      {/* Auto-walk the whole route hands-free (the headline demo control). */}
      <button
        onClick={onToggleSimulate}
        title="Auto-walk the route"
        className={[
          "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors",
          simulating
            ? "bg-safety-safe text-white"
            : "bg-primary-600 text-white hover:bg-primary-700",
        ].join(" ")}
      >
        {simulating ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
        {simulating ? "Walking…" : "Auto-walk"}
      </button>

      {!arrived ? (
        <button
          onClick={onArrive}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-ink/5 px-3 py-2 text-xs font-bold text-ink hover:bg-ink/10 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15"
        >
          <WalkIcon size={14} /> Arrive
        </button>
      ) : nextName ? (
        <button
          onClick={onWalkNext}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-ink/5 px-3 py-2 text-xs font-bold text-ink hover:bg-ink/10 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15"
        >
          <WalkIcon size={14} /> Next
        </button>
      ) : (
        <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-ink/5 px-3 py-2 text-xs font-bold text-ink-muted dark:bg-white/5 dark:text-white/40">
          Arrived
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

// Nearby places Michelle found — tap one to head there (then choose transport).
function SuggestionList({
  suggestions,
  userCoords,
  onPick,
  onDismiss,
}: {
  suggestions: PlaceOption[];
  userCoords: Coords | null;
  onPick: (place: PlaceOption) => void;
  onDismiss: () => void;
}) {
  const transit = suggestions.some((s) => s.kind === "transit");
  return (
    <div className="animate-rise pointer-events-auto mt-3 rounded-3xl bg-white p-3 shadow-sm dark:bg-white/[0.07] dark:shadow-none">
      <div className="flex items-center justify-between px-1 pb-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted dark:text-white/50">
          {suggestions.length} {transit ? "stops" : "places"} nearby — tap to go
        </p>
        <button onClick={onDismiss} className="text-xs font-semibold text-ink-muted dark:text-white/50">
          Hide
        </button>
      </div>
      {/* Numbered + colour-coded to match the map markers, so the traveller can
          tell which dot is which place at a glance. */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((place, i) => {
          const dist = userCoords ? formatDistance(haversineMeters(userCoords, place)) : null;
          const color = place.kind === "transit" ? "#1F9D6B" : "#D9831F";
          return (
            <button
              key={place.id}
              onClick={() => onPick(place)}
              className="flex items-center gap-1.5 rounded-full bg-ink/5 px-2 py-1.5 pr-3 text-xs font-semibold text-ink hover:bg-ink/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {i + 1}
              </span>
              <span className="max-w-[9rem] truncate">{place.name}</span>
              {dist && <span className="text-ink-muted dark:text-white/50">· {dist}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Asks how to get to the chosen place. Bus → route drawn on the live map + steps;
// car → spoken taxi tip. Both keep the guide line to the target.
function TransportCard({
  origin,
  target,
  onBus,
  onCar,
  onBack,
}: {
  origin: Coords | null;
  target: Target;
  onBus: (steps: BusStep[], legs?: BusLeg[]) => void;
  onCar: () => void;
  onBack: () => void;
}) {
  // Offer "By bus" only if we have a real route: first the live Hamuga API,
  // else Google transit (most UB legs have neither → taxi instead).
  const [bus, setBus] = useState<"checking" | "yes" | "no">("checking");
  const legRef = useRef<google.maps.DirectionsLeg | null>(null);
  const routeRef = useRef<BusRoute | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (origin) {
        try {
          const res = await fetch(
            `/api/transit?oLat=${origin.latitude}&oLng=${origin.longitude}&dLat=${target.latitude}&dLng=${target.longitude}`,
          );
          const live: BusRoute | null = res.ok ? await res.json() : null;
          if (cancelled) return;
          if (live) {
            routeRef.current = live;
            return setBus("yes");
          }
        } catch {
          /* fall through to Google below */
        }
      }
      if (!origin || !GOOGLE_MAPS_KEY) return setBus("no");
      try {
        const google = await loadGoogleMaps(GOOGLE_MAPS_KEY);
        if (cancelled) return;
        new google.maps.DirectionsService().route(
          {
            origin: { lat: origin.latitude, lng: origin.longitude },
            destination: { lat: target.latitude, lng: target.longitude },
            travelMode: google.maps.TravelMode.TRANSIT,
          },
          (res: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
            if (cancelled) return;
            const leg = res?.routes?.[0]?.legs?.[0];
            // Google often returns a walking-only "route" when it has no bus data
            // (common in UB) — only count it as a bus if there's a real transit step.
            const hasBus = !!leg?.steps?.some(
              (s) => s.travel_mode === google.maps.TravelMode.TRANSIT,
            );
            legRef.current = status === "OK" && hasBus && leg ? leg : null;
            setBus(legRef.current ? "yes" : "no");
          },
        );
      } catch {
        if (!cancelled) setBus("no");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [origin, target.latitude, target.longitude]);

  const primary =
    "flex w-full items-center justify-center gap-2 rounded-full bg-primary-600 py-2.5 text-sm font-bold text-white";
  const secondary =
    "flex w-full items-center justify-center gap-2 rounded-full bg-ink/5 py-2.5 text-sm font-bold text-ink hover:bg-ink/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15";

  return (
    <div className="pointer-events-auto animate-rise mt-3 rounded-3xl bg-white p-3 shadow-sm dark:bg-white/[0.07] dark:shadow-none">
      <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted dark:text-white/50">
        How do you want to get to {target.name.split(",")[0]}?
      </p>
      <div className="flex flex-col gap-1.5">
        {bus === "checking" && (
          <p className="px-1 pb-1 text-xs font-semibold text-ink-muted dark:text-white/50">
            Checking for buses…
          </p>
        )}
        {bus === "yes" && (
          <button
            onClick={() =>
              routeRef.current
                ? onBus(routeRef.current.steps, routeRef.current.legs)
                : onBus(legRef.current ? parseBusSteps(legRef.current) : [])
            }
            className={primary}
          >
            🚌 By bus
          </button>
        )}
        {bus === "no" && (
          <p className="rounded-xl bg-ink/5 px-3 py-2 text-xs font-semibold text-ink-muted dark:bg-white/10 dark:text-white/60">
            No direct bus here — a taxi is your best option.
          </p>
        )}
        <button onClick={onCar} className={bus === "yes" ? secondary : primary}>
          🚕 By car / taxi
        </button>
        <button
          onClick={onBack}
          className="mt-1 flex w-full items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-ink-muted dark:text-white/50"
        >
          <ChevronLeftIcon size={14} /> Back
        </button>
      </div>
    </div>
  );
}

// The bus route's steps: which bus to board, where to get on/off, walk segments.
function BusPlanCard({ steps, onClose }: { steps: BusStep[]; onClose: () => void }) {
  return (
    <div className="pointer-events-auto animate-rise mt-3 rounded-3xl bg-white p-3 shadow-sm dark:bg-white/[0.07] dark:shadow-none">
      <div className="flex items-center justify-between px-1 pb-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted dark:text-white/50">
          🚌 Your bus route
        </p>
        <button onClick={onClose} className="text-xs font-semibold text-ink-muted dark:text-white/50">
          Hide
        </button>
      </div>
      <ol className="space-y-2.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-0.5 shrink-0 text-base">{s.mode === "transit" ? "🚌" : "🚶"}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink dark:text-white">{s.text}</p>
              {s.sub && <p className="text-xs text-ink-muted dark:text-white/50">{s.sub}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// "Somewhere else" → Michelle asks what the traveller's after; a chip (or just
// talking to her) drives the nearby recommendation.
function IntentCard({
  onPick,
  onBack,
}: {
  onPick: (query: string) => void;
  onBack: () => void;
}) {
  // Phrased to make Michelle look up nearby places immediately (the chat prompt
  // otherwise asks a clarifying question for vague requests → no map markers).
  const options: { emoji: string; label: string; query: string }[] = [
    { emoji: "🍽️", label: "Eat", query: "Show me good places to eat near me right now — list the closest options, don't ask me anything." },
    { emoji: "🏛️", label: "See a sight", query: "Show me sights or museums to visit near me right now — list the closest options, don't ask me anything." },
    { emoji: "☕", label: "Coffee", query: "Show me coffee shops near me right now — list the closest options, don't ask me anything." },
    { emoji: "🌳", label: "Rest", query: "Show me parks or quiet spots to rest near me right now — list the closest options, don't ask me anything." },
  ];
  return (
    <div className="pointer-events-auto animate-rise mt-3 rounded-3xl bg-white p-3 shadow-sm dark:bg-white/[0.07] dark:shadow-none">
      <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted dark:text-white/50">
        What do you feel like?
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((o) => (
          <button
            key={o.label}
            onClick={() => onPick(o.query)}
            className="flex items-center justify-center gap-2 rounded-full bg-ink/5 py-2.5 text-sm font-bold text-ink hover:bg-ink/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            <span className="text-base">{o.emoji}</span> {o.label}
          </button>
        ))}
      </div>
      <p className="px-1 pt-2 text-xs text-ink-muted dark:text-white/50">
        Or just tell Michelle what you’re after.
      </p>
      <button
        onClick={onBack}
        className="mt-1 flex w-full items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-ink-muted dark:text-white/50"
      >
        <ChevronLeftIcon size={14} /> Back
      </button>
    </div>
  );
}

// The looping "what's next?" decision card shown at each stop.
function NextStepCard({
  nextStop,
  stops,
  currentStopId,
  fullPlanOpen,
  onToggleFullPlan,
  onTakeMeThere,
  onSomewhereElse,
  offline = false,
  onPickStop,
  onClose,
}: {
  nextStop: RouteStop | null;
  stops: RouteStop[];
  currentStopId: string | null;
  fullPlanOpen: boolean;
  onToggleFullPlan: () => void;
  onTakeMeThere: () => void;
  onSomewhereElse: () => void;
  offline?: boolean;
  onPickStop: (stop: RouteStop) => void;
  onClose: () => void;
}) {
  const secondary =
    "flex w-full items-center justify-center gap-2 rounded-full bg-ink/5 py-2.5 text-sm font-bold text-ink hover:bg-ink/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15";

  return (
    <div className="pointer-events-auto animate-rise mt-3 rounded-3xl bg-white p-3 shadow-sm dark:bg-white/[0.07] dark:shadow-none">
      <div className="flex items-center justify-between px-1 pb-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted dark:text-white/50">
          {nextStop ? `Next stop: ${nextStop.name}` : "You're at your last stop"}
        </p>
        <button onClick={onClose} className="text-xs font-semibold text-ink-muted dark:text-white/50">
          Hide
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {nextStop && (
          <button
            onClick={onTakeMeThere}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-600 py-2.5 text-sm font-bold text-white"
          >
            Take me there
          </button>
        )}
        {/* "Somewhere else" needs the chat + Places API — hidden offline. */}
        {!offline && (
          <button onClick={onSomewhereElse} className={secondary}>
            Somewhere else
          </button>
        )}
        <button onClick={onToggleFullPlan} className={secondary}>
          {fullPlanOpen ? "Hide full plan" : "View full plan"}
        </button>
      </div>

      {fullPlanOpen && (
        <div className="mt-2 flex flex-col gap-1.5 border-t border-ink/5 pt-2 dark:border-white/10">
          {stops.map((s, i) => (
            <button
              key={s.id}
              onClick={() => onPickStop(s)}
              className="flex items-start gap-2 rounded-xl bg-ink/5 px-3 py-2 text-left hover:bg-ink/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 text-[10px] text-white">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink dark:text-white">
                  {s.name}
                </span>
                {s.context && (
                  <span className="block truncate text-xs text-ink-muted dark:text-white/50">
                    {s.context}
                  </span>
                )}
              </span>
              {s.id === currentStopId && (
                <span className="mt-1 shrink-0 text-xs font-bold text-primary-500">now</span>
              )}
            </button>
          ))}
        </div>
      )}
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
  offline = false,
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
  offline?: boolean;
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
  // Michelle is "busy" whenever she's thinking, preparing, or speaking — the user
  // must pause her before they can talk (otherwise the voices overlap and lag).
  const busy = loading || speaking;

  const status = listening
    ? "listening…"
    : thinking
      ? "thinking…"
      : audioLoading
        ? "preparing…"
        : speaking
          ? "speaking…"
          : isAnswer
            ? "answer"
            : "your guide";

  // Status dot colour — matches the state at a glance.
  const dotColor = listening
    ? "bg-safety-critical"
    : loading
      ? "bg-safety-armed"
      : speaking
        ? "bg-safety-safe"
        : "bg-ink-muted/40 dark:bg-white/30";

  const submit = () => {
    if (!draft.trim()) return;
    onAsk(draft.trim());
    setDraft("");
  };

  return (
    <div className="pointer-events-auto rounded-3xl bg-white p-5 shadow-sm backdrop-blur dark:bg-white/[0.07] dark:shadow-none">
      <div className="flex items-center gap-3">
        <span
          className={[
            "flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white",
            speaking ? "animate-pulse" : "",
          ].join(" ")}
        >
          <SparklesIcon size={18} />
        </span>
        <div className="min-w-0">
          <p className="font-bold">Michelle</p>
          {voiceError ? (
            <p className="text-xs font-semibold text-safety-critical">{voiceError}</p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-ink-muted dark:text-white/60">
              <span className={["h-1.5 w-1.5 rounded-full", dotColor].join(" ")} />
              {status}
            </p>
          )}
        </div>
        {loading ? (
          <span
            className="ml-auto h-5 w-5 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500"
            role="status"
            aria-label="Michelle is preparing"
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
        key={text}
        className={[
          "animate-rise mt-4 text-lg leading-snug",
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

        {/* Ask by text/voice needs the chat backend — disabled offline. */}
        <div
          className={[
            "flex flex-1 items-center gap-2 rounded-full bg-ink/5 px-4 py-2 ring-primary-500/40 transition-shadow focus-within:ring-2 dark:bg-white/10",
            offline ? "opacity-50" : "",
          ].join(" ")}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            disabled={offline}
            placeholder={offline ? "Offline — questions need a connection" : "Ask Michelle…"}
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink-muted disabled:cursor-not-allowed dark:placeholder:text-white/40"
          />
          <button
            onClick={submit}
            disabled={offline}
            aria-label="Send"
            className={
              draft.trim() && !offline
                ? "text-primary-600 dark:text-primary-400"
                : "text-ink-muted dark:text-white/40"
            }
          >
            <SendIcon size={18} />
          </button>
        </div>

        {voiceInSupported && (
          <button
            onClick={onMic}
            disabled={busy || offline}
            aria-label={offline ? "Offline — voice needs a connection" : busy ? "Pause Michelle to talk" : "Talk to Michelle"}
            title={offline ? "Offline — voice needs a connection" : busy ? "Pause Michelle to talk" : "Talk to Michelle"}
            className={[
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors",
              busy || offline
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
// Collapsed by default so Michelle's narration stays the hero.
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
    <div className="pointer-events-auto mb-3 overflow-hidden rounded-2xl bg-ink/[0.04] dark:bg-white/[0.05]">
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
