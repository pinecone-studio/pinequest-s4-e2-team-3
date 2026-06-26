/* eslint-disable @typescript-eslint/no-explicit-any */
import type { RouteStop } from "@/types";

export interface LatLng {
  lat: number;
  lng: number;
}

// Cheap planar distance (good enough for proportional resampling).
function dist(a: LatLng, b: LatLng): number {
  const dx = (b.lng - a.lng) * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  const dy = b.lat - a.lat;
  return Math.sqrt(dx * dx + dy * dy);
}

// Resample a polyline to `count` points evenly spaced by distance, so the marker
// moves at a steady speed regardless of how the road path is point-distributed.
function resampleEven(path: LatLng[], count: number): LatLng[] {
  if (path.length <= 1 || count <= 1) return path.slice();
  const cum: number[] = [0];
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + dist(path[i - 1], path[i]));
  const total = cum[cum.length - 1];
  if (total === 0) return [path[0]];

  const out: LatLng[] = [];
  let j = 1;
  for (let k = 0; k < count; k++) {
    const target = (total * k) / (count - 1);
    while (j < cum.length - 1 && cum[j] < target) j++;
    const segLen = cum[j] - cum[j - 1];
    const t = segLen > 0 ? (target - cum[j - 1]) / segLen : 0;
    const a = path[j - 1];
    const b = path[j];
    out.push({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t });
  }
  return out;
}

// Build the road-following points the demo marker walks along. Each leg uses the
// Directions API's real road path (straight-line fallback when it can't route),
// resampled to a fixed number of points so each leg takes roughly equal time and
// you actually see each stop transition rather than racing down one long leg.
export async function buildRoutePath(
  google: any,
  stops: RouteStop[],
  stepsPerLeg = 14,
): Promise<LatLng[]> {
  const toLL = (s: RouteStop): LatLng => ({ lat: s.latitude, lng: s.longitude });
  if (stops.length === 0) return [];
  if (stops.length === 1) return [toLL(stops[0])];

  const service = new google.maps.DirectionsService();
  const points: LatLng[] = [toLL(stops[0])];

  for (let i = 0; i < stops.length - 1; i++) {
    const a = toLL(stops[i]);
    const b = toLL(stops[i + 1]);

    let leg: LatLng[] | null = null;
    try {
      const result = await service.route({
        origin: a,
        destination: b,
        travelMode: google.maps.TravelMode.DRIVING,
      });
      const road = result?.routes?.[0]?.overview_path;
      if (road?.length) leg = road.map((p: any) => ({ lat: p.lat(), lng: p.lng() }));
    } catch {
      /* no route for this leg — fall back to a straight line below */
    }
    if (!leg || leg.length < 2) leg = [a, b];

    // Drop the first point (it duplicates the previous leg's last point).
    points.push(...resampleEven(leg, stepsPerLeg).slice(1));
  }

  return points;
}
