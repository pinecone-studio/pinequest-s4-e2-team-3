import { useEffect, useState } from "react";
import type { Theme } from "../types";

// Local light/night theme just for the Live Guide screen. Night (dark) is the
// default since this screen is designed dark-first; the choice is remembered.
export function useLiveTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("live-theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  const toggleTheme = () =>
    setTheme((t) => {
      const next: Theme = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("live-theme", next);
      } catch {
        /* ignore storage failures (private mode etc.) */
      }
      return next;
    });

  return { theme, toggleTheme };
}
