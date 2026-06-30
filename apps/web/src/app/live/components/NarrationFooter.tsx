"use client";

// The footer under the narration card: the "···/Less" extras toggle and, when no
// other card is open, the "What's next? →" / "↩ Back to route" advance button.
export function NarrationFooter({
  showExtras,
  onToggleExtras,
  canAdvance,
  detour,
  onAdvance,
}: {
  showExtras: boolean;
  onToggleExtras: () => void;
  canAdvance: boolean;
  detour: boolean;
  onAdvance: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onToggleExtras}
        className="text-[11px] font-semibold text-ink-muted/60 hover:text-ink-muted dark:text-white/30 dark:hover:text-white/50"
      >
        {showExtras ? "Less" : "···"}
      </button>
      {canAdvance ? (
        <button
          onClick={onAdvance}
          className={[
            "text-xs font-bold",
            detour
              ? "text-primary-600 dark:text-primary-400"
              : "text-ink-muted hover:text-ink dark:text-white/40 dark:hover:text-white/70",
          ].join(" ")}
        >
          {detour ? "↩ Back to route" : "What's next? →"}
        </button>
      ) : null}
    </div>
  );
}
