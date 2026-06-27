"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { BusLeg } from "@/lib/transit";

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
  returnMode = "drive",
  busLegs = null,
  mapType = "roadmap",
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
  // Draw that line as a solid road (drive/taxi), dashed road (walk), or transit.
  returnMode?: "drive" | "transit" | "walk";
  // Real bus route legs (overrides Google transit when present).
  busLegs?: BusLeg[] | null;
  // Base map layer: standard roads vs satellite imagery.
  mapType?: "roadmap" | "hybrid";
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
        mapTypeId={mapType}
        styles={mapType === "roadmap" ? (theme === "light" ? LIGHT_MAP_STYLES : DARK_MAP_STYLES) : undefined}
        disableDefaultUI
        zoomControl
        gestureHandling="greedy"
        clickableIcons={false}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Show the full plan line only when not heading to a specific target —
            otherwise just the current→target leg (DetourLine below) is drawn. */}
        {!selectedPlace && !returnTarget && <RouteLine path={path} />}
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
        {suggestions.map((p, i) => (
          <SuggestionMarker
            key={p.id}
            place={p}
            index={i}
            selected={selectedPlace?.id === p.id}
          />
        ))}

        {/* When a place is picked, draw a road route from here to it + zoom in. */}
        {selectedPlace && (
          <DetourLine origin={position} destination={selectedPlace} />
        )}

        {/* Guide line from here to the next stop. Real bus → per-leg polyline +
            stop markers; Google bus → native transit rendering; else road line. */}
        {!selectedPlace && returnTarget && busLegs && busLegs.length > 0 && (
          <BusPathLine legs={busLegs} />
        )}
        {!selectedPlace && returnTarget && !busLegs && returnMode === "transit" && (
          <TransitRenderer origin={position} destination={returnTarget} />
        )}
        {!selectedPlace && returnTarget && !busLegs && returnMode !== "transit" && (
          <DetourLine
            origin={position}
            destination={returnTarget}
            color="#2f6bff"
            walk={returnMode === "walk"}
          />
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
  walk = false,
): Promise<google.maps.Polyline[]> {
  const polylines: google.maps.Polyline[] = [];
  const dashes = [
    { icon: { path: "M 0,-1 0,1", strokeColor: color, strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "12px" },
  ];
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
        strokeOpacity: walk ? 0 : 0.9, // walk = dashed (icons), so no solid stroke
        strokeWeight: walk ? 0 : 4,
        icons: walk ? dashes : undefined,
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
        travelMode: walk ? google.maps.TravelMode.WALKING : google.maps.TravelMode.DRIVING,
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
  walk = false,
}: {
  origin: Coords | null;
  destination: { latitude: number; longitude: number };
  color?: string;
  walk?: boolean;
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
    drawRoadPath(map, mapsLib, routesLib, points, color, () => cancelled, walk).then(
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
  }, [map, mapsLib, routesLib, coreLib, destination.latitude, destination.longitude, color, walk]);

  return <DestMarker lat={destination.latitude} lng={destination.longitude} color={color} />;
}

// A teardrop pin at the place the traveller is heading to.
function DestMarker({ lat, lng, color = "#2f6bff" }: { lat: number; lng: number; color?: string }) {
  const coreLib = useMapsLibrary("core");
  const icon = useMemo(() => {
    if (!coreLib) return undefined;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38"><path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 24 14 24s14-14.5 14-24C28 6.27 21.73 0 14 0z" fill="${color}"/><circle cx="14" cy="14" r="5" fill="#ffffff"/></svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new coreLib.Size(28, 38),
      anchor: new coreLib.Point(14, 38),
    };
  }, [coreLib, color]);
  if (!icon) return null;
  return <Marker position={{ lat, lng }} icon={icon} zIndex={11} />;
}

