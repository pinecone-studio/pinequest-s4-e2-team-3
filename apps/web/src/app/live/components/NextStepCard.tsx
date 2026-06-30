"use client";

import type { RouteStop } from "@/types";

// The looping "what's next?" decision card shown at each stop.
export function NextStepCard({
  nextStop,
  stops,
  currentStopId,
  fullPlanOpen,
  onToggleFullPlan,
  onTakeMeThere,
  onSomewhereElse,
  offline = false,
  onPickStop,
  onClose,
}: {
  nextStop: RouteStop | null;
  stops: RouteStop[];
  currentStopId: string | null;
  fullPlanOpen: boolean;
  onToggleFullPlan: () => void;
  onTakeMeThere: () => void;
  onSomewhereElse: () => void;
  offline?: boolean;
  onPickStop: (stop: RouteStop) => void;
  onClose: () => void;
}) {
  return (
    <div className="pointer-events-auto animate-rise mt-3 rounded-3xl bg-white p-3 shadow-sm dark:bg-white/[0.07] dark:shadow-none">
      <div className="flex items-center justify-between px-1 pb-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted dark:text-white/50">
          {nextStop ? `Next stop: ${nextStop.name}` : "You're at your last stop"}
        </p>
        <button onClick={onClose} className="text-xs font-semibold text-ink-muted dark:text-white/50">
          Hide
        </button>
      </div>

      <div className="flex flex-col items-center gap-2">
        {nextStop && (
          <button
            onClick={onTakeMeThere}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-600 py-2.5 text-sm font-bold text-white"
          >
            Take me there
          </button>
        )}
        {/* Secondary actions as lightweight text links */}
        <div className="flex items-center gap-5 py-0.5">
          {!offline && (
            <button
              onClick={onSomewhereElse}
              className="text-xs font-semibold text-ink-muted hover:text-ink dark:text-white/50 dark:hover:text-white/80"
            >
              Somewhere else
            </button>
          )}
          <button
            onClick={onToggleFullPlan}
            className="text-xs font-semibold text-ink-muted hover:text-ink dark:text-white/50 dark:hover:text-white/80"
          >
            {fullPlanOpen ? "Hide full plan" : "View full plan"}
          </button>
        </div>
      </div>

      {fullPlanOpen && (
        <div className="mt-2 flex flex-col gap-1.5 border-t border-ink/5 pt-2 dark:border-white/10">
          {stops.map((s, i) => (
            <button
              key={s.id}
              onClick={() => onPickStop(s)}
              className="flex items-start gap-2 rounded-xl bg-ink/5 px-3 py-2 text-left hover:bg-ink/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 text-[10px] text-white">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink dark:text-white">
                  {s.name}
                </span>
                {s.context && (
                  <span className="block truncate text-xs text-ink-muted dark:text-white/50">
                    {s.context}
                  </span>
                )}
              </span>
              {s.id === currentStopId && (
                <span className="mt-1 shrink-0 text-xs font-bold text-primary-500">now</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
