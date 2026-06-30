"use client";

import { useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "@/context/OnlineStatus";

type PillState = "offline" | "reconnected" | "hidden";

/**
 * A persistent, calm floating pill that appears when connectivity changes.
 * - Goes offline  → "Offline — some features limited" (stays until online)
 * - Comes online  → "Back online" (auto-dismisses after 3 s)
 * Positioned above the bottom navigation so it never blocks content.
 */
export function OfflineStatusPill() {
  const { online } = useOnlineStatus();
  const [pillState, setPillState] = useState<PillState>("hidden");
  const initialized = useRef(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      // Show immediately if the app boots while offline.
      if (!online) setPillState("offline");
      return;
    }

    if (dismissTimer.current) clearTimeout(dismissTimer.current);

    if (!online) {
      setPillState("offline");
    } else {
      setPillState("reconnected");
      dismissTimer.current = setTimeout(() => setPillState("hidden"), 3000);
    }

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [online]);

  if (pillState === "hidden") return null;

  const isOffline = pillState === "offline";

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "fixed bottom-28 left-1/2 z-[60] -translate-x-1/2",
        "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg",
        "transition-opacity duration-300",
        isOffline ? "bg-ink text-white" : "bg-safety-safe text-white",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          isOffline ? "bg-white/50" : "bg-white",
        ].join(" ")}
        aria-hidden
      />
      {isOffline ? "Offline — some features limited" : "Back online"}
    </div>
  );
}
