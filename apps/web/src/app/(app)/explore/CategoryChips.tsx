"use client";

import { useRouter, usePathname } from "next/navigation";

type Props = {
  categories: string[];
  selected: string;
};

export function CategoryChips({ categories, selected }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {categories.map((category) => {
        const isSelected = category.toLowerCase() === selected.toLowerCase();
        return (
          <button
            key={category}
            onClick={() => router.push(`${pathname}?category=${category}`)}
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
