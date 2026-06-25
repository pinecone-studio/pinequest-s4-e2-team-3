"use client";
import { useEffect } from "react";
import { useLocationStore } from "@/stores/locationStore";

export function useLocation() {
  const { coordinates, permissionGranted, setCoordinates, setPermissionGranted } =
    useLocationStore();

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPermissionGranted(true);
        setCoordinates({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => setPermissionGranted(false)
    );
  }, []);

  return { coordinates, permissionGranted };
}
