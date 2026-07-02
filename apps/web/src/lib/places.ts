import { cached } from "@/lib/cache";

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// Places results barely change minute-to-minute — cache for 10 min to collapse
// the repeated lookups the Explore screens fire on every load.
const PLACES_TTL_MS = 10 * 60_000;

// Round coordinates to ~110 m so nearby requests share a cache entry.
const roundCoord = (n: number) => Math.round(n * 1000) / 1000;

export interface NearbyPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  rating?: number;
  address?: string;
  openNow?: boolean;
  walkMinutes?: number;
  imageUrl?: string;
  description?: string;
  reviewCount?: number;
  reviews?: { text: string; author?: string; rating?: number }[];
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
  id?: string;
  displayName?: { text?: string };
  rating?: number;
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  currentOpeningHours?: { openNow?: boolean };
  photos?: { name: string }[];
  editorialSummary?: { text?: string };
  userRatingCount?: number;
  reviews?: {
    rating?: number;
    text?: { text?: string };
    authorAttribution?: { displayName?: string };
  }[];
}

// Ulaanbaatar — biases planning lookups toward Mongolia when there's no device location.
const UB_CENTER = { latitude: 47.9186, longitude: 106.9177 };

function photoMediaUrl(photoName: string | undefined, width: number): string | undefined {
  return photoName
    ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${width}&key=${GOOGLE_KEY}`
    : undefined;
}

function mapReviews(reviews: PlacesTextResult["reviews"]): NearbyPlace["reviews"] {
  return (reviews ?? [])
    .filter((r) => r.text?.text)
    .slice(0, 5)
    .map((r) => ({
      text: r.text!.text!,
      author: r.authorAttribution?.displayName,
      rating: r.rating,
    }));
}

// Look up ONE well-known Mongolian destination by name, for trip-planning cards
// when there's no live location. No walk time — these aren't near the traveller.
export async function lookupPlace(name: string): Promise<NearbyPlace | null> {
  if (!GOOGLE_KEY || !name.trim()) return null;

  const cacheKey = `lookup:${name.toLowerCase().trim()}`;
  try {
    return await cached(cacheKey, PLACES_TTL_MS, async () => {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.rating,places.formattedAddress,places.location,places.photos,places.editorialSummary,places.userRatingCount,places.reviews",
        },
        body: JSON.stringify({
          textQuery: `${name}, Mongolia`,
          maxResultCount: 1,
          // Soft bias to Mongolia (wide radius) so a name like "Khongoryn Els" still resolves.
          locationBias: { circle: { center: UB_CENTER, radius: 400_000 } },
        }),
      });
      if (!response.ok) throw new Error(`places lookup ${response.status}`);

      const place: PlacesTextResult | undefined = ((await response.json()).places ?? [])[0];
      if (!place) return null;
      return {
        id: place.id ?? crypto.randomUUID(),
        name: place.displayName?.text ?? name,
        latitude: place.location?.latitude ?? UB_CENTER.latitude,
        longitude: place.location?.longitude ?? UB_CENTER.longitude,
        rating: place.rating,
        address: place.formattedAddress,
        imageUrl: photoMediaUrl(place.photos?.[0]?.name, 400),
        description: place.editorialSummary?.text,
        reviewCount: place.userRatingCount,
        reviews: mapReviews(place.reviews),
      };
    });
  } catch {
    return null;
  }
}

// Identify the single place the traveller is standing at/near, so the guide can
// EXPLAIN where they are (history, meaning) instead of recommending somewhere new.
// Nearest named place of any kind, with its editorial summary + reviews for
// grounding. Returns null if nothing is close or on failure.
export async function nearestPlace(
  latitude: number,
  longitude: number,
): Promise<NearbyPlace | null> {
  if (!GOOGLE_KEY) return null;

  const cacheKey = `here:${roundCoord(latitude)},${roundCoord(longitude)}`;
  try {
    return await cached(cacheKey, PLACES_TTL_MS, async () => {
      const res = await fetch(NEARBY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.rating,places.formattedAddress,places.location,places.photos,places.editorialSummary,places.userRatingCount,places.reviews",
        },
        body: JSON.stringify({
          // No includedTypes → the nearest named place of any kind.
          maxResultCount: 1,
          rankPreference: "DISTANCE",
          // ponytail: 200 m covers GPS drift + large complexes (a monastery, a
          // square); widen if travellers report the wrong landmark.
          locationRestriction: {
            circle: { center: { latitude, longitude }, radius: 200 },
          },
          languageCode: "en",
        }),
      });
      if (!res.ok) throw new Error(`places nearest ${res.status}`);

      const place: PlacesTextResult | undefined = ((await res.json()).places ?? [])[0];
      if (!place) return null;
      return {
        id: place.id ?? crypto.randomUUID(),
        name: place.displayName?.text ?? "Unknown",
        latitude: place.location?.latitude ?? latitude,
        longitude: place.location?.longitude ?? longitude,
        rating: place.rating,
        address: place.formattedAddress,
        imageUrl: photoMediaUrl(place.photos?.[0]?.name, 400),
        description: place.editorialSummary?.text,
        reviewCount: place.userRatingCount,
        reviews: mapReviews(place.reviews),
      };
    });
  } catch {
    return null;
  }
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
              "places.id,places.displayName,places.rating,places.formattedAddress,places.currentOpeningHours.openNow,places.location,places.photos,places.editorialSummary,places.userRatingCount,places.reviews",
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
      return places.slice(0, 5).map((place) => {
        const lat = place.location?.latitude;
        const lng = place.location?.longitude;
        const distKm =
          lat != null && lng != null
            ? haversineKm(latitude, longitude, lat, lng)
            : undefined;
        const walkMinutes =
          distKm !== undefined ? Math.max(1, Math.round((distKm * 1000) / 83)) : undefined;
        const imageUrl = photoMediaUrl(place.photos?.[0]?.name, 400);
        const reviews = mapReviews(place.reviews);
        return {
          id: place.id ?? crypto.randomUUID(),
          name: place.displayName?.text ?? "Unknown",
          latitude: lat ?? latitude,
          longitude: lng ?? longitude,
          rating: place.rating,
          address: place.formattedAddress,
          openNow: place.currentOpeningHours?.openNow,
          walkMinutes,
          imageUrl,
          description: place.editorialSummary?.text,
          reviewCount: place.userRatingCount,
          reviews,
        };
      });
    });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Text search — powers the search bar. Uses Places (New) searchText so any
// query ("KFC", "coffee", "Zaisan") works, not just preset categories.
// ---------------------------------------------------------------------------

interface TextApiPlace {
  id: string;
  displayName?: { text?: string };
  rating?: number;
  location?: { latitude?: number; longitude?: number };
  photos?: { name: string }[];
  formattedAddress?: string;
  types?: string[];
}

function guessCategory(types: string[] = []): { label: string; tone: BrowsePlace["categoryTone"] } {
  if (types.some((t) => ["restaurant","cafe","bakery","fast_food_restaurant","meal_takeaway","food"].includes(t)))
    return { label: "Food", tone: "amber" };
  if (types.some((t) => ["museum","art_gallery","cultural_center"].includes(t)))
    return { label: "Culture", tone: "purple" };
  if (types.some((t) => ["park","national_park"].includes(t)))
    return { label: "Nature", tone: "green" };
  if (types.some((t) => ["historical_landmark","monument"].includes(t)))
    return { label: "History", tone: "blue" };
  if (types.some((t) => ["tourist_attraction","observation_deck"].includes(t)))
    return { label: "Viewpoint", tone: "green" };
  return { label: "Place", tone: "blue" };
}

export async function searchPlacesByText(
  latitude: number,
  longitude: number,
  query: string,
): Promise<BrowsePlace[]> {
  if (!GOOGLE_KEY || !query.trim()) return [];

  const cacheKey = `search:${roundCoord(latitude)},${roundCoord(longitude)}:${query.toLowerCase().trim()}`;

  try {
    return await cached(cacheKey, PLACES_TTL_MS, async () => {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.rating,places.photos,places.location,places.formattedAddress,places.types",
        },
        body: JSON.stringify({
          textQuery: query,
          maxResultCount: 20,
          locationBias: {
            circle: { center: { latitude, longitude }, radius: 10000 },
          },
          languageCode: "en",
        }),
      });
      if (!res.ok) throw new Error(`searchText ${res.status}`);

      const data = await res.json() as { places?: TextApiPlace[] };
      return (data.places ?? [])
        .map((p) => {
          const lat = p.location?.latitude ?? latitude;
          const lng = p.location?.longitude ?? longitude;
          const distKm = haversineKm(latitude, longitude, lat, lng);
          const walkMinutes = Math.max(1, Math.round((distKm * 1000) / 83));
          const photoName = p.photos?.[0]?.name;
          const imageUrl = photoName
            ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=600&key=${GOOGLE_KEY}`
            : `https://picsum.photos/seed/${(p.id ?? "x").slice(-4)}/600/400`;
          const { label, tone } = guessCategory(p.types);
          return {
            id: p.id ?? crypto.randomUUID(),
            title: p.displayName?.text ?? "Unknown",
            category: label,
            categoryTone: tone,
            rating: p.rating ?? 4.0,
            distance: `${distKm.toFixed(1)} km`,
            walkTime: `${walkMinutes} min`,
            description: p.formattedAddress ?? "",
            imageUrl,
            latitude: lat,
            longitude: lng,
            _distKm: distKm,
          } satisfies BrowsePlace & { _distKm: number };
        })
        .filter((p) => p._distKm <= 20)
        .map(({ _distKm: _, ...rest }) => rest);
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
  food:       ["restaurant", "fast_food_restaurant", "bakery"],
  coffee:     ["cafe", "coffee_shop"],
  viewpoints: ["tourist_attraction", "observation_deck"],
  culture:    ["museum", "art_gallery", "cultural_center"],
  history:    ["historical_landmark", "monument", "museum"],
  nature:     ["park", "national_park"],
  shopping:   ["shopping_mall", "department_store", "market"],
  nightlife:  ["bar", "night_club", "karaoke"],
  hotels:     ["lodging", "hotel", "motel"],
};

const CATEGORY_TONE: Record<string, BrowsePlace["categoryTone"]> = {
  all: "blue", food: "amber", coffee: "amber", viewpoints: "green",
  culture: "purple", history: "blue", nature: "green",
  shopping: "amber", nightlife: "purple", hotels: "blue",
};

const CATEGORY_LABEL: Record<string, string> = {
  all: "Attraction", food: "Food", coffee: "Coffee", viewpoints: "Viewpoint",
  culture: "Culture", history: "History", nature: "Nature",
  shopping: "Shopping", nightlife: "Nightlife", hotels: "Hotel",
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
