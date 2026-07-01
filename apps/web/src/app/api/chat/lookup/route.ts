import { lookupPlace } from "@/lib/places";

// GET /api/chat/lookup?name=Gandan+Monastery
// Thin wrapper around lookupPlace() so the frontend can fetch full place cards
// (photo, rating, reviews) for places named in the AI's suggestion messages.
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name") ?? "";
  if (!name.trim()) return Response.json(null, { status: 400 });
  const place = await lookupPlace(name);
  if (!place) return Response.json(null, { status: 404 });
  return Response.json(place);
}
