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
        // Reject clearly-garbage fixes: a desktop/laptop with no GPS chip locates
        // by WiFi/IP, often reported with accuracy of many kilometres — using that
        // would drop the "you are here" dot (and the approach line) far from the
        // traveller. Beyond ~5km of stated accuracy we skip the update and wait for
        // a better one. ponytail: 5km cutoff; loosen if real phone fixes get dropped.
        if (typeof pos.coords.accuracy === "number" && pos.coords.accuracy > 5_000) return;
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
