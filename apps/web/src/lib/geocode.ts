/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadGoogleMaps } from "@/lib/googleMaps";

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// Format raw coordinates the way the design shows them, e.g.
// "47.9186° N · 106.9177° E".
export function formatCoords(latitude: number, longitude: number): string {
  const ns = latitude >= 0 ? "N" : "S";
  const ew = longitude >= 0 ? "E" : "W";
  return `${Math.abs(latitude).toFixed(4)}° ${ns} · ${Math.abs(longitude).toFixed(4)}° ${ew}`;
}

// Turn coordinates into a human place name. Prefers Google (great Mongolia
// coverage) when a key is configured, and falls back to OpenStreetMap so it
// still works without one. Returns null only if both fail.
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const fromGoogle = await googlePlaceName(latitude, longitude);
  if (fromGoogle) return fromGoogle;
  return nominatimPlaceName(latitude, longitude);
}

// --- Google -----------------------------------------------------------------

async function googlePlaceName(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  if (!GOOGLE_KEY) return null;

  try {
    const google = await loadGoogleMaps(GOOGLE_KEY);
    const location = { lat: latitude, lng: longitude };
    // The named landmark you're standing at, then the street address as backup.
    return (await nearestPlace(google, location)) ?? (await geocodeAddress(google, location));
  } catch {
    return null;
  }
}

// Nearest named point of interest (e.g. "Sükhbaatar Square") via Places.
function nearestPlace(google: any, location: any): Promise<string | null> {
  return new Promise((resolve) => {
    const service = new google.maps.places.PlacesService(
      document.createElement("div"),
    );
    service.nearbySearch(
      {
        location,
        rankBy: google.maps.places.RankBy.DISTANCE,
        type: "point_of_interest",
      },
      (results: any[], status: string) => {
        const ok = status === google.maps.places.PlacesServiceStatus.OK;
        resolve(ok && results?.length ? results[0].name : null);
      },
    );
  });
}

// Street address from reverse geocoding, with the country trimmed off.
function geocodeAddress(google: any, location: any): Promise<string | null> {
  return new Promise((resolve) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location }, (results: any[], status: string) => {
      if (status !== "OK" || !results?.length) {
        resolve(null);
        return;
      }
      const address: string = results[0].formatted_address ?? "";
      const parts = address.split(",").map((p) => p.trim());
      // Drop the trailing country for a shorter, friendlier label.
      resolve(parts.slice(0, 2).join(", ") || address || null);
    });
  });
}

// --- OpenStreetMap fallback --------------------------------------------------

interface NominatimAddress {
  amenity?: string;
  tourism?: string;
  building?: string;
  road?: string;
  pedestrian?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
}

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
}

async function nominatimPlaceName(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=json` +
      `&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=en`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;

    const data: NominatimResponse = await response.json();
    return shortPlaceName(data);
  } catch {
    return null;
  }
}

function shortPlaceName(data: NominatimResponse): string | null {
  const address = data.address;
  if (!address) return data.display_name ?? null;

  const spot =
    address.amenity ||
    address.tourism ||
    address.building ||
    address.road ||
    address.pedestrian ||
    address.neighbourhood ||
    address.suburb ||
    address.quarter;
  const city =
    address.city || address.town || address.village || address.county || address.state;

  if (spot && city) return `${spot}, ${city}`;
  return city || spot || data.display_name || null;
}
