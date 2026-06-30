// Offline raster map tiles (CartoDB) cached in IndexedDB so the offline map is
// fully interactive (zoom / pan / live GPS) — not a flat snapshot. Both light
// (voyager) and dark styles are cached so night mode works offline too.
// ponytail: Carto public tiles are fine at demo scale; for production self-host
// or use a provider that permits caching (their bulk-download policy is strict).

export interface TileBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

const DB_NAME = "nomad-tiles";
const STORE = "tiles";

// CartoDB basemaps — cleaner/nicer than raw OSM, CORS-enabled, no key. Chosen to
// match the app theme (Voyager for light, Dark Matter for night).
export type TileStyle = "voyager" | "dark";
const CARTO_PATH: Record<TileStyle, string> = {
  voyager: "rastertiles/voyager",
  dark: "dark_all",
};
export const tileUrl = (style: TileStyle, z: number, x: number, y: number) =>
  `https://a.basemaps.cartocdn.com/${CARTO_PATH[style]}/${z}/${x}/${y}.png`;

// Keep saves quick + storage modest: cap total tiles and fetch a few at a time.
const MAX_TILES = 250;
const CONCURRENCY = 6;
// Hard zoom limits; the actual cached range is fitted to the route (zoomRange).
const ABS_MIN_ZOOM = 6;
const ABS_MAX_ZOOM = 16;
// Zoom-in levels cached above the route's overview (whole-route) level.
const DETAIL_LEVELS = 5;

const tileKey = (style: TileStyle, z: number, x: number, y: number) => `${style}/${z}/${x}/${y}`;
const ALL_STYLES: TileStyle[] = ["voyager", "dark"];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putTile(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* no IDB / quota — tile just won't cache */
  }
}

export async function getTile(
  style: TileStyle,
  z: number,
  x: number,
  y: number,
): Promise<Blob | null> {
  try {
    const db = await openDb();
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(tileKey(style, z, x, y));
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return blob;
  } catch {
    return null;
  }
}

// Web-Mercator tile coords for a lng/lat at zoom z.
const lngToX = (lng: number, z: number) => Math.floor(((lng + 180) / 360) * 2 ** z);
const latToY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

// Padded lat/lng bounds around a set of stops — shared by the pack saver and the
// offline map so both agree on the area (and zoom range) that was cached.
export function boundsForStops(
  stops: { latitude: number; longitude: number }[],
): TileBounds {
  const lats = stops.map((s) => s.latitude);
  const lngs = stops.map((s) => s.longitude);
  const north = Math.max(...lats);
  const south = Math.min(...lats);
  const east = Math.max(...lngs);
  const west = Math.min(...lngs);
  const padLat = Math.max((north - south) * 0.12, 0.01);
  const padLng = Math.max((east - west) * 0.12, 0.01);
  return { north: north + padLat, south: south - padLat, east: east + padLng, west: west - padLng };
}

// The zoom range fitted to a route: `min` is the level where the whole route fits
// on screen (so you can zoom out to see it all), `max` adds DETAIL_LEVELS for
// zooming in. A city route gets a high min (tight), a cross-country route a low
// one (zoomed way out) — fixing both "can't zoom out" and tiny cached coverage.
export function zoomRange(b: TileBounds): { min: number; max: number } {
  let overview = ABS_MIN_ZOOM;
  for (let z = ABS_MAX_ZOOM; z >= ABS_MIN_ZOOM; z--) {
    const xs = lngToX(b.east, z) - lngToX(b.west, z) + 1;
    const ys = latToY(b.south, z) - latToY(b.north, z) + 1;
    if (xs <= 2 && ys <= 2) {
      overview = z;
      break;
    }
  }
  const min = Math.max(ABS_MIN_ZOOM, overview - 1); // one extra zoom-out level
  return { min, max: Math.min(ABS_MAX_ZOOM, min + DETAIL_LEVELS) };
}

// All tile coords for the bounds across the route-fitted zoom range, stopping
// before the MAX_TILES cap — the overview level always caches (so the whole route
// is visible offline), with as much zoom-in detail as the cap allows on top.
function tilesForBounds(b: TileBounds): { z: number; x: number; y: number }[] {
  const { min, max } = zoomRange(b);
  const jobs: { z: number; x: number; y: number }[] = [];
  for (let z = min; z <= max; z++) {
    const x0 = lngToX(b.west, z);
    const x1 = lngToX(b.east, z);
    const y0 = latToY(b.north, z); // north has the smaller y
    const y1 = latToY(b.south, z);
    const level: { z: number; x: number; y: number }[] = [];
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) level.push({ z, x, y });
    if (jobs.length && jobs.length + level.length > MAX_TILES) break;
    jobs.push(...level);
  }
  return jobs;
}

// Download + cache map tiles covering the route bounds, in BOTH styles (so the
// offline map can switch light/dark with the theme). Returns the count cached.
export async function cacheTiles(
  bounds: TileBounds,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const coords = tilesForBounds(bounds);
  const jobs = ALL_STYLES.flatMap((style) => coords.map((c) => ({ style, ...c })));
  const total = jobs.length;
  let done = 0;
  let cached = 0;

  // Fetch in small concurrent batches so a route's tiles save in a few seconds
  // without hammering the tile server.
  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const batch = jobs.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (t) => {
        try {
          const res = await fetch(tileUrl(t.style, t.z, t.x, t.y));
          if (res.ok) {
            await putTile(tileKey(t.style, t.z, t.x, t.y), await res.blob());
            cached++;
          }
        } catch {
          /* skip this tile */
        }
        onProgress?.(++done, total);
      }),
    );
  }
  return cached;
}
