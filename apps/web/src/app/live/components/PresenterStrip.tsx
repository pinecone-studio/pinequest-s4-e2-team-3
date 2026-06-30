"use client";

import { PauseIcon, PlayIcon, WalkIcon } from "@/components/icons";

// Recessed "presenter" strip: the demo/dev controls, deliberately low-emphasis so
// they read as a tool rather than product chrome. Drives the on-stage walkthrough
// (simulate arrival → walk to next), plus offline preview and route switching.
export function PresenterStrip({
  arrived,
  currentName,
  nextName,
  offlineSaved,
  offlinePreview,
  simulating,
  onArrive,
  onWalkNext,
  onToggleSimulate,
  onTogglePreview,
  onChangeRoute,
}: {
  arrived: boolean;
  currentName: string;
  nextName?: string;
  offlineSaved: boolean;
  offlinePreview: boolean;
  simulating: boolean;
  onArrive: () => void;
  onWalkNext: () => void;
  onToggleSimulate: () => void;
  onTogglePreview: () => void;
  onChangeRoute: () => void;
}) {
  return (
    <div className="pointer-events-auto mt-3 flex flex-wrap items-center gap-1.5 rounded-2xl bg-ink/[0.04] p-1.5 dark:bg-white/[0.04]">
      <span className="pl-2 pr-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-muted/60 dark:text-white/30">
        Demo
      </span>

      {/* Auto-walk the whole route hands-free (the headline demo control). */}
      <button
        onClick={onToggleSimulate}
        title="Auto-walk the route"
        className={[
          "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors",
          simulating
            ? "bg-safety-safe text-white"
            : "bg-primary-600 text-white hover:bg-primary-700",
        ].join(" ")}
      >
        {simulating ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
        {simulating ? "Walking…" : "Auto-walk"}
      </button>

      {!arrived ? (
        <button
          onClick={onArrive}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-ink/5 px-3 py-2 text-xs font-bold text-ink hover:bg-ink/10 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15"
        >
          <WalkIcon size={14} /> Arrive
        </button>
      ) : nextName ? (
        <button
          onClick={onWalkNext}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-ink/5 px-3 py-2 text-xs font-bold text-ink hover:bg-ink/10 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15"
        >
          <WalkIcon size={14} /> Next
        </button>
      ) : (
        <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-ink/5 px-3 py-2 text-xs font-bold text-ink-muted dark:bg-white/5 dark:text-white/40">
          Arrived
        </span>
      )}

      {offlineSaved && (
        <button
          onClick={onTogglePreview}
          title="Preview how the journey looks with no internet"
          className={[
            "shrink-0 rounded-xl px-2.5 py-2 text-xs font-bold transition-colors",
            offlinePreview
              ? "bg-safety-armed text-white"
              : "bg-ink/5 text-ink-muted hover:bg-ink/10 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/15",
          ].join(" ")}
        >
          {offlinePreview ? "Offline view" : "Preview offline"}
        </button>
      )}

      <button
        onClick={onChangeRoute}
        title="Change route"
        className="shrink-0 rounded-xl bg-ink/5 px-2.5 py-2 text-xs font-bold text-ink-muted hover:bg-ink/10 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/15"
      >
        Routes
      </button>
    </div>
  );
}
