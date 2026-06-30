"use client";

import { useState } from "react";
import { MicIcon, PauseIcon, PlayIcon, SendIcon } from "@/components/icons";

// The action row under Michelle's narration: replay/pause, the "ask by text"
// field, and the talk-to-Michelle mic. Owns its own draft state.
export function NarrationControls({
  loading,
  speaking,
  busy,
  listening,
  offline,
  voiceInSupported,
  onReplay,
  onPause,
  onMic,
  onAsk,
}: {
  loading: boolean;
  speaking: boolean;
  busy: boolean;
  listening: boolean;
  offline: boolean;
  voiceInSupported: boolean;
  onReplay: () => void;
  onPause: () => void;
  onMic: () => void;
  onAsk: (q: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const submit = () => {
    if (!draft.trim()) return;
    onAsk(draft.trim());
    setDraft("");
  };

  return (
    <div className="mt-4 flex items-center gap-2">
      <button
        onClick={speaking ? onPause : onReplay}
        disabled={loading}
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white transition-opacity",
          loading ? "opacity-70" : "",
        ].join(" ")}
        aria-label={loading ? "Preparing" : speaking ? "Pause" : "Replay"}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : speaking ? (
          <PauseIcon size={18} />
        ) : (
          <PlayIcon size={16} />
        )}
      </button>

      {/* Ask by text/voice needs the chat backend — disabled offline. */}
      <div
        className={[
          "flex flex-1 items-center gap-2 rounded-full bg-ink/5 px-4 py-2 ring-primary-500/40 transition-shadow focus-within:ring-2 dark:bg-white/10",
          offline ? "opacity-50" : "",
        ].join(" ")}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          disabled={offline}
          placeholder={offline ? "Offline — no connection" : "Ask Michelle…"}
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-muted disabled:cursor-not-allowed dark:placeholder:text-white/40"
        />
        <button
          onClick={submit}
          disabled={offline}
          aria-label="Send"
          className={
            draft.trim() && !offline
              ? "text-primary-600 dark:text-primary-400"
              : "text-ink-muted dark:text-white/40"
          }
        >
          <SendIcon size={16} />
        </button>
      </div>

      {voiceInSupported && (
        <button
          onClick={onMic}
          disabled={busy || offline}
          aria-label={offline ? "Offline — voice needs a connection" : busy ? "Pause Michelle to talk" : "Talk to Michelle"}
          title={offline ? "Offline — voice needs a connection" : busy ? "Pause Michelle to talk" : "Talk to Michelle"}
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
            busy || offline
              ? "cursor-not-allowed bg-ink/5 text-ink-muted/40 dark:bg-white/5 dark:text-white/20"
              : listening
                ? "bg-safety-critical text-white"
                : "bg-ink/5 text-ink dark:bg-white/10 dark:text-white",
          ].join(" ")}
        >
          <MicIcon size={18} />
        </button>
      )}
    </div>
  );
}
