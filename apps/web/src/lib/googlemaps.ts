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

// Light map style — the calm, soft-blue daytime counterpart used when the Live
// Guide is switched to light mode.
export const LIGHT_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#eef2fb" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a93a6" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#cdd6e8" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9aa3b5" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cfe0f7" }] },
];

// ---------------------------------------------------------------------------
// Maps JS SDK loader
// Lazily injects the Google Maps JS SDK (with the Places library) and resolves
// with the `google` global. Used by client-side features that need the
// interactive SDK directly — e.g. reverse-geocoding a place name. The promise is
// cached so the script is only ever added once.
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
let mapsPromise: Promise<any> | null = null;

export function loadGoogleMaps(apiKey: string): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }

  const w = window as any;
  if (w.google?.maps) return Promise.resolve(w.google);
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (w.google?.maps) resolve(w.google);
      else reject(new Error("Google Maps loaded but `google.maps` is unavailable"));
    };
    script.onerror = () => {
      mapsPromise = null; // allow a later retry
      reject(new Error("Failed to load the Google Maps script"));
    };
    document.head.appendChild(script);
  });

  return mapsPromise;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
