"use client";

import { useLiveStore } from "@/stores/liveStore";
import { useLocation } from "@/hooks/useLocation";
import { useLiveTheme } from "./hooks/useLiveTheme";
import { LiveBackground } from "./components/LiveBackground";
import { LiveExperience } from "./components/LiveExperience";
import { RoutePicker } from "./components/RoutePicker";

// The live guide. It sits outside the (app) shell, so it has no sidebar/tab bar
// — just the map and the narration card. Defaults to night mode; the toggle in
// the top bar switches it to light. `.dark` is scoped to this wrapper, so the
// rest of the app is unaffected.
export default function LiveGuidePage() {
  const activeRoute = useLiveStore((s) => s.activeRoute);
  const mapType = useLiveStore((s) => s.mapType);
  // Begin watching real GPS as soon as the screen mounts.
  useLocation();
  const { theme, toggleTheme } = useLiveTheme();

  // On satellite, the dark chrome (white text + dark scrim) reads best over the
  // imagery — so force the dark theme there regardless of the toggle. Off
  // satellite, the toggle works normally.
  const satellite = !!activeRoute && mapType === "hybrid";
  const isDark = theme === "dark" || satellite;

  // The `dark` class lives on the OUTER element; the themed colours live on the
  // inner element. Tailwind's class strategy compiles `dark:` to a descendant
  // selector (`.dark .dark\:bg-…`), so an element can't theme itself — the inner
  // div must be a *child* of the one carrying `.dark`.
  return (
    <div className={isDark ? "dark" : ""}>
      <div className="relative min-h-screen overflow-hidden bg-[#eef2fb] text-ink transition-colors dark:bg-[#0d1422] dark:text-white">
        {/* Route picker uses the wrapper's plain solid background — no map backdrop. */}
        {activeRoute ? <LiveBackground theme={theme} /> : null}
        {/* When a route is live, let pointer events fall THROUGH the empty parts
            of this column to the map behind it, so the map drags/pans like Google
            Maps. The interactive pieces (bars, cards, buttons) re-enable
            pointer-events on themselves. */}
        <div
          className={[
            "relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-6 pt-6",
            activeRoute ? "pointer-events-none" : "",
          ].join(" ")}
        >
          {activeRoute ? (
            <LiveExperience theme={theme} onToggleTheme={toggleTheme} />
          ) : (
            <RoutePicker theme={theme} onToggleTheme={toggleTheme} />
          )}
        </div>
      </div>
    </div>
  );
}
