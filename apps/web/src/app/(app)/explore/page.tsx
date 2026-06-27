import { CategoryChips } from "./CategoryChips";
import { ExploreContent } from "./ExploreContent";

const EXPLORE_CATEGORIES = [
  "All", "Food", "Coffee", "Viewpoints",
  "Culture", "History", "Nature", "Shopping", "Nightlife", "Hotels",
];

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

      <CategoryChips categories={EXPLORE_CATEGORIES} selected={category} />
      <ExploreContent category={category} />
    </div>
  );
}

