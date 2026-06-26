import { browseNearbyByCategory } from "@/lib/places";

// Category browse for the Explore screens. Same-origin (Clerk-protected by the
// app middleware) — replaces the old NestJS /api/v1/places endpoint so all
// Google Places access lives in the web app.
// GET /api/places?lat=&lng=&category=&limit=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "47.9077");
  const lng = parseFloat(searchParams.get("lng") ?? "106.8832");
  const category = searchParams.get("category") ?? "all";
  const limit = parseInt(searchParams.get("limit") ?? "10", 10);

  const places = await browseNearbyByCategory(lat, lng, category, limit);
  return Response.json(places);
}
