"use client";

import { TAXI_APPS, taxiLink, estimateFare, estimateFareFromCoords } from "@/lib/transport";
import type { Coords } from "@/types";

// The "Book a taxi" card: estimated fare + one tappable button per ride app.
// Pass a real route (distanceM + durationText) for an accurate estimate, or just
// origin/target coords for a rough one. With neither, the fare box is hidden.
export function TaxiBooking({
  distanceM,
  durationText,
  origin,
  target,
  className,
  onClose,
}: {
  distanceM?: number | null;
  durationText?: string | null;
  origin?: Coords | null;
  target?: Coords | null;
  className?: string;
  onClose?: () => void;
}) {
  const fare =
    distanceM != null && durationText
      ? estimateFare(distanceM, durationText)
      : origin && target
        ? estimateFareFromCoords(origin, target)
        : null;

  return (
    <div className={`rounded-2xl bg-amber-50 border border-amber-100 px-3.5 py-3 ${className ?? ""}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold text-amber-700">Book a taxi</p>
        {onClose && (
          <button onClick={onClose} className="text-[10px] font-semibold text-amber-600">
            Hide
          </button>
        )}
      </div>
      {fare && (
        <div className="mb-2.5 rounded-xl bg-white border border-amber-200 px-3 py-2">
          <p className="text-[10px] text-amber-500 font-semibold uppercase tracking-wide">Estimated fare</p>
          <p className="text-base font-bold text-amber-900 mt-0.5">{fare}</p>
          <p className="text-[10px] text-amber-500 mt-0.5">Based on distance & traffic time</p>
        </div>
      )}
      <div className="flex gap-2">
        {TAXI_APPS.map((app) => (
          <a
            key={app.label}
            href={taxiLink(app)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white border border-amber-200 py-2 text-xs font-bold text-amber-900 active:bg-amber-100"
          >
            <span>{app.icon}</span> {app.label}
          </a>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-amber-600">Tap to open the app · prices may vary</p>
    </div>
  );
}
