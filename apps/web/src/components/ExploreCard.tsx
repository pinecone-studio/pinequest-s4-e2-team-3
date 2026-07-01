"use client";

import { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { ExploreSpot } from "@/types";
import { Tag } from "@/components/Tag";
import { ClockIcon, MapPinIcon, StarIcon, SunIcon } from "@/components/icons";

// Pulls in the Google Maps SDK — deferred until a card is actually opened so
// it's not part of the bundle for every page that renders a list of cards.
const DirectionsSheet = dynamic(
  () => import("@/components/DirectionsSheet").then((m) => m.DirectionsSheet),
  { ssr: false },
);

type ExploreCardProps = {
  spot: ExploreSpot;
};

export function ExploreCard({ spot }: ExploreCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <article
        onClick={() => setOpen(true)}
        className="cursor-pointer overflow-hidden rounded-3xl bg-white shadow-ink-sm transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-ink-md active:translate-y-0 active:shadow-ink-sm"
      >
        <div className="relative h-44">
          <Image
            src={spot.imageUrl}
            alt={spot.title}
            fill
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="object-cover"
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

          {/* Star rating */}
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-sm font-bold text-amber-500">{spot.rating.toFixed(1)}</span>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon
                  key={i}
                  size={12}
                  className={
                    i < Math.floor(spot.rating) ? "text-amber-400"
                    : i === Math.floor(spot.rating) && spot.rating % 1 >= 0.5 ? "text-amber-300"
                    : "text-ink/20"
                  }
                />
              ))}
            </div>
          </div>

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
