"use client";

import { Moon, Sun } from "lucide-react";
import type { Theme } from "../types";

// Sun in night mode (tap → go light), Moon in light mode (tap → go night).
export function ThemeToggle({
  theme,
  onToggle,
  className,
}: {
  theme: Theme;
  onToggle: () => void;
  className?: string;
}) {
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to night mode"}
      title={isDark ? "Light mode" : "Night mode"}
      className={[
        "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
        "bg-ink/5 text-ink hover:bg-ink/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
        className ?? "",
      ].join(" ")}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
