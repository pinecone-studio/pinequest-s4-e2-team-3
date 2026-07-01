"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { boundsForStops, getTile, tileUrl, zoomRange, type TileStyle } from "@/lib/offlineTiles";
import { decodePolyline, type BusLeg } from "@/lib/transit";
import { haversineMeters } from "@/lib/geo";
import type { Coords, RouteStop } from "@/types";

// Offline has no Directions API, so a "take me there" line can only follow the
// plan's CACHED road geometry (saved when online) — which covers the route between
// stops, not arbitrary ground. So we split the guide into two honest parts:
//   • road  — the slice of the cached route polyline the traveller will actually
//              walk/drive (between the points nearest them and nearest the target),
//   • gap   — the straight hop from their real position to where they join that
//              route. Offline we genuinely can't route this bit, so the UI draws it
//              dashed rather than pretending it's a road. On/near the route the gap
//              is ~0 and it's all road; far off (e.g. an inaccurate desktop fix) the
//              dashed gap is honest instead of a solid wrong line.
function roadSegment(
  encoded: string | null,
  start: Coords,
  end: Coords,
): { gap: [number, number][]; road: [number, number][] } {
  const s: [number, number] = [start.latitude, start.longitude];
  const e: [number, number] = [end.latitude, end.longitude];
  if (!encoded) return { gap: [s, e], road: [] };
  const path = decodePolyline(encoded);
  if (path.length < 2) return { gap: [s, e], road: [] };

  const nearest = (c: Coords) => {
    let best = 0;
    let bestD = Infinity;
    path.forEach((p, i) => {
      const d = haversineMeters(c, p);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };

  let a = nearest(start);
  let b = nearest(end);
  if (a > b) [a, b] = [b, a];
  const road = path.slice(a, b + 1).map((p) => [p.latitude, p.longitude] as [number, number]);
  // Straight hop from the traveller to where they join the cached route. The road
  // slice already ends at the point nearest the target (a plan stop on the route).
  const join = road[0] ?? e;
  return { gap: [s, join], road };
}

// Interactive offline map: renders cached CartoDB tiles from IndexedDB (with a
// live network fallback), so the traveller can zoom/pan and see their live GPS
// position with no connection. Both light + dark tiles are cached, so it follows
// the app theme (night mode works offline). Vector circle markers only — no image
// assets, which sidesteps Leaflet's default-icon bundler issue.
export default function OfflineMap({
  stops,
  encodedPath,
  approachPath = null,
  position,
  theme,
  targetStop = null,
  returnTarget = null,
  returnMode = "drive",
  busLegs = null,
}: {
  stops: RouteStop[];
  encodedPath: string | null;
  // Cached road route from the download-time position to the first stop — used for
  // the approach connector so it follows roads offline, not a straight line.
  approachPath?: string | null;
  position: Coords | null;
  theme: "dark" | "light";
  // The stop the traveller is heading to now — an automatic guide line is drawn to
  // it (following the cached road), mirroring the online map's approach line, so the
  // offline map isn't empty before "take me there" is tapped.
  targetStop?: { latitude: number; longitude: number; arrivalRadius?: number } | null;
  // The recommended detour: a guide line from here to returnTarget (drive/walk/
  // transit), or a real bus route (busLegs). Drawn as a Leaflet overlay so the
  // offline map matches the online one.
  returnTarget?: Coords | null;
  returnMode?: "drive" | "transit" | "walk";
  busLegs?: BusLeg[] | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const posRef = useRef<Leaflet.CircleMarker | null>(null);
  const layerRef = useRef<Leaflet.GridLayer | null>(null);
  const overlayRef = useRef<Leaflet.LayerGroup | null>(null);
  // Current position read live by the detour effect without re-running on every
  // GPS tick (the guide line is drawn once per recommendation, not per step).
  const positionRef = useRef(position);
  positionRef.current = position;
  // Rounded to ~100m so the guide overlay redraws as the traveller moves toward the
  // stop, but not on every GPS tick.
  const posLat100 = position ? Math.round(position.latitude * 1000) / 1000 : null;
  const posLng100 = position ? Math.round(position.longitude * 1000) / 1000 : null;
  // Flips true once the (async-built) Leaflet map exists, so the guide-overlay
  // effect below re-runs and draws even when the position is static — otherwise it
  // ran once before the map was ready, bailed, and never redrew.
  const [mapReady, setMapReady] = useState(false);
  // Current tile style, read live by createTile so a theme change + redraw swaps
  // the tiles without rebuilding the map.
  const styleRef = useRef<TileStyle>(theme === "dark" ? "dark" : "voyager");
  styleRef.current = theme === "dark" ? "dark" : "voyager";

  // Build the map once.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      // Match the map's zoom limits to the range that was actually cached for
      // this route, so the traveller can zoom out to the whole-route overview
      // without hitting blank tiles (and can't zoom past the cached detail).
      const { min: minZoom, max: maxZoom } = stops.length
        ? zoomRange(boundsForStops(stops))
        : { min: 10, max: 16 };

      // No on-map zoom buttons (they'd collide with the app's top bar) — pinch,
      // scroll and double-tap still zoom.
      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        minZoom,
        maxZoom,
      });
      mapRef.current = map;

      // Tile layer backed by the IndexedDB cache (falls back to the network when
      // online and a tile wasn't cached). Reads styleRef so it follows the theme.
      const Offline = L.GridLayer.extend({
        createTile(coords: Leaflet.Coords, done: Leaflet.DoneCallback) {
          const img = document.createElement("img");
          img.width = img.height = 256;
          const style = styleRef.current;
          getTile(style, coords.z, coords.x, coords.y)
            .then((blob) => {
              if (blob) img.src = URL.createObjectURL(blob);
              else if (navigator.onLine) img.src = tileUrl(style, coords.z, coords.x, coords.y);
              done(undefined, img);
            })
            .catch(() => done(undefined, img));
          return img;
        },
      }) as unknown as new (opts?: Leaflet.GridLayerOptions) => Leaflet.GridLayer;

      const layer = new Offline({ minZoom, maxZoom, tileSize: 256 });
      layerRef.current = layer;
      // Free the blob URL once Leaflet drops the tile.
      layer.on("tileunload", (e: Leaflet.TileEvent) => {
        const src = (e.tile as HTMLImageElement).src;
        if (src.startsWith("blob:")) URL.revokeObjectURL(src);
      });
      layer.addTo(map);

      // Route line — road geometry when we have it, else straight through stops
      // (so the line never disappears). White casing under blue reads on any tiles.
      const pts: [number, number][] = encodedPath
        ? decodePolyline(encodedPath).map((p) => [p.latitude, p.longitude])
        : stops.map((s) => [s.latitude, s.longitude]);
      if (pts.length > 1) {
        L.polyline(pts, { color: "#ffffff", weight: 8, opacity: 0.9 }).addTo(map);
        L.polyline(pts, { color: "#2f6bff", weight: 4, opacity: 1 }).addTo(map);
      }

      // Stop markers (lettered tooltip).
      stops.forEach((s, i) => {
        L.circleMarker([s.latitude, s.longitude], {
          radius: 7,
          color: "#ffffff",
          weight: 2,
          fillColor: "#2f6bff",
          fillOpacity: 1,
        })
          .bindTooltip(`${String.fromCharCode(65 + (i % 26))} · ${s.name}`)
          .addTo(map);
      });

      // Live position marker (updated by the effect below).
      if (position) {
        posRef.current = L.circleMarker([position.latitude, position.longitude], {
          radius: 8,
          color: "#ffffff",
          weight: 3,
          fillColor: "#1F9D6B",
          fillOpacity: 1,
        }).addTo(map);
      }

      // Fit to the route.
      const all = stops.map((s) => [s.latitude, s.longitude] as [number, number]);
      if (all.length === 1) map.setView(all[0], 14);
      else if (all.length > 1) map.fitBounds(all, { padding: [40, 40] });

      if (!cancelled) setMapReady(true); // map exists → let the overlay effect draw
    })();

    return () => {
      cancelled = true;
      setMapReady(false);
      mapRef.current?.remove();
      mapRef.current = null;
      posRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme toggle → redraw the tile layer so it swaps to the cached light/dark
  // tiles (works offline since both styles are cached).
  useEffect(() => {
    layerRef.current?.redraw();
  }, [theme]);

  // Guide overlay: a real bus route (busLegs), a "take me there" line to
  // returnTarget (+ red marker), or — with neither — an automatic approach line to
  // the current target stop, so the offline map shows the way to the next stop just
  // like the online one. Redrawn when the recommendation changes or the traveller
  // moves ~100m (posLat100/posLng100), not on every GPS tick.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (!mapRef.current) return;
      overlayRef.current?.remove();
      const hasBus = !!(busLegs && busLegs.length);
      if (!returnTarget && !hasBus && !targetStop) {
        overlayRef.current = null;
        return;
      }
      const group = L.layerGroup().addTo(map);
      overlayRef.current = group;

      if (busLegs && busLegs.length) {
        // Walk legs dashed grey, bus legs solid green (mirrors the online map).
        busLegs.forEach((leg) => {
          if (leg.pts.length < 2) return;
          const line = leg.pts.map((p) => [p.latitude, p.longitude] as [number, number]);
          L.polyline(
            line,
            leg.mode === "walk"
              ? { color: "#64748b", weight: 4, opacity: 0.9, dashArray: "2 8" }
              : { color: "#10B981", weight: 5, opacity: 1 },
          ).addTo(group);
        });
      } else if (returnTarget) {
        const start = positionRef.current;
        const color =
          returnMode === "transit" ? "#10B981" : returnMode === "walk" ? "#4F46E5" : "#3B82F6";
        if (start) {
          // Cached road part solid (or dashed for walking); the off-route hop from
          // the traveller to the route drawn dashed — offline can't route that bit.
          // To the first stop, prefer the cached approach geometry.
          const first = stops[0];
          const toFirst =
            !!first && returnTarget.latitude === first.latitude && returnTarget.longitude === first.longitude;
          const geom = toFirst && approachPath ? approachPath : encodedPath;
          const { gap, road } = roadSegment(geom, start, returnTarget);
          const solid = { color, weight: 4, opacity: 0.95 };
          const dashed = { color, weight: 4, opacity: 0.85, dashArray: "2 8" };
          if (road.length > 1) L.polyline(road, returnMode === "walk" ? dashed : solid).addTo(group);
          if (gap.length > 1) L.polyline(gap, dashed).addTo(group);
        }
      } else if (targetStop) {
        // Automatic approach to the current target stop (violet, matching the online
        // map). Follows the cached road; the off-route hop is dashed. Hidden once
        // within the stop's arrival radius (they're basically there).
        const start = positionRef.current;
        const away = start && haversineMeters(start, targetStop) > (targetStop.arrivalRadius ?? 150);
        if (start && away) {
          // Heading to the very first stop → follow the road cached from the
          // download-time position (best offline approximation); later stops use the
          // inter-stop route geometry.
          const first = stops[0];
          const toFirst =
            !!first && targetStop.latitude === first.latitude && targetStop.longitude === first.longitude;
          const geom = toFirst && approachPath ? approachPath : encodedPath;
          const { gap, road } = roadSegment(geom, start, targetStop);
          const solid = { color: "#7C3AED", weight: 4, opacity: 0.95 };
          const dashed = { color: "#7C3AED", weight: 4, opacity: 0.85, dashArray: "2 8" };
          if (road.length > 1) L.polyline(road, solid).addTo(group);
          if (gap.length > 1) L.polyline(gap, dashed).addTo(group);
        }
      }

      if (returnTarget) {
        L.circleMarker([returnTarget.latitude, returnTarget.longitude], {
          radius: 7,
          color: "#ffffff",
          weight: 2,
          fillColor: "#EF4444",
          fillOpacity: 1,
        }).addTo(group);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    returnTarget?.latitude,
    returnTarget?.longitude,
    returnMode,
    busLegs,
    encodedPath,
    approachPath,
    targetStop?.latitude,
    targetStop?.longitude,
    posLat100,
    posLng100,
    mapReady,
  ]);

  // Move the live-position marker as GPS updates (without recentering the map,
  // so the traveller stays in control of pan/zoom).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (posRef.current) posRef.current.setLatLng([position.latitude, position.longitude]);
      else
        posRef.current = L.circleMarker([position.latitude, position.longitude], {
          radius: 8,
          color: "#ffffff",
          weight: 3,
          fillColor: "#1F9D6B",
          fillOpacity: 1,
        }).addTo(map);
    })();
  }, [position?.latitude, position?.longitude]);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}
