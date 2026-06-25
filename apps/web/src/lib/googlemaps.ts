// Google Maps configuration for the Live Guide.
//
// The interactive map (RouteMap) and the offline static snapshot both use the
// Google Maps Platform. Enable "Maps JavaScript API" (interactive map) and,
// for the offline pack image, "Maps Static API" on the same key.

export const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// Whether a real Google map can be rendered. When false, the Live Guide falls
// back to the stylised backdrop so the app still works with zero setup.
export const hasGoogleMapsKey = GOOGLE_MAPS_KEY.length > 0;

// Dark map style (classic JSON styles array) so the map matches the Live
// Guide's night aesthetic without needing a cloud-configured Map ID.
export const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0d1422" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7d8ba5" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d1422" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#2a3552" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1b2640" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6b7796" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#16233d" }] },
];
