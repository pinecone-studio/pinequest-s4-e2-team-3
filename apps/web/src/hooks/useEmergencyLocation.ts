"use client";

import { useEffect, useState } from "react";
import { formatCoords, reverseGeocode } from "@/lib/geocode";

export type LocationStatus = "loading" | "ready" | "denied";

export interface EmergencyLocation {
  status: LocationStatus;
  // Human place name (once reverse-geocoded); null while unknown.
  place: string | null;
  // Formatted coordinates, e.g. "47.9186° N · 106.9177° E"; null until located.
  coords: string | null;
}

// Reads the device's real location for the SOS sheet. Coordinates appear as soon
// as the browser resolves them; the place name fills in after reverse geocoding.
export function useEmergencyLocation(): EmergencyLocation {
  const [location, setLocation] = useState<EmergencyLocation>({
    status: "loading",
    place: null,
    coords: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({ status: "denied", place: null, coords: null });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({
          status: "ready",
          place: null,
          coords: formatCoords(latitude, longitude),
        });

        const name = await reverseGeocode(latitude, longitude);
        setLocation((current) => ({ ...current, place: name }));
      },
      () => setLocation({ status: "denied", place: null, coords: null }),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  return location;
}
