"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { getTile, tileUrl, type TileStyle } from "@/lib/offlineTiles";
import { decodePolyline } from "@/lib/transit";
import type { Coords, RouteStop } from "@/types";

// Interactive offline map: renders OpenStreetMap tiles cached in IndexedDB
// (with a live network fallback), so the traveller can zoom/pan and see their
// live GPS position with no connection. Vector circle markers only — no image
// assets, which sidesteps Leaflet's default-icon bundler issue.
export default function OfflineMap({
  stops,
  encodedPath,
  position,
  tileStyle,
}: {
  stops: RouteStop[];
  encodedPath: string | null;
  position: Coords | null;
  tileStyle: TileStyle;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const posRef = useRef<Leaflet.CircleMarker | null>(null);

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
      // online and a tile wasn't cached).
      const Offline = L.GridLayer.extend({
        createTile(coords: Leaflet.Coords, done: Leaflet.DoneCallback) {
          const img = document.createElement("img");
          img.width = img.height = 256;
          getTile(coords.z, coords.x, coords.y)
            .then((blob) => {
              if (blob) img.src = URL.createObjectURL(blob);
              else if (navigator.onLine) img.src = tileUrl(tileStyle, coords.z, coords.x, coords.y);
              done(undefined, img);
            })
            .catch(() => done(undefined, img));
          return img;
        },
      }) as unknown as new (opts?: Leaflet.GridLayerOptions) => Leaflet.GridLayer;

      const layer = new Offline({ minZoom: 10, maxZoom: 16, tileSize: 256 });
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
