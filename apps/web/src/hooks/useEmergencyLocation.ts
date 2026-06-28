"use client";

import { useEffect, useState } from "react";
import { formatCoords, reverseGeocode } from "@/lib/geocode";

export type LocationStatus = "loading" | "ready" | "denied";

export interface EmergencyLocation {
  status: LocationStatus;
  place: string | null;
  coords: string | null;
  rawLat: number | null;
  rawLng: number | null;
}

// Reads the device's real location for the SOS sheet. Coordinates appear as soon
// as the browser resolves them; the place name fills in after reverse geocoding.
export function useEmergencyLocation(): EmergencyLocation {
  const [location, setLocation] = useState<EmergencyLocation>({
    status: "loading",
    place: null,
    coords: null,
    rawLat: null,
    rawLng: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({ status: "denied", place: null, coords: null, rawLat: null, rawLng: null });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({
          status: "ready",
          place: null,
          coords: formatCoords(latitude, longitude),
          rawLat: latitude,
          rawLng: longitude,
        });

        const name = await reverseGeocode(latitude, longitude);
        setLocation((current) => ({ ...current, place: name }));
      },
      () => setLocation({ status: "denied", place: null, coords: null, rawLat: null, rawLng: null }),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  return location;
}
