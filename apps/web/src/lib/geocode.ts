import { MAPBOX_TOKEN } from "@/lib/mapbox";

// Format raw coordinates the way the design shows them, e.g.
// "47.9186° N · 106.9177° E".
export function formatCoords(latitude: number, longitude: number): string {
  const ns = latitude >= 0 ? "N" : "S";
  const ew = longitude >= 0 ? "E" : "W";
  return `${Math.abs(latitude).toFixed(4)}° ${ns} · ${Math.abs(longitude).toFixed(4)}° ${ew}`;
}

// Turn coordinates into a human place name via Mapbox. Returns null if no token
// is configured or the request fails, so callers can fall back gracefully.
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  if (!MAPBOX_TOKEN) return null;

  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json` +
      `?types=address,place,locality,neighborhood&limit=1&access_token=${MAPBOX_TOKEN}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    return data.features?.[0]?.place_name ?? null;
  } catch {
    return null;
  }
}
