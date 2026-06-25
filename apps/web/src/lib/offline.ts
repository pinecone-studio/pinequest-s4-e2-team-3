// Offline travel pack (web).
//
// True offline *vector* maps are a native/mobile capability — on web we cache a
// Static Images snapshot of the route plus the narration/phrases, so the journey
// is still viewable with no network. (The route data itself is already bundled.)

import { GOOGLE_MAPS_KEY, hasGoogleMapsKey } from "@/lib/googlemaps";
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

// Build a Google Static Maps API URL showing the whole route + numbered pins.
// (Requires "Maps Static API" enabled on the key; otherwise the fetch fails and
// the pack still saves the narration/phrases with no image.)
export function buildStaticMapUrl(route: DemoRoute, width = 640, height = 420): string | null {
  if (!hasGoogleMapsKey) return null;

  const points = route.stops.map((s) => `${s.latitude},${s.longitude}`);

  const params = new URLSearchParams({
    size: `${width}x${height}`,
    scale: "2",
  });
  // Route line through all stops.
  params.append("path", `color:0x2f6bffff|weight:4|${points.join("|")}`);
  // A numbered/labelled blue pin per stop (labels A–Z; Static API caps labels at
  // a single char, so we use the stop index letter for compactness).
  route.stops.forEach((s, i) => {
    const labelChar = String.fromCharCode(65 + (i % 26)); // A, B, C…
    params.append("markers", `color:0x2f6bff|label:${labelChar}|${s.latitude},${s.longitude}`);
  });
  params.append("key", GOOGLE_MAPS_KEY);

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
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