// "By bus" → render the transit route with Google's own styling (walking dashes,
// coloured bus line, and boarding/alighting stop markers) onto the live map.
function TransitRenderer({
  origin,
  destination,
}: {
  origin: Coords | null;
  destination: { latitude: number; longitude: number };
}) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");

  useEffect(() => {
    if (!map || !routesLib || !origin) return;
    let cancelled = false;
    const renderer = new routesLib.DirectionsRenderer({ map, suppressMarkers: false });
    new routesLib.DirectionsService().route(
      {
        origin: { lat: origin.latitude, lng: origin.longitude },
        destination: { lat: destination.latitude, lng: destination.longitude },
        travelMode: google.maps.TravelMode.TRANSIT,
      },
      (res, status) => {
        if (!cancelled && status === "OK" && res) renderer.setDirections(res);
      },
    );
    return () => {
      cancelled = true;
      renderer.setMap(null);
    };
    // Keyed on destination only — don't re-route on every GPS tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, routesLib, destination.latitude, destination.longitude]);

  return null;
}

// Draws a hand-entered demo bus route: dashed walk segments at the ends, a solid
// green bus segment in the middle, plus boarding/alighting stop markers — so it
// reads like a Google Maps transit route even where Google has no bus data.
// Draws a real multi-leg bus route Google-Maps style: walk legs as grey dashes,
// bus legs as a solid coloured line, with a stop marker where each bus is
// boarded and where the last one is left.
function BusPathLine({ legs }: { legs: BusLeg[] }) {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const coreLib = useMapsLibrary("core");

  const ll = (p: Coords) => ({ lat: p.latitude, lng: p.longitude });

  useEffect(() => {
    if (!map || !mapsLib) return;
    const dashes = [
      { icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "12px" },
    ];
    const drawn: google.maps.Polyline[] = [];
    for (const leg of legs) {
      if (leg.pts.length < 2) continue;
      const isWalk = leg.mode === "walk";
      drawn.push(
        new mapsLib.Polyline({
          path: leg.pts.map(ll),
          geodesic: true,
          strokeColor: isWalk ? "#6b7280" : "#1F9D6B",
          strokeOpacity: isWalk ? 0 : 0.95,
          strokeWeight: isWalk ? 0 : 5,
          icons: isWalk
            ? [{ ...dashes[0], icon: { ...dashes[0].icon, strokeColor: "#6b7280" } }]
            : undefined,
          map,
        }),
      );
    }
    if (coreLib) {
      const bounds = new coreLib.LatLngBounds();
      legs.forEach((leg) => leg.pts.forEach((p) => bounds.extend(ll(p))));
      map.fitBounds(bounds, 80);
    }
    return () => drawn.forEach((l) => l.setMap(null));
  }, [map, mapsLib, coreLib, legs]);

  const busLegs = legs.filter((l) => l.mode === "transit" && l.pts.length);
  const board = busLegs[0]?.pts[0];
  const last = busLegs[busLegs.length - 1]?.pts;
  const alight = last?.[last.length - 1];
  return (
    <>
      {board && <BusStopMarker lat={board.latitude} lng={board.longitude} />}
      {alight && <BusStopMarker lat={alight.latitude} lng={alight.longitude} />}
    </>
  );
}

function BusStopMarker({ lat, lng }: { lat: number; lng: number }) {
  const coreLib = useMapsLibrary("core");
  const icon = useMemo(() => {
    if (!coreLib) return undefined;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"><circle cx="11" cy="11" r="8" fill="#1F9D6B" stroke="#ffffff" stroke-width="2"/><circle cx="11" cy="11" r="3" fill="#ffffff"/></svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new coreLib.Size(22, 22),
      anchor: new coreLib.Point(11, 11),
    };
  }, [coreLib]);
  if (!icon) return null;
  return <Marker position={{ lat, lng }} icon={icon} zIndex={15} />;
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
// Numbered pin so each map marker matches its row in the list (same number +
// kind colour) — that's how the traveller tells which dot is which place.
export const SUGGESTION_COLORS = { transit: "#1F9D6B", place: "#D9831F" } as const;
function suggestionColor(place: PlaceOption): string {
  return place.kind === "transit" ? SUGGESTION_COLORS.transit : SUGGESTION_COLORS.place;
}
function suggestionPinSvg(place: PlaceOption, selected: boolean, label: number): string {
  const fill = suggestionColor(place);
  const size = selected ? 36 : 30;
  const c = size / 2;
  const r = selected ? 15 : 12;
  const font = selected ? 16 : 13;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${c}" cy="${c}" r="${r}" fill="${fill}" stroke="#ffffff" stroke-width="${selected ? 3 : 2}"/><text x="${c}" y="${c}" fill="#ffffff" font-family="Arial, sans-serif" font-size="${font}" font-weight="bold" text-anchor="middle" dominant-baseline="central">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function SuggestionMarker({
  place,
  index,
  selected,
}: {
  place: PlaceOption;
  index: number;
  selected: boolean;
}) {
  const coreLib = useMapsLibrary("core");
  const icon = useMemo(() => {
    if (!coreLib) return undefined;
    const size = selected ? 36 : 30;
    return {
      url: suggestionPinSvg(place, selected, index + 1),
      scaledSize: new coreLib.Size(size, size),
      anchor: new coreLib.Point(size / 2, size / 2),
    };
  }, [coreLib, place, index, selected]);

  if (!icon) return null;
  return (
    <Marker
      position={{ lat: place.latitude, lng: place.longitude }}
      icon={icon}
      title={`${index + 1}. ${place.name}`}
      zIndex={selected ? 20 : 5}
    />
  );
}

