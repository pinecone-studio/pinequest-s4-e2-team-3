"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { getTile, tileUrl, type TileStyle } from "@/lib/offlineTiles";
import { decodePolyline, type BusLeg } from "@/lib/transit";
import type { Coords, RouteStop } from "@/types";

// Interactive offline map: renders cached CartoDB tiles from IndexedDB (with a
// live network fallback), so the traveller can zoom/pan and see their live GPS
// position with no connection. Both light + dark tiles are cached, so it follows
// the app theme (night mode works offline). Vector circle markers only — no image
// assets, which sidesteps Leaflet's default-icon bundler issue.
export default function OfflineMap({
  stops,
  encodedPath,
  position,
  theme,
  returnTarget = null,
  returnMode = "drive",
  busLegs = null,
}: {
  stops: RouteStop[];
  encodedPath: string | null;
  position: Coords | null;
  theme: "dark" | "light";
  // The recommended detour: a guide line from here to returnTarget (drive/walk/
  // transit), or a real bus route (busLegs). Drawn as a Leaflet overlay so the
  // offline map matches the online one. Straight line offline — no road geometry.
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

      // No on-map zoom buttons (they'd collide with the app's top bar) — pinch,
      // scroll and double-tap still zoom.
      const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false });
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

      const layer = new Offline({ minZoom: 10, maxZoom: 16, tileSize: 256 });
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
    })();

    return () => {
      cancelled = true;
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

  // Recommended detour overlay: a real bus route (busLegs) or a straight guide
  // line here → returnTarget, plus a red destination marker. Redrawn only when
  // the recommendation changes, not on every position tick.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (!mapRef.current) return;
      overlayRef.current?.remove();
      if (!returnTarget && !(busLegs && busLegs.length)) {
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
          const line: [number, number][] = [
            [start.latitude, start.longitude],
            [returnTarget.latitude, returnTarget.longitude],
          ];
          L.polyline(
            line,
            returnMode === "walk"
              ? { color, weight: 4, opacity: 0.9, dashArray: "2 8" }
              : { color, weight: 4, opacity: 0.95 },
          ).addTo(group);
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
  }, [returnTarget?.latitude, returnTarget?.longitude, returnMode, busLegs]);

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
