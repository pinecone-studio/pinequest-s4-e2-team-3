// Google Maps hand-off helpers.
//
// Nomad AI is a guide layer ON TOP of Google Maps — it explains and advises,
// then hands the actual routing to Google Maps via coordinates. These build the
// deep links; opening them is the caller's job (e.g. window.open / <a href>).

import type { Coords } from "@/types";

// A pin at the given coordinates.
export function googleMapsPlaceUrl(coords: Coords, label?: string): string {
  const q = label
    ? `${label} @${coords.latitude},${coords.longitude}`
    : `${coords.latitude},${coords.longitude}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

// Directions to a destination (optionally from an origin). `travelMode` lets the
// caller open transit (bus) directions for a bus station, or walking for a food
// spot — anything else defaults to Google's choice.
export function googleMapsDirectionsUrl(
  destination: Coords,
  origin?: Coords | null,
  travelMode?: "walking" | "driving" | "transit" | "bicycling",
): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${destination.latitude},${destination.longitude}`,
  });
  if (origin) params.set("origin", `${origin.latitude},${origin.longitude}`);
  if (travelMode) params.set("travelmode", travelMode);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
