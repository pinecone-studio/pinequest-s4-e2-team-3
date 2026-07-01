"use client";

import { useEffect, useRef, useState } from "react";
import { WarningIcon } from "./icons";

const COUNTDOWN_SECS = 15;

export interface DeadSwitchDemoState {
  open: boolean;
  secs: number;
  result: "ok" | "help" | null;
  trigger: () => void;
  approve: () => void;
  decline: () => void;
}

// Shared demo state, split from the rendering so the trigger button (docked
// outside the phone bezel) and the overlay (clipped inside the phone screen)
// can live in two different places in the tree.
export function useDeadSwitchDemo(): DeadSwitchDemoState {
  const [open, setOpen] = useState(false);
  const [secs, setSecs] = useState(COUNTDOWN_SECS);
  const [result, setResult] = useState<"ok" | "help" | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function close() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setOpen(false);
  }

  function trigger() {
    setSecs(COUNTDOWN_SECS);
    setResult(null);
    setOpen(true);
  }

  function approve() {
    setResult("ok");
    setTimeout(close, 1200);
  }

  function decline() {
    setResult("help");
    setTimeout(close, 1200);
  }

  useEffect(() => {
    if (!open || result) return;

    intervalRef.current = setInterval(() => {
      setSecs((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setResult("help");
          setTimeout(close, 1200);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, result]);

  return { open, secs, result, trigger, approve, decline };
}

export function DeadSwitchTrigger({
  demo,
  style,
}: {
  demo: DeadSwitchDemoState;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={demo.trigger}
      aria-label="Demo dead switch"
      style={{
        position: "fixed",
        right: 16,
        bottom: 120,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        zIndex: 50,
        ...style,
      }}
    >
      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", userSelect: "none" }}>
        DEMO
      </span>
      <span style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        background: "rgba(217,131,31,0.15)",
        border: "1px solid rgba(217,131,31,0.45)",
        borderRadius: 14,
        padding: "10px 6px",
        width: 44,
        transition: "background 0.2s, border-color 0.2s",
      }}>
        {/* No-signal wifi icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D9831F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <circle cx="12" cy="20" r="1" fill="#D9831F" />
        </svg>
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.06em", color: "#D9831F", textTransform: "uppercase", userSelect: "none", lineHeight: 1 }}>
          Switch
        </span>
      </span>
    </button>
  );
}

// Renders full-bleed inside the phone's screen container (which already clips
// to the screen's rounded corners), so it reads as an in-app modal rather
// than a browser-wide overlay.
export function DeadSwitchOverlay({ demo }: { demo: DeadSwitchDemoState }) {
  const { open, secs, result } = demo;
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  const mins = Math.floor(secs / 60);
  const ss = secs % 60;
  const timerLabel = `${String(mins).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  const progress = secs / COUNTDOWN_SECS;
  const critical = secs <= 5;

  return (
    <div
      className={`absolute inset-0 z-[65] flex items-center justify-center bg-ink/95 px-5 transition-opacity motion-reduce:transition-none duration-300 ease-out ${entered ? "opacity-100" : "opacity-0"}`}
    >
      <div
        className={`w-full rounded-3xl bg-sand px-6 py-7 text-center shadow-2xl transition-[opacity,transform] motion-reduce:transition-none duration-300 ease-out ${entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-safety-armed/30 bg-safety-armed/15">
          <WarningIcon size={28} className="text-safety-armed" />
        </div>

        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
          Dead Man&apos;s Switch
        </p>
        <h2 className="mb-2.5 font-serif text-[32px] leading-none text-ink">Activate the switch?</h2>
        <p className="mb-5 text-sm leading-5 text-ink-muted">
          <span className="font-semibold text-ink">Emergency Contact</span>{" "}
          will be alerted unless you cancel.
        </p>

        <div className="mb-2.5 flex items-baseline justify-center gap-2">
          <span className="font-mono text-[32px] font-bold tabular-nums text-ink">
            {result ? (result === "ok" ? "Cancelled" : "Turning on…") : timerLabel}
          </span>
          {!result && (
            <span className="text-xs text-ink-muted">until auto-alert</span>
          )}
        </div>

        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
          <div
            className={`h-full rounded-full transition-[width,background-color] duration-1000 ease-linear ${critical ? "bg-safety-critical" : "bg-safety-armed"}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {!result && (
          <>
            <button
              onClick={demo.decline}
              className="mb-3 w-full rounded-2xl bg-safety-safe py-4 text-[17px] font-bold text-white transition-opacity active:opacity-90"
            >
              Turn On
            </button>
            <button
              onClick={demo.approve}
              className="w-full rounded-2xl bg-safety-critical py-4 text-[17px] font-bold text-white transition-opacity active:opacity-90"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
