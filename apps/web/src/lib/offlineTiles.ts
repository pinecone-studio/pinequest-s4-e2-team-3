// Offline raster map tiles (OpenStreetMap) cached in IndexedDB so the offline
// map is fully interactive (zoom / pan / live GPS) — not a flat snapshot.
// ponytail: OSM public tiles are fine at demo scale; for production self-host or
// use a provider that permits caching (their bulk-download policy is strict).

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
const MIN_ZOOM = 10;
const MAX_ZOOM = 16;

const tileKey = (z: number, x: number, y: number) => `${z}/${x}/${y}`;

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

export async function getTile(z: number, x: number, y: number): Promise<Blob | null> {
  try {
    const db = await openDb();
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(tileKey(z, x, y));
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

// All tile coords for the bounds, from MIN_ZOOM upward, stopping before the
// MAX_TILES cap — so small routes get high detail and big ones get fewer zooms.
function tilesForBounds(b: TileBounds): { z: number; x: number; y: number }[] {
  const jobs: { z: number; x: number; y: number }[] = [];
  for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
    const x0 = lngToX(b.west, z);
    const x1 = lngToX(b.east, z);
    const y0 = latToY(b.north, z); // north has the smaller y
    const y1 = latToY(b.south, z);
    const level: { z: number; x: number; y: number }[] = [];
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) level.push({ z, x, y });
    if (jobs.length + level.length > MAX_TILES) break;
    jobs.push(...level);
  }
  return jobs;
}

// Download + cache map tiles covering the route bounds. Returns the count cached.
export async function cacheTiles(
  bounds: TileBounds,
  style: TileStyle,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const jobs = tilesForBounds(bounds);
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
          const res = await fetch(tileUrl(style, t.z, t.x, t.y));
          if (res.ok) {
            await putTile(tileKey(t.z, t.x, t.y), await res.blob());
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
