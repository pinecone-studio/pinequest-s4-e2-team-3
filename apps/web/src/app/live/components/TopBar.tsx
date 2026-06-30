"use client";

import Link from "next/link";
import { Layers } from "lucide-react";
import { ChevronLeftIcon } from "@/components/icons";
import { useLiveStore } from "@/stores/liveStore";
import { useOnlineStatus } from "@/context/OnlineStatus";
import type { Theme } from "../types";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar({
  theme,
  onToggleTheme,
  onBack,
}: {
  theme: Theme;
  onToggleTheme: () => void;
  // Back returns to the route picker (clears the active route), not all the way home.
  onBack: () => void;
}) {
  const mapType = useLiveStore((s) => s.mapType);
  const toggleMapType = useLiveStore((s) => s.toggleMapType);
  const forceOffline = useLiveStore((s) => s.forceOffline);
  const { online } = useOnlineStatus();
  const satellite = mapType === "hybrid";
  // The satellite/map toggle only affects the online Google map — hide it offline.
  const showLayers = online && !forceOffline;
  return (
    <div className="pointer-events-auto flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to routes"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/5 dark:bg-white/10"
      >
        <ChevronLeftIcon size={20} />
      </button>

      {showLayers && (
        <button
          type="button"
          onClick={toggleMapType}
          aria-label={satellite ? "Switch to map view" : "Switch to satellite view"}
          title={satellite ? "Map view" : "Satellite view"}
          className={[
            "ml-auto flex h-10 w-10 items-center justify-center rounded-full transition-colors",
            satellite
              ? "bg-primary-600 text-white"
              : "bg-ink/5 text-ink hover:bg-ink/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
          ].join(" ")}
        >
          <Layers size={18} />
        </button>
      )}

      {/* Satellite forces light chrome, so the light/dark toggle is hidden there. */}
      {!satellite && (
        <ThemeToggle theme={theme} onToggle={onToggleTheme} className={showLayers ? "" : "ml-auto"} />
      )}

      <Link
        href="/sos"
        className="flex h-10 items-center rounded-full bg-safety-critical px-4 text-xs font-extrabold tracking-wide text-white"
      >
        SOS
      </Link>
    </div>
  );
}
