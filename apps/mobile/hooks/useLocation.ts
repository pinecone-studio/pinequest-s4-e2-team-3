import { useEffect } from "react";
import * as Location from "expo-location";
import { useLocationStore } from "@/stores/locationStore";

export function useLocation() {
  const { coordinates, permissionGranted, setCoordinates, setPermissionGranted } =
    useLocationStore();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === "granted";
      setPermissionGranted(granted);

      if (!granted) return;

      const loc = await Location.getCurrentPositionAsync({});
      setCoordinates({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  return { coordinates, permissionGranted };
}
