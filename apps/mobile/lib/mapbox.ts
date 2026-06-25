import Mapbox from "@rnmapbox/maps";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

export function initMapbox() {
  Mapbox.setAccessToken(MAPBOX_TOKEN);
}

export const MAP_STYLE = {
  default: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
} as const;
