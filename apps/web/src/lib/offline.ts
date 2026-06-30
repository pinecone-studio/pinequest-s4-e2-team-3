// Offline travel pack (web).
//
// True offline *vector* maps are a native/mobile capability — on web we cache a
// Static Images snapshot of the route plus the narration/phrases, so the journey
// is still viewable with no network. (The route data itself is already bundled.)

import { GOOGLE_MAPS_KEY, hasGoogleMapsKey, loadGoogleMaps } from "@/lib/googlemaps";
import { putAudio } from "@/lib/offlineAudio";
import { boundsForStops, cacheTiles } from "@/lib/offlineTiles";
import { buildRoutePath } from "@/lib/routePath";
import { encodePolyline } from "@/lib/transit";
import type { DemoRoute } from "@/types";

const KEY_PREFIX = "nomad:offline:";
// Bump when the pack shape changes so stale/incomplete packs from older builds
// are ignored and rebuilt (v8: both light+dark tiles cached so night mode works
// offline; v9: client-SDK road-geometry fallback + route-fitted tile zoom range).
const PACK_VERSION = 9;

export interface OfflinePack {
  version: number;
  routeId: string;
  title: string;
  savedAt: number;
  // data: URL of the static map snapshot (fallback if tiles didn't cache).
  image: string | null;
  // Encoded road polyline so the offline map can draw the route line.
  encodedPath: string | null;
  // True once map tiles were cached → render the interactive offline map.
  // (Both light + dark styles are cached, so the offline map follows the theme.)
  tiles: boolean;
  // text = AI narration generated once at save time (falls back to the bundled
  // stop.narration). The matching voice audio lives in IndexedDB (offlineAudio).
  stops: { id: string; name: string; text: string }[];
}

// IndexedDB key for a stop's cached voice audio.
export const audioKey = (routeId: string, stopId: string) => `${routeId}:${stopId}`;

// Road-following geometry through all stops, as Google's encoded polyline — via
// the server Directions endpoint (reliable, and routes rural Mongolian roads too,
// e.g. Mörön→Khatgal). Null only if there's genuinely no route / it fails.
async function roadPolyline(route: DemoRoute): Promise<string | null> {
  if (route.stops.length < 2) return null;
  // First the server endpoint (no SDK needed).
  try {
    const res = await fetch("/api/route-geometry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stops: route.stops.map((s) => ({ lat: s.latitude, lng: s.longitude })),
      }),
    });
    if (res.ok) {
      const { encoded } = (await res.json()) as { encoded: string | null };
      if (encoded) return encoded;
    }
  } catch {
    /* fall through to the client SDK */
  }
  // Fallback: build the SAME road path the live map draws, client-side, then
  // encode it. The Maps key is authorised in-browser even when server-side
  // Directions is referrer-restricted (that denial is what left a straight line).
  if (!hasGoogleMapsKey) return null;
  try {
    const google = await loadGoogleMaps(GOOGLE_MAPS_KEY);
    const path = await buildRoutePath(google, route.stops, 24);
    if (path.length < 2) return null;
    return encodePolyline(path.map((p) => ({ latitude: p.lat, longitude: p.lng })));
  } catch {
    return null;
  }
}

// Build a Google Static Maps API URL showing the whole route + numbered pins.
// `encodedPath` (road geometry) is used when available, else straight lines.
// (Requires "Maps Static API" enabled on the key; otherwise the fetch fails and
// the pack still saves the narration/phrases with no image.)
export function buildStaticMapUrl(
  route: DemoRoute,
  encodedPath?: string | null,
  width = 640,
  height = 420,
): string | null {
  if (!hasGoogleMapsKey) return null;

  const params = new URLSearchParams({
    size: `${width}x${height}`,
    scale: "2",
  });
  // Route line: real road geometry when we have it, else straight stop-to-stop.
  const line = encodedPath
    ? `enc:${encodedPath}`
    : route.stops.map((s) => `${s.latitude},${s.longitude}`).join("|");
  params.append("path", `color:0x2f6bffff|weight:4|${line}`);
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

// AI narration for every stop, in one batched call. Falls back to the bundled
// narration per stop on any failure, so saving never dead-ends.
async function fetchStopTexts(route: DemoRoute): Promise<Record<string, string>> {
  const byId: Record<string, string> = {};
  route.stops.forEach((s) => (byId[s.id] = s.narration)); // defaults
  try {
    const res = await fetch("/api/offline-narration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stops: route.stops.map((s) => ({
          id: s.id, name: s.name, kind: s.kind, context: s.context,
          lat: s.latitude, lng: s.longitude,
        })),
      }),
    });
    if (res.ok) {
      const { texts } = (await res.json()) as { texts?: { id: string; text: string }[] };
      (texts ?? []).forEach((t) => {
        if (t.text?.trim()) byId[t.id] = t.text.trim();
      });
    }
  } catch {
    /* keep the bundled-narration defaults */
  }
  return byId;
}

// Download + cache the pack for a route: interactive map tiles, a static snapshot
// fallback, AI narration text, and each stop's voice audio. Works even with no
// map key / no AI/TTS (falls back gracefully). onProgress reports overall
// progress (tiles then audio) so the UI can show "i/N".
export async function savePack(
  route: DemoRoute,
  onProgress?: (done: number, total: number) => void,
): Promise<OfflinePack> {
  const encodedPath = await roadPolyline(route); // road-following where possible
  const staticUrl = buildStaticMapUrl(route, encodedPath);
  const image = staticUrl ? await urlToDataUrl(staticUrl) : null;
  const texts = await fetchStopTexts(route);

  const stopsN = route.stops.length;

  // Phase 1: interactive map tiles (the bulk of the work — both light+dark).
  let tilesTotal = 0;
  const tilesCached = await cacheTiles(boundsForStops(route.stops), (done, total) => {
    tilesTotal = total;
    onProgress?.(done, total + stopsN);
  });

  // Phase 2: per-stop voice audio.
  for (let i = 0; i < route.stops.length; i++) {
    const s = route.stops[i];
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: texts[s.id], lang: "en" }),
      });
      if (res.ok) await putAudio(audioKey(route.id, s.id), await res.blob());
    } catch {
      /* this stop just won't have offline audio */
    }
    onProgress?.(tilesTotal + i + 1, tilesTotal + stopsN);
  }

  const pack: OfflinePack = {
    version: PACK_VERSION,
    routeId: route.id,
    title: route.title,
    savedAt: Date.now(),
    image,
    encodedPath,
    tiles: tilesCached > 0,
    stops: route.stops.map((s) => ({ id: s.id, name: s.name, text: texts[s.id] })),
  };

  try {
    localStorage.setItem(KEY_PREFIX + route.id, JSON.stringify(pack));
  } catch {
    // Storage full / unavailable — pack just won't persist.
  }
  return pack;
}

// Returns the saved pack, or null if absent or from an older shape/version
// (so callers rebuild it rather than rendering an incomplete pack).
export function loadPack(routeId: string): OfflinePack | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + routeId);
    if (!raw) return null;
    const pack = JSON.parse(raw) as OfflinePack;
    return pack.version === PACK_VERSION ? pack : null;
  } catch {
    return null;
  }
}

export function hasPack(routeId: string): boolean {
  return loadPack(routeId) !== null;
}
