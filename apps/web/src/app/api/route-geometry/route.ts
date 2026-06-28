// Road-following geometry for a whole route, via the Google Directions HTTP API
// (server-side — reliable, unlike the client SDK whose async library loading
// races with the offline-pack save). Returns Google's encoded overview polyline,
// which Static Maps (enc:) and our decodePolyline both understand.

interface StopIn {
  lat: number;
  lng: number;
}

export async function POST(req: Request) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return Response.json({ encoded: null });

  try {
    const { stops } = (await req.json()) as { stops: StopIn[] };
    if (!Array.isArray(stops) || stops.length < 2) return Response.json({ encoded: null });

    const origin = `${stops[0].lat},${stops[0].lng}`;
    const destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
    const waypoints = stops.slice(1, -1).map((s) => `${s.lat},${s.lng}`).join("|");

    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", origin);
    url.searchParams.set("destination", destination);
    if (waypoints) url.searchParams.set("waypoints", waypoints);
    url.searchParams.set("mode", "driving");
    url.searchParams.set("key", key);

    const res = await fetch(url);
    if (!res.ok) return Response.json({ encoded: null });
    const data = (await res.json()) as {
      status: string;
      routes?: { overview_polyline?: { points?: string } }[];
    };
    const encoded = data.status === "OK" ? data.routes?.[0]?.overview_polyline?.points ?? null : null;
    return Response.json({ encoded });
  } catch {
    return Response.json({ encoded: null });
  }
}
