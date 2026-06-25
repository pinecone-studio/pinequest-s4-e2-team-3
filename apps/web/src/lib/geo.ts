// Pure geo helpers for the Live Guide — no DOM, easy to reason about/test.

import type { Coords, RouteStop } from "@/types";

const EARTH_RADIUS_M = 6_371_000;

const toRad = (deg: number) => (deg * Math.PI) / 180;

// Great-circle distance between two points, in metres (haversine).
export function haversineMeters(a: Coords, b: Coords): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// Has the traveller reached this stop? (within its arrival radius)
export function hasArrived(coords: Coords, stop: RouteStop): boolean {
  return haversineMeters(coords, stop) <= stop.arrivalRadius;
}

// Human-friendly distance, e.g. "120 m" or "2.4 km".
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}
