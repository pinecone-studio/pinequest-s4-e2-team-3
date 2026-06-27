import { browseNearbyByCategory, searchPlacesByText } from "@/lib/places";
import { fetchNearbyCustomPlaces, searchCustomPlaces, searchCustomPlacesByVector } from "@/lib/customPlaces";
import { embed } from "@/lib/embed";
import type { BrowsePlace } from "@/lib/places";

function dedup(places: BrowsePlace[]): BrowsePlace[] {
  const kept: BrowsePlace[] = [];
  for (const p of places) {
    const near = kept.some((k) => {
      const dLat = (k.latitude - p.latitude) * 111000;
      const dLng = (k.longitude - p.longitude) * 111000 * Math.cos((k.latitude * Math.PI) / 180);
      return Math.sqrt(dLat ** 2 + dLng ** 2) < 50;
    });
    if (!near) kept.push(p);
  }
  return kept;
}

// GET /api/places?lat=&lng=&category=&limit=
// GET /api/places?lat=&lng=&q=cozy breakfast spot
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "47.9077");
  const lng = parseFloat(searchParams.get("lng") ?? "106.8832");
  const q   = searchParams.get("q") ?? "";

  if (q.trim()) {
    // Embed the query and run Google + RAG vector search in parallel
    const [queryVector, googleResults] = await Promise.all([
      embed(q),
      searchPlacesByText(lat, lng, q),
    ]);

    const customResults = queryVector
      ? await searchCustomPlacesByVector(lat, lng, queryVector)
      : await searchCustomPlaces(lat, lng, q);

    return Response.json(dedup([...googleResults, ...customResults]));
  }

  const category = searchParams.get("category") ?? "all";
  const limit    = parseInt(searchParams.get("limit") ?? "10", 10);

  const [googleResults, customResults] = await Promise.all([
    browseNearbyByCategory(lat, lng, category, limit),
    fetchNearbyCustomPlaces(lat, lng, category),
  ]);

  return Response.json(dedup([...googleResults, ...customResults]).slice(0, limit + 10));
}
