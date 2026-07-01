"use client";

import { type ReactNode, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { BarsIcon, SparklesIcon } from "@/components/icons";
import { NarrationTeaser } from "./NarrationTeaser";
import { NarrationControls } from "./NarrationControls";

export function NarrationCard({
  speaking,
  thinking,
  audioLoading,
  listening,
  text,
  isAnswer,
  voiceError,
  voiceInSupported,
  offline = false,
  onReplay,
  onPause,
  onMic,
  onAsk,
  footer,
}: {
  speaking: boolean;
  thinking: boolean;
  audioLoading: boolean;
  listening: boolean;
  text: string;
  isAnswer: boolean;
  voiceError: string | null;
  voiceInSupported: boolean;
  offline?: boolean;
  onReplay: () => void;
  onPause: () => void;
  onMic: () => void;
  onAsk: (q: string) => void;
  footer?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  // Panel starts collapsed — one-line teaser; user taps to expand.
  const [panelOpen, setPanelOpen] = useState(false);
  const isLong = text.length > 150;

  // Re-collapse text expansion when narration changes.
  useEffect(() => setExpanded(false), [text]);

  const loading = thinking || audioLoading;
  // Michelle is "busy" whenever she's thinking, preparing, or speaking — the user
  // must pause her before they can talk (otherwise the voices overlap and lag).
  const busy = loading || speaking;

  const status = listening
    ? "listening…"
    : thinking
      ? "thinking…"
      : audioLoading
        ? "preparing…"
        : speaking
          ? "speaking…"
          : isAnswer
            ? "answer"
            : "your guide";

  // Status dot colour — matches the state at a glance.
  const dotColor = listening
    ? "bg-safety-critical"
    : loading
      ? "bg-safety-armed"
      : speaking
        ? "bg-safety-safe"
        : "bg-ink-muted/40 dark:bg-white/30";

  if (!panelOpen) {
    return <NarrationTeaser text={text} loading={loading} onOpen={() => setPanelOpen(true)} />;
  }

  // Expanded full panel.
  return (
    <div className="pointer-events-auto rounded-3xl bg-white p-5 shadow-sm backdrop-blur-md dark:bg-[#131b2c]/90 dark:shadow-none dark:ring-1 dark:ring-white/10">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white">
          <SparklesIcon size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight">Michelle</p>
          {voiceError ? (
            <p className="text-xs font-semibold text-safety-critical">{voiceError}</p>
          ) : status !== "your guide" ? (
            <p className="flex items-center gap-1.5 text-xs text-ink-muted dark:text-white/60">
              <span className={["h-1.5 w-1.5 rounded-full", dotColor].join(" ")} />
              {status}
            </p>
          ) : null}
        </div>
        {loading ? (
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500"
            role="status"
            aria-label="Michelle is preparing"
          />
        ) : (
          <BarsIcon size={22} className="text-primary-500 transition-colors" />
        )}
        <button
          type="button"
          onClick={() => setPanelOpen(false)}
          aria-label="Collapse Michelle assistant"
          aria-expanded={true}
          className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted/60 hover:bg-ink/5 dark:text-white/30 dark:hover:bg-white/10"
        >
          <ChevronDown size={16} className="rotate-180" />
        </button>
      </div>

      <p
        key={text}
        className={[
          "animate-rise mt-4 text-lg leading-snug",
          !expanded && isLong ? "line-clamp-3" : "",
        ].join(" ")}
      >
        {text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1.5 text-xs font-bold text-primary-600 hover:text-primary-500 dark:text-primary-500 dark:hover:text-primary-400"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}

      <NarrationControls
        loading={loading}
        speaking={speaking}
        busy={busy}
        listening={listening}
        offline={offline}
        voiceInSupported={voiceInSupported}
        onReplay={onReplay}
        onPause={onPause}
        onMic={onMic}
        onAsk={onAsk}
      />

      {footer && (
        <div className="mt-3 border-t border-ink/5 pt-3 dark:border-white/[0.06]">
          {footer}
        </div>
      )}
    </div>
  );
}
