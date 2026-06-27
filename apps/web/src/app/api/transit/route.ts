import { fetchHamugaRoute } from "@/lib/transit";

// GET /api/transit?oLat=&oLng=&dLat=&dLng= — real bus route via Hamuga, or null.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const oLat = parseFloat(searchParams.get("oLat") ?? "");
  const oLng = parseFloat(searchParams.get("oLng") ?? "");
  const dLat = parseFloat(searchParams.get("dLat") ?? "");
  const dLng = parseFloat(searchParams.get("dLng") ?? "");
  if ([oLat, oLng, dLat, dLng].some(Number.isNaN)) {
    return Response.json(null, { status: 400 });
  }

  const route = await fetchHamugaRoute(
    { latitude: oLat, longitude: oLng },
    { latitude: dLat, longitude: dLng },
  );
  return Response.json(route);
}
