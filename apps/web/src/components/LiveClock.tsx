"use client";

import { useEffect, useState } from "react";

// Live Ulaanbaatar local time (Asia/Ulaanbaatar), updated each minute.
// Useful the moment a traveller lands — jet lag and planning the day.
function ulaanbaatarTime(): string {
  return new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ulaanbaatar",
  });
}

export function LiveClock() {
  // Empty on first paint so server and client markup match, then fill on mount.
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => setTime(ulaanbaatarTime());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return <span suppressHydrationWarning>{time || "—"}</span>;
}
