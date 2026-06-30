"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { hasGoogleMapsKey } from "@/lib/googlemaps";
import { loadPack } from "@/lib/offline";
import { resolvePosition } from "@/lib/position";
import { useLiveStore } from "@/stores/liveStore";
import { useLocationStore } from "@/stores/locationStore";
import { useOnlineStatus } from "@/context/OnlineStatus";
import type { Coords } from "@/types";
import type { Theme } from "../types";
import { MapBackdrop } from "./MapBackdrop";

// Loaded lazily + client-only because the Google Maps SDK touches `window`.
const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });
const OfflineMap = dynamic(() => import("@/components/OfflineMap"), { ssr: false });

// Decides what fills the screen behind the guide UI:
//   real Mapbox route map → cached static snapshot (offline) → stylised backdrop.
export function LiveBackground({ theme }: { theme: Theme }) {
  const { activeRoute, currentStopIndex, simulatedCoords, forceOffline, suggestions, selectedPlace, returnTarget, returnMode, busLegs, mapType } =
    useLiveStore();
  const realCoords = useLocationStore((s) => s.coordinates);
  const position: Coords | null = resolvePosition(simulatedCoords, realCoords, activeRoute);

  const { online } = useOnlineStatus();
  const [mapFailed, setMapFailed] = useState(false);

  if (!activeRoute) return <MapBackdrop />;

  const offline = forceOffline || !online;

  // Satellite imagery is dark and busy, so the chrome zones (top bar, cards) need
  // a stronger scrim to keep text readable — in BOTH themes (so the light/dark
  // toggle still works on satellite). Standard map keeps the lighter scrim.
  const satellite = mapType === "hybrid";
  const scrim = satellite
    ? "from-[#eef2fb]/85 via-[#eef2fb]/10 to-[#eef2fb]/95 dark:from-[#0d1422]/85 dark:via-[#0d1422]/10 dark:to-[#0d1422]/95"
    : "from-[#eef2fb]/40 via-transparent to-[#eef2fb]/90 dark:from-[#0d1422]/40 dark:via-transparent dark:to-[#0d1422]/90";

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
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${scrim}`} />
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
