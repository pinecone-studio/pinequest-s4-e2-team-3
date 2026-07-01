"use client";

import { ChevronDown } from "lucide-react";
import { SparklesIcon } from "@/components/icons";

// Collapsed teaser — avatar + name + truncated message + expand chevron.
export function NarrationTeaser({
  text,
  loading,
  onOpen,
}: {
  text: string;
  loading: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="pointer-events-auto rounded-3xl bg-white px-4 py-3 shadow-sm backdrop-blur-md dark:bg-[#131b2c]/90 dark:shadow-none dark:ring-1 dark:ring-white/10">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Expand Michelle assistant"
        aria-expanded={false}
        className="flex w-full items-center gap-2.5"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white">
          <SparklesIcon size={14} />
        </span>
        <p className="min-w-0 flex-1 truncate text-left text-sm leading-tight">
          <span className="font-bold text-ink dark:text-white">Michelle</span>
          {text ? (
            <span className="ml-1.5 text-ink-muted dark:text-white/55">
              {text.length > 72 ? `${text.slice(0, 72)}…` : text}
            </span>
          ) : null}
        </p>
        {loading ? (
          <span
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500"
            role="status"
            aria-label="Michelle is preparing"
          />
        ) : (
          <ChevronDown size={16} className="shrink-0 text-ink-muted/60 dark:text-white/30" />
        )}
      </button>
    </div>
  );
}
