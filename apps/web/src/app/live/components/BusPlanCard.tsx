"use client";

import type { BusStep } from "@/lib/transit";

// The bus route's steps: which bus to board, where to get on/off, walk segments.
export function BusPlanCard({ steps, onClose }: { steps: BusStep[]; onClose: () => void }) {
  return (
    <div className="pointer-events-auto animate-rise mt-3 rounded-3xl bg-white p-3 shadow-sm backdrop-blur-md dark:bg-[#131b2c]/90 dark:shadow-none dark:ring-1 dark:ring-white/10">
      <div className="flex items-center justify-between px-1 pb-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted dark:text-white/50">
          🚌 Your bus route
        </p>
        <button onClick={onClose} className="text-xs font-semibold text-ink-muted dark:text-white/50">
          Hide
        </button>
      </div>
      <ol className="space-y-2.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-0.5 shrink-0 text-base">{s.mode === "transit" ? "🚌" : "🚶"}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink dark:text-white">{s.text}</p>
              {s.sub && <p className="text-xs text-ink-muted dark:text-white/50">{s.sub}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
