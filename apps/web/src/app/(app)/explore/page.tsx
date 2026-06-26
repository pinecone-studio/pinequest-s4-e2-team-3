import { SearchIcon } from "@/components/icons";
import { CategoryChips } from "./CategoryChips";
import { PlacesList } from "./PlacesList";
import { GuideBanner } from "./GuideBanner";

const EXPLORE_CATEGORIES = ["All", "Food", "Viewpoints", "Culture", "History"];

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category = "All" } = await searchParams;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-serif text-4xl leading-none text-ink">
          Explore Ulaanbaatar
        </h1>
      </header>

      <SearchBar />
      <CategoryChips categories={EXPLORE_CATEGORIES} selected={category} />
      <GuideBanner />
      <PlacesList category={category} />
    </div>
  );
}

function SearchBar() {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white px-4 py-3 shadow-ink-sm">
      <SearchIcon size={18} className="text-ink-muted" />
      <input
        type="text"
        placeholder="Search places, food, events…"
        className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
      />
    </div>
  );
}

