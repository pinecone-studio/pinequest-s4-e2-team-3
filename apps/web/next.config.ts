import type { NextConfig } from "next";
// next-pwa is CommonJS; Next.js config transpiler handles the interop fine.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline",
  },
  runtimeCaching: [
    // Static Next.js assets — cache-first, they're fingerprinted so never stale
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: "CacheFirst",
      options: { cacheName: "next-static", expiration: { maxEntries: 256 } },
    },
    // Next.js image optimisation
    {
      urlPattern: /\/_next\/image\?.*/i,
      handler: "NetworkFirst",
      options: { cacheName: "next-image", expiration: { maxEntries: 64 } },
    },
    // Google Fonts
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: { maxEntries: 8, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    // Pre-recorded phrase audio — cache-first, files don't change
    {
      urlPattern: /\/phrases\/.*\.wav$/i,
      handler: "CacheFirst",
      options: { cacheName: "phrase-audio", expiration: { maxEntries: 32 } },
    },
    // Page navigations — network-first with offline fallback
    {
      urlPattern: /^https:\/\/.+\/(|translate|explore|ai|journey|sos)(\/.*)?$/,
      handler: "NetworkFirst",
      options: {
        cacheName: "pages",
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 16, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "places.googleapis.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default withPWA(nextConfig);
