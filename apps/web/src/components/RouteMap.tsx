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
import type { Coords, DemoRoute, PlaceOption } from "@/types";

// Interactive Google map for the Live Guide: draws the journey route line,
// numbered stop markers, and the traveller's current position. Rendered only
// when a key exists (gated by the caller) and lazily (ssr: false).
export default function RouteMap({
  route,
  currentIndex,
  position,
  onError,
  theme = "dark",
  suggestions = [],
  selectedPlace = null,
  returnTarget = null,
}: {
  route: DemoRoute;
  currentIndex: number;
  position: Coords | null;
  // Fired if the map can't load (e.g. an invalid/blocked key) so the caller can
  // fall back to the stylised backdrop instead of showing a blank area.
  onError?: () => void;
  theme?: "dark" | "light";
  // Places Michelle suggested + the one the traveller picked (routes to it).
  suggestions?: PlaceOption[];
  selectedPlace?: PlaceOption | null;
  // After a detour: guide line from here back to the next stop (blue).
  returnTarget?: Coords | null;
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
        {/* Fit to the whole journey, unless we're routing to a pick / back to plan. */}
        {selectedPlace || returnTarget ? null : <FitBounds path={path} />}

        {route.stops.map((stop, i) => (
          <StopMarker
            key={stop.id}
            lat={stop.latitude}
            lng={stop.longitude}
            label={i + 1}
            state={i === currentIndex ? "current" : i < currentIndex ? "past" : "upcoming"}
          />
        ))}

        {/* Suggested places (food / bus stops) as tappable-looking markers. */}
        {suggestions.map((p) => (
          <SuggestionMarker
            key={p.id}
            place={p}
            selected={selectedPlace?.id === p.id}
          />
        ))}

        {/* When a place is picked, draw a road route from here to it + zoom in. */}
        {selectedPlace && (
          <DetourLine origin={position} destination={selectedPlace} />
        )}

        {/* After a detour: blue guide line from here back to the next stop. */}
        {!selectedPlace && returnTarget && (
          <DetourLine origin={position} destination={returnTarget} color="#2f6bff" />
        )}

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

// Draws a road-following polyline through `points` onto the map, in `color`.
// For each leg we ask the Directions API for the real street path and fall back
// to a straight geodesic line when it can't route (e.g. the long rural/Gobi legs
// with no mapped roads). Returns the polylines so the caller can remove them.
// (Requires "Directions API" on the key; if disabled, every leg is straight.)
async function drawRoadPath(
  map: google.maps.Map,
  mapsLib: google.maps.MapsLibrary,
  routesLib: google.maps.RoutesLibrary | null,
  points: google.maps.LatLngLiteral[],
  color: string,
  isCancelled: () => boolean,
): Promise<google.maps.Polyline[]> {
  const polylines: google.maps.Polyline[] = [];
  const draw = (
    pts: google.maps.LatLngLiteral[] | google.maps.LatLng[],
    geodesic: boolean,
  ) => {
    if (isCancelled()) return;
    polylines.push(
      new mapsLib.Polyline({
        path: pts,
        geodesic,
        strokeColor: color,
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map,
      }),
    );
  };

  if (!routesLib || points.length < 2) {
    draw(points, true);
    return polylines;
  }

  const service = new routesLib.DirectionsService();
  for (let i = 0; i < points.length - 1 && !isCancelled(); i++) {
    const origin = points[i];
    const destination = points[i + 1];
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
      draw([origin, destination], true);
    }
  }
  return polylines;
}

// The main journey line (stop → stop).
function RouteLine({ path }: { path: google.maps.LatLngLiteral[] }) {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const routesLib = useMapsLibrary("routes");

  useEffect(() => {
    if (!map || !mapsLib || path.length < 2) return;
    let cancelled = false;
    let drawn: google.maps.Polyline[] = [];
    drawRoadPath(map, mapsLib, routesLib, path, "#2f6bff", () => cancelled).then(
      (p) => {
        if (cancelled) p.forEach((l) => l.setMap(null));
        else drawn = p;
      },
    );
    return () => {
      cancelled = true;
      drawn.forEach((l) => l.setMap(null));
    };
  }, [map, mapsLib, routesLib, path]);

  return null;
}

// A detour route from the traveller's current position to the place they picked,
// drawn in amber so it stands out from the journey, with the map zoomed to fit.
// Recomputes only when the destination changes (not on every GPS tick).
function DetourLine({
  origin,
  destination,
  color = "#D9831F",
}: {
  origin: Coords | null;
  destination: { latitude: number; longitude: number };
  color?: string;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const routesLib = useMapsLibrary("routes");
  const coreLib = useMapsLibrary("core");

  useEffect(() => {
    if (!map || !mapsLib) return;
    const dest = { lat: destination.latitude, lng: destination.longitude };
    const points = origin
      ? [{ lat: origin.latitude, lng: origin.longitude }, dest]
      : [dest];

    let cancelled = false;
    let drawn: google.maps.Polyline[] = [];
    drawRoadPath(map, mapsLib, routesLib, points, color, () => cancelled).then(
      (p) => {
        if (cancelled) p.forEach((l) => l.setMap(null));
        else drawn = p;
      },
    );

    if (coreLib && origin) {
      const bounds = new coreLib.LatLngBounds();
      points.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, 80);
    } else {
      map.panTo(dest);
      map.setZoom(15);
    }

    return () => {
      cancelled = true;
      drawn.forEach((l) => l.setMap(null));
    };
    // Intentionally keyed on the destination only — we don't want to redraw the
    // detour (and re-hit Directions) on every position update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mapsLib, routesLib, coreLib, destination.latitude, destination.longitude, color]);

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

// A marker for a place Michelle suggested. Green for transit (bus stops), amber for
// everything else; the picked one is larger with a thicker ring.
function suggestionPinSvg(place: PlaceOption, selected: boolean): string {
  const fill = place.kind === "transit" ? "#1F9D6B" : "#D9831F";
  const size = selected ? 32 : 24;
  const c = size / 2;
  const r = selected ? 12 : 9;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${c}" cy="${c}" r="${r}" fill="${fill}" stroke="#ffffff" stroke-width="${selected ? 3 : 2}"/><circle cx="${c}" cy="${c}" r="3" fill="#ffffff"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function SuggestionMarker({
  place,
  selected,
}: {
  place: PlaceOption;
  selected: boolean;
}) {
  const coreLib = useMapsLibrary("core");
  const icon = useMemo(() => {
    if (!coreLib) return undefined;
    const size = selected ? 32 : 24;
    return {
      url: suggestionPinSvg(place, selected),
      scaledSize: new coreLib.Size(size, size),
      anchor: new coreLib.Point(size / 2, size / 2),
    };
  }, [coreLib, place, selected]);

  if (!icon) return null;
  return (
    <Marker
      position={{ lat: place.latitude, lng: place.longitude }}
      icon={icon}
      title={place.name}
      zIndex={selected ? 20 : 5}
    />
  );
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
