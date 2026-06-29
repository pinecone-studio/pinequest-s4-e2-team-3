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

// Current weekday in Ulaanbaatar (Monday, Tuesday, …) — shown instead of a
// trip-day counter. Filled on mount to keep server/client markup in sync.
function ulaanbaatarWeekday(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "Asia/Ulaanbaatar",
  });
}

export function LiveWeekday() {
  const [weekday, setWeekday] = useState("");

  useEffect(() => {
    const tick = () => setWeekday(ulaanbaatarWeekday());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return <span suppressHydrationWarning>{weekday || "—"}</span>;
}
