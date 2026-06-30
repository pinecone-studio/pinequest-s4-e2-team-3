"use client";

import { useState } from "react";
import { ChevronRightIcon, MapPinIcon } from "@/components/icons";
import type { RouteStop } from "@/types";

// Collapsible "Local tips" panel: the product content for the current stop —
// transport, "ask a local" phrases, Google Maps hand-off, and the offline pack.
// Collapsed by default so Michelle's narration stays the hero.
export function LocalTips({
  stop,
  mapsUrl,
  offlineSaved,
  saving,
  onDownload,
}: {
  stop: RouteStop;
  mapsUrl: string;
  offlineSaved: boolean;
  saving: boolean;
  onDownload: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto mb-3 overflow-hidden rounded-2xl bg-ink/[0.04] dark:bg-white/[0.05]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <MapPinIcon size={15} className="shrink-0 text-primary-500" />
        <span className="text-sm font-bold text-ink dark:text-white">Local tips</span>
        <span className="text-xs text-ink-muted/70 dark:text-white/40">
          transport · phrases · map
        </span>
        <ChevronRightIcon
          size={16}
          className={[
            "ml-auto shrink-0 text-ink-muted/70 transition-transform dark:text-white/40",
            open ? "rotate-90" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4">
          {stop.transport && stop.transport.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted dark:text-white/50">
                Getting there
              </p>
              <ul className="mt-2 space-y-1.5">
                {stop.transport.map((t) => (
                  <li
                    key={t.label}
                    className="flex items-center gap-2 text-sm text-ink dark:text-white/80"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                    {t.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {stop.askLocalPhrases && stop.askLocalPhrases.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted dark:text-white/50">
                Ask a local
              </p>
              <ul className="mt-2 space-y-2.5">
                {stop.askLocalPhrases.map((p) => (
                  <li key={p.en}>
                    <p className="text-sm font-semibold text-ink dark:text-white">{p.en}</p>
                    <p className="text-sm text-primary-600 dark:text-primary-500">{p.mn}</p>
                    <p className="text-xs italic text-ink-muted/80 dark:text-white/45">
                      {p.roman}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-full bg-primary-600 py-3 text-sm font-bold text-white dark:bg-white dark:text-primary-900"
          >
            <MapPinIcon size={16} className="text-white dark:text-primary-600" />
            Open route in Google Maps
          </a>

          <button
            onClick={onDownload}
            disabled={saving}
            className={[
              "flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold transition-colors",
              offlineSaved
                ? "bg-safety-safe/20 text-safety-safe"
                : "bg-ink/5 text-ink hover:bg-ink/10 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15",
            ].join(" ")}
          >
            {saving
              ? "Saving…"
              : offlineSaved
                ? "Saved for offline ✓"
                : "Download offline pack"}
          </button>
        </div>
      )}
    </div>
  );
}