// Live compass heading (0=N, 90=E) from the device, or null if unavailable
// (desktop, or iOS before the user grants motion access). ponytail: best-effort
// — when null the dot just shows without a direction cone.
function useHeading(): number | null {
  const [heading, setHeading] = useState<number | null>(null);
  useEffect(() => {
    const onOrient = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
      const h =
        typeof e.webkitCompassHeading === "number"
          ? e.webkitCompassHeading // iOS: already a compass heading
          : e.absolute && e.alpha != null
            ? 360 - e.alpha // others: alpha is counter-clockwise from N
            : null;
      if (h != null) setHeading(h);
    };
    // iOS needs a user gesture to grant orientation access; elsewhere it's free.
    const req = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
      .requestPermission;
    const onTap = () => {
      req?.().catch(() => {});
      window.removeEventListener("pointerdown", onTap);
    };
    if (typeof req === "function") window.addEventListener("pointerdown", onTap);

    window.addEventListener("deviceorientationabsolute", onOrient as EventListener);
    window.addEventListener("deviceorientation", onOrient as EventListener);
    return () => {
      window.removeEventListener("pointerdown", onTap);
      window.removeEventListener("deviceorientationabsolute", onOrient as EventListener);
      window.removeEventListener("deviceorientation", onOrient as EventListener);
    };
  }, []);
  return heading;
}

function PositionMarker({ lat, lng }: { lat: number; lng: number }) {
  const coreLib = useMapsLibrary("core");
  const heading = useHeading();
  const icon = useMemo(() => {
    if (!coreLib) return undefined;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34"><circle cx="17" cy="17" r="16" fill="#2f6bff" fill-opacity="0.2"/><circle cx="17" cy="17" r="7" fill="#2f6bff" stroke="#ffffff" stroke-width="2.5"/></svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new coreLib.Size(34, 34),
      anchor: new coreLib.Point(17, 17),
    };
  }, [coreLib]);

  // A Google-Maps-style beam pointing where the device faces, under the dot.
  const cone = useMemo<google.maps.Symbol | undefined>(() => {
    if (!coreLib || heading == null) return undefined;
    return {
      path: "M 0 0 L -9 -24 L 9 -24 Z",
      fillColor: "#2f6bff",
      fillOpacity: 0.45,
      strokeWeight: 0,
      rotation: heading,
      scale: 1,
      anchor: new coreLib.Point(0, 0),
    };
  }, [coreLib, heading]);

  if (!icon) return null;
  return (
    <>
      {cone && <Marker position={{ lat, lng }} icon={cone} zIndex={9} />}
      <Marker position={{ lat, lng }} icon={icon} zIndex={10} />
    </>
  );
}
