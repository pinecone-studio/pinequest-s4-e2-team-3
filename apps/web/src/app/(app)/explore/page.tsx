import { ExploreCard } from "@/components/ExploreCard";
import { SearchIcon, SunIcon } from "@/components/icons";
import { exploreBanner, exploreCategories, exploreSpots, trip } from "@/lib/mockData";

export default function ExplorePage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-serif text-4xl leading-none text-ink">
          Explore {trip.city}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {exploreSpots.length} places nearby
        </p>
      </header>

      <SearchBar />
      <CategoryChips />
      <GuideBanner />

      <div className="space-y-3">
        {exploreSpots.map((spot) => (
          <ExploreCard key={spot.id} spot={spot} />
        ))}
      </div>
    </div>
  );
}

function SearchBar() {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white px-4 py-3 shadow-sm">
      <SearchIcon size={18} className="text-ink-muted" />
      <input
        type="text"
        placeholder="Search attractions, food, events…"
        className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
      />
    </div>
  );
}

// The first category is shown as selected; the rest are resting filters.
function CategoryChips() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {exploreCategories.map((category, index) => {
        const isSelected = index === 0;
        return (
          <button
            key={category}
            className={[
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              isSelected
                ? "bg-primary-600 text-white"
                : "bg-white text-ink-muted hover:text-ink",
            ].join(" ")}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}

// Soft blue note from the guide above the results.
function GuideBanner() {
  return (
    <div className="flex items-start gap-3 rounded-3xl bg-primary-50 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white">
        <SunIcon size={18} />
      </span>
      <p className="text-sm font-medium text-ink">{exploreBanner}</p>
    </div>
  );
}
