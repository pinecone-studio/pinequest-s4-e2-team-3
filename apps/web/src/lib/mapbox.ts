// Mapbox access token — still used by the reverse-geocoding helper
// (src/lib/geocode.ts, a separate feature). The Live Guide MAP itself now uses
// Google Maps; see src/lib/googlemaps.ts.
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export const hasMapboxToken = MAPBOX_TOKEN.length > 0;
