"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { logSosIncident } from "@/lib/sosIncidents";

interface OnlineStatusValue {
  online: boolean;
}

const OnlineStatusContext = createContext<OnlineStatusValue>({ online: true });

const PROBE_INTERVAL_MS = 30_000;

// Flushes any SOS incidents that were queued while offline.
function flushQueuedSosIncidents() {
  try {
    const raw = localStorage.getItem("sos:queued_incidents");
    if (!raw) return;
    const queued: Record<string, unknown>[] = JSON.parse(raw);
    if (!queued.length) return;
    localStorage.removeItem("sos:queued_incidents");
    for (const incident of queued) {
      logSosIncident(incident as unknown as Parameters<typeof logSosIncident>[0]).catch(() => {});
    }
  } catch {
    // ignore storage errors
  }
}

export function OnlineStatusProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [forcedOffline, setForcedOffline] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track the previous value so we only flush on the offline→online transition.
  const prevOnlineRef = useRef(true);

  // Listen for demo toggle messages from a parent frame (preview page button).
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "PINEQUEST_DEMO_OFFLINE") {
        setForcedOffline(Boolean(e.data.forced));
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    // Initialise from the browser's own flag immediately.
    setOnline(navigator.onLine);
    prevOnlineRef.current = navigator.onLine;

    async function probe() {
      try {
        const res = await fetch("/api/health", { method: "HEAD", cache: "no-store" });
        const reachable = res.ok;
        setOnline((prev) => {
          if (!prev && reachable) flushQueuedSosIncidents();
          prevOnlineRef.current = reachable;
          return reachable;
        });
      } catch {
        prevOnlineRef.current = false;
        setOnline(false);
      }
    }

    const handleOnline = () => {
      // Browser says we're back — run an immediate probe to confirm.
      probe();
    };
    const handleOffline = () => {
      setOnline(false);
      prevOnlineRef.current = false;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    probe();
    intervalRef.current = setInterval(probe, PROBE_INTERVAL_MS);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <OnlineStatusContext.Provider value={{ online: forcedOffline ? false : online }}>
      {children}
    </OnlineStatusContext.Provider>
  );
}

export function useOnlineStatus(): OnlineStatusValue {
  return useContext(OnlineStatusContext);
}
