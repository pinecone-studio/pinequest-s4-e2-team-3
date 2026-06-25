"use client";

import { useEffect, useMemo } from "react";
import {
  APIProvider,
  Map,
  Marker,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { GOOGLE_MAPS_KEY, DARK_MAP_STYLES, LIGHT_MAP_STYLES } from "@/lib/googlemaps";
import type { Coords, DemoRoute } from "@/types";

// Interactive Google map for the Live Guide: draws the journey route line,
// numbered stop markers, and the traveller's current position. Rendered only
// when a key exists (gated by the caller) and lazily (ssr: false).
export default function RouteMap({
  route,
  currentIndex,
  position,
  onError,
  theme = "dark",
}: {
  route: DemoRoute;
  currentIndex: number;
  position: Coords | null;
  // Fired if the map can't load (e.g. an invalid/blocked key) so the caller can
  // fall back to the stylised backdrop instead of showing a blank area.
  onError?: () => void;
  theme?: "dark" | "light";
}) {
  const path = useMemo(
    () => route.stops.map((s) => ({ lat: s.latitude, lng: s.longitude })),
    [route],
  );

  return (
    <APIProvider apiKey={GOOGLE_MAPS_KEY}>
      <LoadGuard onError={onError} />
      <Map
        defaultCenter={path[0]}
        defaultZoom={5}
        styles={theme === "light" ? LIGHT_MAP_STYLES : DARK_MAP_STYLES}
        disableDefaultUI
        zoomControl
        gestureHandling="greedy"
        clickableIcons={false}
        style={{ width: "100%", height: "100%" }}
      >
        <RouteLine path={path} />
        <FitBounds path={path} />

        {route.stops.map((stop, i) => (
          <StopMarker
            key={stop.id}
            lat={stop.latitude}
            lng={stop.longitude}
            label={i + 1}
            state={i === currentIndex ? "current" : i < currentIndex ? "past" : "upcoming"}
          />
        ))}

        {position && (
          <PositionMarker lat={position.latitude} lng={position.longitude} />
        )}
      </Map>
    </APIProvider>
  );
}

// Surfaces auth/load failures (e.g. invalid key) to the caller.
function LoadGuard({ onError }: { onError?: () => void }) {
  const status = useApiLoadingStatus();
  useEffect(() => {
    if (status === "AUTH_FAILURE" || status === "FAILED") onError?.();
  }, [status, onError]);
  return null;
}

// The route line, drawn imperatively (no declarative Polyline component).
//
// For each leg (stop → next stop) we ask the Directions API for the real road
// path so the line hugs streets instead of cutting straight across the map. Any
// leg the Directions API can't route — e.g. the long rural/Gobi legs across open
// steppe with no mapped roads — falls back to a straight geodesic line, so the
// route is always drawn end-to-end. (Requires "Directions API" on the key; if
// it's disabled, every leg simply falls back to the straight line.)
function RouteLine({ path }: { path: google.maps.LatLngLiteral[] }) {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const routesLib = useMapsLibrary("routes");

  useEffect(() => {
    if (!map || !mapsLib || path.length < 2) return;

    const polylines: google.maps.Polyline[] = [];
    let cancelled = false;

    const draw = (
      pts: google.maps.LatLngLiteral[] | google.maps.LatLng[],
      geodesic: boolean,
    ) => {
      if (cancelled) return;
      polylines.push(
        new mapsLib.Polyline({
          path: pts,
          geodesic,
          strokeColor: "#2f6bff",
          strokeOpacity: 0.9,
          strokeWeight: 4,
          map,
        }),
      );
    };

    const cleanup = () => {
      cancelled = true;
      polylines.forEach((l) => l.setMap(null));
    };

    // No routes library (not loaded yet / unavailable) → straight overview line.
    if (!routesLib) {
      draw(path, true);
      return cleanup;
    }

    const service = new routesLib.DirectionsService();

    (async () => {
      for (let i = 0; i < path.length - 1 && !cancelled; i++) {
        const origin = path[i];
        const destination = path[i + 1];
        try {
          const result = await service.route({
            origin,
            destination,
            travelMode: google.maps.TravelMode.DRIVING,
          });
          const road = result.routes[0]?.overview_path;
          if (road?.length) draw(road, false);
          else draw([origin, destination], true);
        } catch {
          // No route available for this leg — fall back to a straight line.
          draw([origin, destination], true);
        }
      }
    })();

    return cleanup;
  }, [map, mapsLib, routesLib, path]);

  return null;
}

// Fit the whole route into view once the map and geometry are ready.
function FitBounds({ path }: { path: google.maps.LatLngLiteral[] }) {
  const map = useMap();
  const coreLib = useMapsLibrary("core");

  useEffect(() => {
    if (!map || !coreLib || path.length === 0) return;
    const bounds = new coreLib.LatLngBounds();
    path.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 60);
  }, [map, coreLib, path]);

  return null;
}

type StopState = "current" | "past" | "upcoming";

function stopPinSvg(label: number, state: StopState): string {
  const fill = state === "current" ? "#2f6bff" : state === "past" ? "#1F9D6B" : "#ffffff";
  const text = state === "upcoming" ? "#14213d" : "#ffffff";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><circle cx="14" cy="14" r="11" fill="${fill}" stroke="#0d1422" stroke-width="2"/><text x="14" y="18" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="${text}">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function StopMarker({
  lat,
  lng,
  label,
  state,
}: {
  lat: number;
  lng: number;
  label: number;
  state: StopState;
}) {
  const coreLib = useMapsLibrary("core");
  const icon = useMemo(() => {
    if (!coreLib) return undefined;
    return {
      url: stopPinSvg(label, state),
      scaledSize: new coreLib.Size(28, 28),
      anchor: new coreLib.Point(14, 14),
    };
  }, [coreLib, label, state]);

  if (!icon) return null;
  return <Marker position={{ lat, lng }} icon={icon} />;
}

function PositionMarker({ lat, lng }: { lat: number; lng: number }) {
  const coreLib = useMapsLibrary("core");
  const icon = useMemo(() => {
    if (!coreLib) return undefined;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34"><circle cx="17" cy="17" r="16" fill="#2f6bff" fill-opacity="0.2"/><circle cx="17" cy="17" r="7" fill="#2f6bff" stroke="#ffffff" stroke-width="2.5"/></svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new coreLib.Size(34, 34),
      anchor: new coreLib.Point(17, 17),
    };
  }, [coreLib]);

  if (!icon) return null;
  return <Marker position={{ lat, lng }} icon={icon} zIndex={10} />;
}
