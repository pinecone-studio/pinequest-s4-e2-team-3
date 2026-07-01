"use client";
import { useEffect } from "react";
import { useLocationStore } from "@/stores/locationStore";

// Continuously tracks the device location via watchPosition (the Live Guide
// needs ongoing updates, not a one-shot read). Falls back gracefully when
// geolocation is unavailable or permission is denied.
export function useLocation() {
  const { coordinates, permissionGranted, setCoordinates, setPermissionGranted } =
    useLocationStore();

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPermissionGranted(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPermissionGranted(true);
        // Use whatever fix the device gives, at any accuracy. On a desktop/laptop
        // (WiFi/IP location) this is only approximate, but showing an approximate
        // "you are here" is better than dropping the dot entirely; a real phone GPS
        // is precise. (No accuracy cutoff — it silently hid the dot on desktop.)
        setCoordinates({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => setPermissionGranted(false),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { coordinates, permissionGranted };
}
