// Offline travel pack (web).
//
// True offline *vector* maps are a native/mobile capability — on web we cache a
// Static Images snapshot of the route plus the narration/phrases, so the journey
// is still viewable with no network. (The route data itself is already bundled.)

import { MAPBOX_TOKEN, STATIC_STYLE_ID, hasMapboxToken } from "@/lib/mapbox";
import type { DemoRoute } from "@/types";

const KEY_PREFIX = "nomad:offline:";

export interface OfflinePack {
  routeId: string;
  title: string;
  savedAt: number;
  // data: URL of the static map snapshot (so it survives offline).
  image: string | null;
  stops: { name: string; narration: string }[];
}

// Build a Mapbox Static Images API URL showing the whole route + numbered pins.
export function buildStaticMapUrl(route: DemoRoute, width = 640, height = 420): string | null {
  if (!hasMapboxToken) return null;

  const line = {
    type: "Feature" as const,
    properties: { stroke: "#2f6bff", "stroke-width": 4 },
    geometry: {
      type: "LineString" as const,
      coordinates: route.stops.map((s) => [s.longitude, s.latitude]),
    },
  };
  const points = route.stops.map((s, i) => ({
    type: "Feature" as const,
    properties: { "marker-color": "#2f6bff", "marker-symbol": String(i + 1) },
    geometry: { type: "Point" as const, coordinates: [s.longitude, s.latitude] },
  }));

  const fc = { type: "FeatureCollection", features: [line, ...points] };
  const overlay = `geojson(${encodeURIComponent(JSON.stringify(fc))})`;

  return (
    `https://api.mapbox.com/styles/v1/mapbox/${STATIC_STYLE_ID}/static/` +
    `${overlay}/auto/${width}x${height}@2x` +
    `?padding=50&access_token=${MAPBOX_TOKEN}`
  );
}

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Download + cache the pack for a route. Works even with no Mapbox token
// (image is simply null — narration/phrases still saved offline).
export async function savePack(route: DemoRoute): Promise<OfflinePack> {
  const staticUrl = buildStaticMapUrl(route);
  const image = staticUrl ? await urlToDataUrl(staticUrl) : null;

  const pack: OfflinePack = {
    routeId: route.id,
    title: route.title,
    savedAt: Date.now(),
    image,
    stops: route.stops.map((s) => ({ name: s.name, narration: s.narration })),
  };

  try {
    localStorage.setItem(KEY_PREFIX + route.id, JSON.stringify(pack));
  } catch {
    // Storage full / unavailable — pack just won't persist.
  }
  return pack;
}

export function loadPack(routeId: string): OfflinePack | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + routeId);
    return raw ? (JSON.parse(raw) as OfflinePack) : null;
  } catch {
    return null;
  }
}

export function hasPack(routeId: string): boolean {
  try {
    return localStorage.getItem(KEY_PREFIX + routeId) !== null;
  } catch {
    return false;
  }
}
