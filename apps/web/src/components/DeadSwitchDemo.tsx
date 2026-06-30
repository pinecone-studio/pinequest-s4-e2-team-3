"use client";

import { useEffect, useRef, useState } from "react";

const COUNTDOWN_SECS = 15;

export function DeadSwitchDemo() {
  const [open, setOpen] = useState(false);
  const [secs, setSecs] = useState(COUNTDOWN_SECS);
  const [result, setResult] = useState<"ok" | "help" | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function openOverlay() {
    setSecs(COUNTDOWN_SECS);
    setResult(null);
    setOpen(true);
  }

  function close() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setOpen(false);
  }

  function handleOkay() {
    setResult("ok");
    setTimeout(close, 1200);
  }

  function handleHelp() {
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
  }, [open, result]);

  const mins = Math.floor(secs / 60);
  const ss = secs % 60;
  const timerLabel = `${String(mins).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  const progress = secs / COUNTDOWN_SECS;

  return (
    <>
      {/* Service Demo trigger — matches PhoneFrame demoToggle style */}
      <button
        onClick={openOverlay}
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
        }}
      >
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(0,0,0,0.28)", textTransform: "uppercase", userSelect: "none" }}>
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

      {/* Full-screen overlay */}
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink/95 px-6">
          <div className="w-full max-w-sm rounded-3xl bg-[#F3EEE6] px-7 py-8 text-center shadow-2xl">

            {/* Icon */}
            <div className="mx-auto mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-amber-500 bg-amber-100">
              <span className="text-3xl leading-none">⚠</span>
            </div>

            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink/40">
              Dead Man&apos;s Switch
            </p>
            <h2 className="mb-2.5 text-[28px] font-bold text-ink">Are you okay?</h2>
            <p className="mb-5 text-sm leading-5 text-ink/50">
              <span className="font-semibold text-ink">Emergency Contact</span>{" "}
              will be alerted if you need help.
            </p>

            {/* Countdown */}
            <div className="mb-2.5 flex items-baseline justify-center gap-2">
              <span className="font-mono text-[36px] font-bold tabular-nums text-ink">
                {result ? (result === "ok" ? "Safe ✓" : "Alerting…") : timerLabel}
              </span>
              {!result && (
                <span className="text-xs text-ink/40">until auto-alert</span>
              )}
            </div>

            {/* Progress bar */}
            <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progress * 100}%`,
                  backgroundColor: secs < 15 ? "#e53935" : "#D9831F",
                  transition: "width 1s linear, background-color 0.3s",
                }}
              />
            </div>

            {/* Buttons */}
            {!result && (
              <>
                <button
                  onClick={handleOkay}
                  className="mb-3 w-full rounded-2xl bg-[#1F9D6B] py-4 text-[17px] font-bold text-white active:opacity-90"
                >
                  I&apos;m Okay
                </button>
                <button
                  onClick={handleHelp}
                  className="w-full rounded-2xl bg-[#e53935] py-4 text-[17px] font-bold text-white active:opacity-90"
                >
                  I Need Help
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
