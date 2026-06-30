"use client";

import { RotateCcw } from "lucide-react";
import { PauseIcon, PlayIcon, WalkIcon } from "@/components/icons";
import type { WeatherNow } from "@/lib/weather";
import type { DemoRoute, RouteStop } from "@/types";
import type { Theme } from "../types";
import { TopBar } from "./TopBar";
import { JourneyPill } from "./JourneyPill";

// The top chrome of the live experience: the bar (back / layers / theme / SOS),
// the HUD row (location pill + stop counter + quick demo actions), and the
// offline-save / offline-preview status banners.
export function LiveHud({
  theme,
  onToggleTheme,
  onBack,
  activeRoute,
  currentStop,
  weather,
  currentStopIndex,
  nextStop,
  simulating,
  onWalkNext,
  onToggleSim,
  onRestart,
  savingProgress,
  forceOffline,
  offlineSaved,
}: {
  theme: Theme;
  onToggleTheme: () => void;
  onBack: () => void;
  activeRoute: DemoRoute | null;
  currentStop: RouteStop | null;
  weather: WeatherNow | null;
  currentStopIndex: number;
  nextStop: RouteStop | null;
  simulating: boolean;
  onWalkNext: () => void;
  onToggleSim: () => void;
  onRestart: () => void;
  savingProgress: { done: number; total: number } | null;
  forceOffline: boolean;
  offlineSaved: boolean;
}) {
  return (
    <>
      <TopBar theme={theme} onToggleTheme={onToggleTheme} onBack={onBack} />

      {/* HUD row: location pill + stop counter + quick demo actions */}
      <div className="pointer-events-auto mt-3 flex items-center gap-2">
        <JourneyPill currentName={currentStop?.name ?? ""} weather={weather} />

        {/* Stop number badge — shows current position in the route */}
        {activeRoute && (
          <span className="flex items-baseline gap-0.5 rounded-full bg-ink/[0.08] px-2.5 py-1.5 text-xs font-bold leading-none backdrop-blur-sm dark:bg-white/[0.12]">
            <span className="text-ink dark:text-white">{currentStopIndex + 1}</span>
            <span className="text-ink-muted/60 dark:text-white/30">/{activeRoute.stops.length}</span>
          </span>
        )}

        {/* Quick action buttons — icon-only so the row fits on any screen width */}
        {nextStop && (
          <button
            type="button"
            onClick={onWalkNext}
            aria-label="Walk to next stop"
            title="Next stop"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/[0.08] backdrop-blur-sm dark:bg-white/[0.12]"
          >
            <WalkIcon size={13} />
          </button>
        )}

        <button
          type="button"
          onClick={onToggleSim}
          aria-label={simulating ? "Stop auto-walk" : "Start auto-walk"}
          title={simulating ? "Stop" : "Auto-walk"}
          className={[
            "flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm",
            simulating ? "bg-safety-safe text-white" : "bg-ink/[0.08] dark:bg-white/[0.12]",
          ].join(" ")}
        >
          {simulating ? <PauseIcon size={13} /> : <PlayIcon size={13} />}
        </button>

        <button
          type="button"
          onClick={onRestart}
          aria-label="Restart route from the beginning"
          title="Reset to start"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/[0.08] backdrop-blur-sm dark:bg-white/[0.12]"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {savingProgress && (
        <div className="pointer-events-none mt-2 flex items-center gap-2 self-start rounded-full bg-ink/5 px-3 py-1.5 text-xs font-semibold text-ink-muted dark:bg-white/10 dark:text-white/60">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
          Preparing offline guide… {savingProgress.done}/{savingProgress.total}
        </div>
      )}

      {forceOffline && !savingProgress && (
        <div className="pointer-events-none mt-2 self-start rounded-full bg-ink/80 px-3 py-1.5 text-xs font-bold text-white shadow-sm dark:bg-white/15">
          {offlineSaved
            ? "📦 Offline preview — saved map, text & voice"
            : "📦 Offline preview — nothing saved yet, reconnect to prepare"}
        </div>
      )}
    </>
  );
}
