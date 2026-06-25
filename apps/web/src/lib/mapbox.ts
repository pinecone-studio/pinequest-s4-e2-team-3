export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Whether a real Mapbox map can be rendered. When false, the Live Guide falls
// back to the stylised backdrop so the app still works with zero setup.
export const hasMapboxToken = MAPBOX_TOKEN.length > 0;

export const MAP_STYLE = {
  default: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
  // Dark style matches the Live Guide's night aesthetic.
  dark: "mapbox://styles/mapbox/dark-v11",
} as const;

// Style id (without the mapbox:// prefix) for the Static Images API.
export const STATIC_STYLE_ID = "dark-v11";
