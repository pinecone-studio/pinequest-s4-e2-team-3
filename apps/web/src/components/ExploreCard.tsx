"use client";

import { useState } from "react";
import type { ExploreSpot } from "@/types";
import { Tag } from "@/components/Tag";
import { ClockIcon, MapPinIcon, StarIcon, SunIcon } from "@/components/icons";
import { DirectionsSheet } from "@/components/DirectionsSheet";

type ExploreCardProps = {
  spot: ExploreSpot;
};

export function ExploreCard({ spot }: ExploreCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <article
        onClick={() => setOpen(true)}
        className="cursor-pointer overflow-hidden rounded-3xl bg-white shadow-sm active:scale-[0.99] transition-transform"
      >
        <div className="relative h-44">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={spot.imageUrl}
            alt={spot.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute left-3 top-3">
            <Tag label={spot.category} tone={spot.categoryTone} />
          </div>
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-xs font-bold text-white">
            <StarIcon size={12} className="text-white" />
            {spot.rating}
          </span>
          {spot.highlight ? (
            <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-sm">
              <SunIcon size={14} className="text-safety-armed" />
              {spot.highlight}
            </span>
          ) : null}
        </div>

        <div className="p-4">
          <h3 className="text-lg font-bold text-ink">{spot.title}</h3>
          <div className="mt-2 flex items-center gap-4 text-xs font-semibold text-ink-muted">
            <span className="flex items-center gap-1">
              <MapPinIcon size={14} />
              {spot.distance}
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon size={14} />
              {spot.walkTime}
            </span>
          </div>
          <p className="mt-2 text-sm text-ink-muted">{spot.description}</p>
        </div>
      </article>

      {open && <DirectionsSheet spot={spot} onClose={() => setOpen(false)} />}
    </>
  );
}
