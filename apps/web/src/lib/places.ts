import { cached } from "@/lib/cache";

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// Places results barely change minute-to-minute — cache for 10 min to collapse
// the repeated lookups the Explore screens fire on every load.
const PLACES_TTL_MS = 10 * 60_000;

// Round coordinates to ~110 m so nearby requests share a cache entry.
const roundCoord = (n: number) => Math.round(n * 1000) / 1000;

export interface NearbyPlace {
  name: string;
  rating?: number;
  address?: string;
  openNow?: boolean;
}

// Rich card shape for the Explore browse UI (matches the ExploreSpot type the
// home/explore screens render).
export interface BrowsePlace {
  id: string;
  title: string;
  category: string;
  categoryTone: "blue" | "amber" | "green" | "purple" | "white";
  rating: number;
  distance: string;
  walkTime: string;
  description: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
}

interface PlacesTextResult {
  displayName?: { text?: string };
  rating?: number;
  formattedAddress?: string;
  currentOpeningHours?: { openNow?: boolean };
}

// Real places near a point, closest first, via the Places API (New) Text Search.
// Free text (e.g. "park to rest", "coffee") plus a location bias, so it handles
// both food and open-ended "somewhere to sit" searches. Runs server-side (no
// CORS). Returns [] if there's no key or the request fails, so chat still works.
export async function findNearbyPlaces(
  latitude: number,
  longitude: number,
  keyword: string,
  type?: string,
): Promise<NearbyPlace[]> {
  if (!GOOGLE_KEY) return [];

  const cacheKey = `text:${roundCoord(latitude)},${roundCoord(longitude)}:${keyword.toLowerCase()}:${type ?? ""}`;

  try {
    return await cached(cacheKey, PLACES_TTL_MS, async () => {
      const response = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_KEY,
            "X-Goog-FieldMask":
              "places.displayName,places.rating,places.formattedAddress,places.currentOpeningHours.openNow",
          },
          body: JSON.stringify({
            textQuery: type ? `${keyword} ${type}` : keyword,
            maxResultCount: 5,
            rankPreference: "DISTANCE",
            locationBias: {
              circle: {
                center: { latitude, longitude },
                radius: 3000,
              },
            },
          }),
        },
      );
      if (!response.ok) throw new Error(`places searchText ${response.status}`);

      const data = await response.json();
      const places: PlacesTextResult[] = data.places ?? [];
      return places.slice(0, 5).map((place) => ({
        name: place.displayName?.text ?? "Unknown",
        rating: place.rating,
        address: place.formattedAddress,
        openNow: place.currentOpeningHours?.openNow,
      }));
    });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Category browse — powers the Explore screens. Uses Places (New) searchNearby
// with curated type sets per category and returns ready-to-render cards.
// ---------------------------------------------------------------------------

const NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";

const GOOGLE_TYPES: Record<string, string[]> = {
  all:        ["tourist_attraction", "museum", "restaurant"],
  food:       ["restaurant", "cafe", "bakery"],
  viewpoints: ["tourist_attraction", "observation_deck"],
  culture:    ["museum", "art_gallery", "cultural_center"],
  history:    ["historical_landmark", "monument", "museum"],
  attraction: ["tourist_attraction"],
  restaurant: ["restaurant", "cafe"],
  hotel:      ["lodging", "hotel"],
  museum:     ["museum", "art_gallery"],
  nature:     ["park", "national_park"],
  shopping:   ["shopping_mall", "department_store"],
};

const CATEGORY_TONE: Record<string, BrowsePlace["categoryTone"]> = {
  all: "blue", food: "amber", viewpoints: "green", culture: "purple",
  history: "blue", attraction: "blue", restaurant: "amber",
  hotel: "purple", museum: "green", nature: "green", shopping: "amber",
};

const CATEGORY_LABEL: Record<string, string> = {
  all: "Attraction", food: "Food", viewpoints: "Viewpoint",
  culture: "Culture", history: "History", attraction: "Attraction",
  restaurant: "Restaurant", hotel: "Hotel", museum: "Museum",
  nature: "Nature", shopping: "Shopping",
};

interface NearbyApiPlace {
  id: string;
  displayName: { text: string };
  formattedAddress?: string;
  rating?: number;
  location: { latitude: number; longitude: number };
  photos?: { name: string }[];
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Browse real places near a point by category, nearest first. Returns [] on any
// failure so the Explore UI degrades gracefully.
export async function browseNearbyByCategory(
  latitude: number,
  longitude: number,
  category = "all",
  limit = 10,
): Promise<BrowsePlace[]> {
  if (!GOOGLE_KEY) return [];

  const key = category.toLowerCase();
  const types = GOOGLE_TYPES[key] ?? GOOGLE_TYPES.all;
  const cacheKey = `browse:${roundCoord(latitude)},${roundCoord(longitude)}:${key}:${limit}`;

  try {
    return await cached(cacheKey, PLACES_TTL_MS, async () => {
      const res = await fetch(NEARBY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.rating,places.photos,places.location,places.formattedAddress",
        },
        body: JSON.stringify({
          includedTypes: types,
          maxResultCount: 20,
          locationRestriction: {
            circle: { center: { latitude, longitude }, radius: 10000 },
          },
          languageCode: "en",
        }),
      });
      if (!res.ok) throw new Error(`places searchNearby ${res.status}`);

      const data = (await res.json()) as { places?: NearbyApiPlace[] };
      const places = data.places ?? [];

      return places
        .map((p) => {
          const distKm = haversineKm(latitude, longitude, p.location.latitude, p.location.longitude);
          const walkMinutes = Math.max(1, Math.round((distKm * 1000) / 83));
          const photoName = p.photos?.[0]?.name;
          const imageUrl = photoName
            ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=600&key=${GOOGLE_KEY}`
            : `https://picsum.photos/seed/${p.id.slice(-4)}/600/400`;

          return {
            id: p.id,
            title: p.displayName.text,
            category: CATEGORY_LABEL[key] ?? category,
            categoryTone: CATEGORY_TONE[key] ?? "blue",
            rating: p.rating ?? 4.0,
            distance: `${distKm.toFixed(1)} km`,
            walkTime: `${walkMinutes} min`,
            description: p.formattedAddress ?? "",
            imageUrl,
            latitude: p.location.latitude,
            longitude: p.location.longitude,
            _distKm: distKm,
          };
        })
        .sort((a, b) => a._distKm - b._distKm)
        .slice(0, limit)
        .map(({ _distKm: _drop, ...rest }) => rest);
    });
  } catch {
    return [];
  }
}
