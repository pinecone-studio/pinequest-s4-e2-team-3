export const Config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "",
  posthogKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? "",
  posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
  weatherApiUrl: process.env.EXPO_PUBLIC_WEATHER_API_URL ?? "",
  weatherApiKey: process.env.EXPO_PUBLIC_WEATHER_API_KEY ?? "",
  chimegeApiUrl: process.env.EXPO_PUBLIC_CHIMEGE_API_URL ?? "",
} as const;
