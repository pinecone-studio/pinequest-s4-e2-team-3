"use client";

import { useState } from "react";
import { GuideBanner } from "./GuideBanner";
import { PlacesList } from "./PlacesList";
import { useOnlineStatus } from "@/context/OnlineStatus";

interface Props { category: string }

export function ExploreContent({ category }: Props) {
  const [weather, setWeather] = useState<{ code: number; hour: number } | null>(null);
  const { online } = useOnlineStatus();

  return (
    <>
      {!online && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200/60 bg-amber-50 px-4 py-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <circle cx="12" cy="20" r="1" fill="currentColor" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-bold text-amber-900">Offline</p>
            <p className="text-xs text-amber-700">Place results won&apos;t load until you reconnect</p>
          </div>
        </div>
      )}
      <GuideBanner onWeather={(code, hour) => setWeather({ code, hour })} />
      <PlacesList category={category} weather={weather} />
    </>
  );
}
