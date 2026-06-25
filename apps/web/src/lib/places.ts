const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export interface NearbyPlace {
  name: string;
  rating?: number;
  address?: string;
  openNow?: boolean;
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

  try {
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
    if (!response.ok) return [];

    const data = await response.json();
    const places: PlacesTextResult[] = data.places ?? [];
    return places.slice(0, 5).map((place) => ({
      name: place.displayName?.text ?? "Unknown",
      rating: place.rating,
      address: place.formattedAddress,
      openNow: place.currentOpeningHours?.openNow,
    }));
  } catch {
    return [];
  }
}
