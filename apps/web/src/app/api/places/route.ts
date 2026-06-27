import { browseNearbyByCategory, searchPlacesByText } from "@/lib/places";

// GET /api/places?lat=&lng=&category=&limit=
// GET /api/places?lat=&lng=&q=KFC          ← text search mode
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "47.9077");
  const lng = parseFloat(searchParams.get("lng") ?? "106.8832");
  const q = searchParams.get("q") ?? "";

  if (q.trim()) {
    const places = await searchPlacesByText(lat, lng, q);
    return Response.json(places);
  }

  const category = searchParams.get("category") ?? "all";
  const limit = parseInt(searchParams.get("limit") ?? "10", 10);
  const places = await browseNearbyByCategory(lat, lng, category, limit);
  return Response.json(places);
}
