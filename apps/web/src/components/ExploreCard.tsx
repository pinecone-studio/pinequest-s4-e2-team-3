import type { ExploreSpot } from "@/types";
import { Tag } from "@/components/Tag";
import { ClockIcon, MapPinIcon, StarIcon, SunIcon } from "@/components/icons";

type ExploreCardProps = {
  spot: ExploreSpot;
};

// Large featured place card used on Explore: a photo with the category pill and
// rating over it, then a white panel with the title, meta and description.
export function ExploreCard({ spot }: ExploreCardProps) {
  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-sm">
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
  );
}
