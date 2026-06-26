import { StarIcon } from "@/components/icons";

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon
          key={i}
          size={size}
          className={
            i < full ? "text-amber-400"
            : i === full && half ? "text-amber-300"
            : "text-ink/20"
          }
        />
      ))}
    </div>
  );
}
