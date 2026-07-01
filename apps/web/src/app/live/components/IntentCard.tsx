"use client";

import { ChevronLeftIcon } from "@/components/icons";

// "Somewhere else" → Michelle asks what the traveller's after; a chip (or just
// talking to her) drives the nearby recommendation.
export function IntentCard({
  onPick,
  onBack,
}: {
  onPick: (query: string) => void;
  onBack: () => void;
}) {
  // Phrased to make Michelle look up nearby places immediately (the chat prompt
  // otherwise asks a clarifying question for vague requests → no map markers).
  const options: { emoji: string; label: string; query: string }[] = [
    { emoji: "🍽️", label: "Eat", query: "Show me good places to eat near me right now — list the closest options, don't ask me anything." },
    { emoji: "🏛️", label: "See a sight", query: "Show me sights or museums to visit near me right now — list the closest options, don't ask me anything." },
    { emoji: "☕", label: "Coffee", query: "Show me coffee shops near me right now — list the closest options, don't ask me anything." },
    { emoji: "🌳", label: "Rest", query: "Show me parks or quiet spots to rest near me right now — list the closest options, don't ask me anything." },
  ];
  return (
    <div className="pointer-events-auto animate-rise mt-3 rounded-3xl bg-white p-3 shadow-sm backdrop-blur-md dark:bg-[#131b2c]/90 dark:shadow-none dark:ring-1 dark:ring-white/10">
      <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted dark:text-white/50">
        What do you feel like?
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((o) => (
          <button
            key={o.label}
            onClick={() => onPick(o.query)}
            className="flex items-center justify-center gap-2 rounded-full bg-ink/5 py-2.5 text-sm font-bold text-ink hover:bg-ink/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            <span className="text-base">{o.emoji}</span> {o.label}
          </button>
        ))}
      </div>
      <p className="px-1 pt-2 text-xs text-ink-muted dark:text-white/50">
        Or just tell Michelle what you’re after.
      </p>
      <button
        onClick={onBack}
        className="mt-1 flex w-full items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-ink-muted dark:text-white/50"
      >
        <ChevronLeftIcon size={14} /> Back
      </button>
    </div>
  );
}
