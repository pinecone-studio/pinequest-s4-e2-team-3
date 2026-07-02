// Ride-hailing + bus config shared by the Explore place card and the live AI
// guide's transport step.
import type { Coords } from "@/types";

export interface TaxiApp {
  label: string;
  icon: string;
  android: string;
  ios: string;
}

// Real store links (verified). Tapping opens the store listing, which offers
// "Open" if the app is already installed.
export const TAXI_APPS: TaxiApp[] = [
  {
    label: "UBCab",
    icon: "🚕",
    android: "https://play.google.com/store/apps/details?id=com.mezorn.ubcab.ubcab_passanger_v2",
    ios: "https://apps.apple.com/mn/app/ubcab/id863109199",
  },
  {
    label: "Aba",
    icon: "🚖",
    android: "https://play.google.com/store/apps/details?id=com.abataxi",
    ios: "https://apps.apple.com/mn/app/aba-mongolia/id6447431571",
  },
];

export function taxiLink(app: TaxiApp): string {
  if (typeof navigator === "undefined") return app.android;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ? app.ios : app.android;
}

function parseDurationMinutes(duration: string): number {
  const hours = parseInt(duration.match(/(\d+)\s*hour/)?.[1] ?? "0");
  const mins = parseInt(duration.match(/(\d+)\s*min/)?.[1] ?? "0");
  return hours * 60 + mins;
}

// ponytail: rough linear model (base + per-km + per-min), ±15%/+30% band. Good
// enough for a "prices may vary" estimate; swap for a real quote API if needed.
export function estimateFare(distanceM: number, durationStr: string): string {
  const km = distanceM / 1000;
  const mins = parseDurationMinutes(durationStr);
  const est = 1000 + km * 1800 + mins * 200;
  const lo = Math.round((est * 0.85) / 100) * 100;
  const hi = Math.round((est * 1.3) / 100) * 100;
  return `${lo.toLocaleString()}₮ – ${hi.toLocaleString()}₮`;
}

function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Fare estimate when there's no computed drive route — the live guide has the
// origin/target coords but not a Google drive leg. Straight-line × road factor,
// ~22 km/h urban average with traffic.
export function estimateFareFromCoords(origin: Coords, target: Coords): string {
  const km = haversineKm(origin, target) * 1.4;
  const mins = Math.max(3, Math.round((km / 22) * 60));
  return estimateFare(km * 1000, `${mins} min`);
}

// ponytail: hours may shift seasonally — verify before a real launch. Fare
// (₮1000) and payment system (U-Money / U-Point card) confirmed.
export const BUS_INFO = {
  fare: "₮1000 per ride.",
  payment:
    "Tap a U-Money / U-Point transit card when you board — buy or top it up at kiosks and many shops. Cash isn't accepted on board.",
  hours: "Buses run roughly 07:00–22:00.",
};
