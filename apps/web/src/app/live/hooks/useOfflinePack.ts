import { useEffect, useRef, useState } from "react";
import { hasPack, savePack } from "@/lib/offline";
import { useLocationStore } from "@/stores/locationStore";
import type { DemoRoute } from "@/types";

// Owns the offline travel pack for the active route: whether it's saved, the
// save-in-progress state, and the build action. On route activation it reflects
// an existing pack, else auto-builds one once while online so the journey is
// ready when the signal drops.
export function useOfflinePack(
  activeRoute: DemoRoute | null,
  offlineReadyIds: string[],
  setOfflineReady: (id: string) => void,
) {
  const offlineSaved = activeRoute ? offlineReadyIds.includes(activeRoute.id) : false;
  const [saving, setSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState<{ done: number; total: number } | null>(null);
  const savingRef = useRef(false);
  // Live position, read at save time so the pack caches a road route from where the
  // traveller actually is to the first stop (for the offline approach connector).
  const position = useLocationStore((s) => s.coordinates);
  const positionRef = useRef(position);
  positionRef.current = position;

  // Build (or rebuild) the offline pack: AI narration text + voice audio + map.
  const downloadPack = async () => {
    if (!activeRoute || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSavingProgress({ done: 0, total: activeRoute.stops.length });
    try {
      await savePack(activeRoute, (done, total) => setSavingProgress({ done, total }), positionRef.current);
      setOfflineReady(activeRoute.id);
    } finally {
      savingRef.current = false;
      setSaving(false);
      setSavingProgress(null);
    }
  };

  // On route activation: reflect an existing pack, else auto-build it once while
  // online so the journey is ready when the signal drops.
  useEffect(() => {
    if (!activeRoute) return;
    if (hasPack(activeRoute.id)) setOfflineReady(activeRoute.id);
    else if (navigator.onLine) void downloadPack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoute?.id]);

  return { offlineSaved, saving, savingProgress, downloadPack };
}
