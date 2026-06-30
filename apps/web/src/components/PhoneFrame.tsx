"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPinLoader } from "./MapPinLoader";

// ─── Device constants (iPhone 15 Pro logical resolution) ─────────────────────
const S_W = 393;            // screen width  (px)
const S_H = 852;            // screen height (px)
const BZ  = 16;             // bezel thickness on each side
const D_W = S_W + BZ * 2;  // outer device width  (425)
const D_H = S_H + BZ * 2;  // outer device height (884)
const OUTER_R  = 52;        // device corner radius
const SCREEN_R = 44;        // screen corner radius
const STATUS_H = 59;        // status-bar height (incl. DI cap clearance)
// Dynamic Island
const DI_W = 126;
const DI_H = 37;
const DI_TOP = 12;          // px from top of screen

// ─── Status-bar icons ─────────────────────────────────────────────────────────

function SignalBars() {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" aria-hidden="true">
      {[3, 6, 9, 12].map((h, i) => (
        <rect key={i} x={i * 4.5} y={12 - h} width={3} height={h} rx={1} />
      ))}
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
      <circle cx="8" cy="11" r="1.5" fill="currentColor" />
      <path d="M4.6 7.6a4.8 4.8 0 0 1 6.8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".7" />
      <path d="M1.8 4.9A9 9 0 0 1 14.2 4.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".4" />
    </svg>
  );
}

function FiveGBadge() {
  return (
    <span
      aria-hidden="true"
      style={{ fontSize: 12, fontWeight: 700, letterSpacing: "-0.3px", lineHeight: 1 }}
    >
      5G
    </span>
  );
}

function BatteryIcon({ level = 82 }: { level?: number }) {
  const fillW = Math.round((16 * level) / 100);
  return (
    <svg width="25" height="12" viewBox="0 0 25 12" fill="none" aria-label={`Battery ${level}%`}>
      <rect x=".5" y=".5" width="21" height="11" rx="3.5" stroke="currentColor" strokeOpacity=".35" />
      <rect x="22" y="3.5" width="2.5" height="5" rx="1.5" fill="currentColor" fillOpacity=".4" />
      <rect x="2" y="2" width={fillW} height="8" rx="2" fill="currentColor" />
    </svg>
  );
}

// ─── Status bar ───────────────────────────────────────────────────────────────

function StatusBar({ dark }: { dark: boolean }) {
  const [time, setTime] = useState("9:41");

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false })
      );
    }
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);

  // The status bar always sits on the screen's #0a0a0a (near-black) background
  // because the app content starts below it. We always use white icons, but honour
  // the explicit "dark" prop in case the caller wants the older behaviour.
  const fg = dark ? "#ffffff" : "#0a0a0a";

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: "0 0 auto",
        height: STATUS_H,
        display: "flex",
        alignItems: "flex-start",
        paddingTop: 16,
        zIndex: 60,
        pointerEvents: "none",
        color: fg,
        userSelect: "none",
        // On the dark theme a subtle scrim keeps white icons legible over any app
        // background. On the light theme the bar blends into the app's own
        // surface (like a real edge-to-edge iPhone), so no scrim.
        background: dark
          ? "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)"
          : "none",
      }}
    >
      {/* Left: time */}
      <div style={{ flex: 1, paddingLeft: 26 }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.3px", lineHeight: 1 }}>
          {time}
        </span>
      </div>

      {/* Centre: spacer to leave room for Dynamic Island */}
      <div style={{ width: DI_W, flexShrink: 0 }} />

      {/* Right: signal / 5G / wifi / battery */}
      <div
        style={{
          flex: 1,
          paddingRight: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 5,
        }}
      >
        <SignalBars />
        <FiveGBadge />
        <WifiIcon />
        <BatteryIcon level={82} />
      </div>
    </div>
  );
}

// ─── Home indicator ───────────────────────────────────────────────────────────

function HomeIndicator({ dark }: { dark: boolean }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        bottom: 8,
        left: "50%",
        transform: "translateX(-50%)",
        width: 134,
        height: 5,
        borderRadius: 9999,
        background: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.22)",
        zIndex: 60,
        pointerEvents: "none",
      }}
    />
  );
}

// ─── Side buttons ─────────────────────────────────────────────────────────────

function SideButtons() {
  const base: React.CSSProperties = {
    position: "absolute",
    borderRadius: 3,
    background:
      "linear-gradient(to bottom, hsl(215,7%,22%) 0%, hsl(215,7%,17%) 50%, hsl(215,7%,15%) 100%)",
  };

  return (
    <>
      {/* Action button (upper left) */}
      <div
        style={{
          ...base,
          top: 116,
          left: -4,
          width: 4,
          height: 32,
          borderRadius: "3px 0 0 3px",
          boxShadow: "-1px 0 0 rgba(0,0,0,0.4), inset -1px 0 0 rgba(255,255,255,0.06)",
        }}
      />
      {/* Volume up */}
      <div
        style={{
          ...base,
          top: 164,
          left: -4,
          width: 4,
          height: 66,
          borderRadius: "3px 0 0 3px",
          boxShadow: "-1px 0 0 rgba(0,0,0,0.4), inset -1px 0 0 rgba(255,255,255,0.06)",
        }}
      />
      {/* Volume down */}
      <div
        style={{
          ...base,
          top: 246,
          left: -4,
          width: 4,
          height: 66,
          borderRadius: "3px 0 0 3px",
          boxShadow: "-1px 0 0 rgba(0,0,0,0.4), inset -1px 0 0 rgba(255,255,255,0.06)",
        }}
      />
      {/* Power button (right) */}
      <div
        style={{
          ...base,
          top: 152,
          right: -4,
          width: 4,
          height: 96,
          borderRadius: "0 3px 3px 0",
          boxShadow: "1px 0 0 rgba(0,0,0,0.4), inset 1px 0 0 rgba(255,255,255,0.06)",
        }}
      />
    </>
  );
}

// ─── PhoneFrame ───────────────────────────────────────────────────────────────

// Known in-frame app routes we'll persist/restore. Excludes /preview (would nest
// a frame in a frame) and anything unknown (would 404). Keeps refresh on-screen.
const FRAME_ROUTES = [
  "/ai", "/journey", "/explore", "/live", "/translate", "/sos",
  "/register", "/login", "/forgot-password", "/offline", "/admin",
];
function isKnownRoute(path: string): boolean {
  const base = path.split("?")[0];
  if (base === "/") return true;
  return FRAME_ROUTES.some((r) => base === r || base.startsWith(r + "/"));
}

export interface PhoneFrameProps {
  src?: string;
  children?: React.ReactNode;
  scale?: number;
  statusBarTheme?: "dark" | "light";
  screenBg?: string;
  className?: string;
  /** Renders a floating offline/online demo toggle button on the right side of the frame. Only works in iframe (src) mode. */
  demoToggle?: boolean;
}

export function PhoneFrame({
  src,
  children,
  scale = 1,
  statusBarTheme = "dark",
  screenBg = "#0a0a0a",
  className = "",
  demoToggle = false,
}: PhoneFrameProps) {
  const deviceRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const dark = statusBarTheme === "dark";
  const [demoOffline, setDemoOffline] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);

  function handleDemoToggle() {
    const next = !demoOffline;
    setDemoOffline(next);
    frameRef.current?.contentWindow?.postMessage(
      { type: "PINEQUEST_DEMO_OFFLINE", forced: next },
      "*",
    );
  }

  // Remember the route the app is on INSIDE the frame, so a full-page refresh
  // restores the current screen instead of resetting to the iframe's start URL
  // (otherwise every refresh jumped back to /register). Sign-out navigates the
  // frame to /login, which is captured here too, so a refresh then lands there.
  const FRAME_PATH_KEY = "lumo:frame-path";
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);

  // Resolve the start URL on the client: last in-frame route, else the prop.
  // Only restore a KNOWN app route — otherwise a stale/garbage path would load a
  // 404, which the poll would then re-save into a permanent loop.
  useEffect(() => {
    if (!src) return;
    let stored: string | null = null;
    try { stored = sessionStorage.getItem(FRAME_PATH_KEY); } catch { /* ignore */ }
    setIframeReady(false);
    setResolvedSrc(stored && isKnownRoute(stored) ? stored : src);
  }, [src]);

  // The app navigates client-side (no iframe load event per route), so poll the
  // same-origin frame location and remember it for the next refresh. Only save
  // known routes, so a 404 can never be persisted.
  useEffect(() => {
    if (!src) return;
    let last = "";
    const id = setInterval(() => {
      try {
        const win = frameRef.current?.contentWindow;
        if (!win) return;
        const path = win.location.pathname + win.location.search;
        if (path && path !== last && isKnownRoute(path)) {
          last = path;
          sessionStorage.setItem(FRAME_PATH_KEY, path);
        }
      } catch { /* cross-origin or not ready yet */ }
    }, 1000);
    return () => clearInterval(id);
  }, [src]);

  // Direct-DOM tilt — avoids React re-render on every mousemove frame
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r  = el.getBoundingClientRect();
    const dx = (e.clientX - r.left  - r.width  / 2) / (r.width  / 2);
    const dy = (e.clientY - r.top   - r.height / 2) / (r.height / 2);
    if (deviceRef.current) {
      deviceRef.current.style.transform =
        `rotateX(${(-dy * 3).toFixed(2)}deg) rotateY(${(dx * 3).toFixed(2)}deg)`;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (deviceRef.current) {
      deviceRef.current.style.transform = "rotateX(0deg) rotateY(0deg)";
    }
  }, []);

  // Outer wrapper is sized to the *scaled* footprint so layout neighbours don't overlap
  const wrapperStyle: React.CSSProperties =
    scale !== 1
      ? { width: D_W * scale, height: D_H * scale, flexShrink: 0, position: "relative" }
      : { flexShrink: 0, position: "relative" };

  const innerStyle: React.CSSProperties =
    scale !== 1
      ? {
          width: D_W,
          height: D_H,
          transformOrigin: "top left",
          transform: `scale(${scale})`,
          position: "absolute",
          top: 0,
          left: 0,
        }
      : { width: D_W, height: D_H };

  return (
    <div
      className={className}
      style={{ ...wrapperStyle, overflow: "visible" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {demoToggle && (
        <button
          onClick={handleDemoToggle}
          aria-label={demoOffline ? "Demo offline — click to restore online" : "Demo online — click to force offline"}
          style={{
            position: "absolute",
            right: -72,
            top: 210,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 5,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            zIndex: 100,
          }}
        >
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.28)",
              textTransform: "uppercase",
              userSelect: "none",
            }}
          >
            DEMO
          </span>
          <span
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              background: demoOffline ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.07)",
              border: `1px solid ${demoOffline ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.12)"}`,
              borderRadius: 14,
              padding: "10px 6px",
              width: 44,
              transition: "background 0.2s, border-color 0.2s",
            }}
          >
            {demoOffline ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
                <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <circle cx="12" cy="20" r="1" fill="#FCD34D" />
              </svg>
            ) : (
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                <circle cx="8" cy="11" r="1.5" fill="rgba(255,255,255,0.6)" />
                <path d="M4.6 7.6a4.8 4.8 0 0 1 6.8 0" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M1.8 4.9A9 9 0 0 1 14.2 4.9" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" opacity=".5" />
              </svg>
            )}
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: demoOffline ? "#FCD34D" : "rgba(255,255,255,0.45)",
                textTransform: "uppercase",
                userSelect: "none",
                lineHeight: 1,
              }}
            >
              {demoOffline ? "Offline" : "Online"}
            </span>
          </span>
        </button>
      )}
      <div style={{ ...innerStyle, perspective: "1200px" }}>
        {/* ── Device chrome ── */}
        <div
          ref={deviceRef}
          style={{
            width: D_W,
            height: D_H,
            borderRadius: OUTER_R,
            // Dark titanium finish with subtle directional gradient
            background:
              "linear-gradient(148deg, hsl(220,8%,20%) 0%, hsl(215,6%,15%) 45%, hsl(215,6%,12%) 75%, hsl(218,7%,14%) 100%)",
            // Ambient shadow — layered so it reads as a physical object
            boxShadow: [
              // Edge highlights (top/left catch the ambient light)
              "inset 0 1px 0 rgba(255,255,255,0.10)",
              "inset 1px 0 0 rgba(255,255,255,0.05)",
              "inset -1px 0 0 rgba(255,255,255,0.03)",
              "inset 0 -1px 0 rgba(255,255,255,0.02)",
              // Near contact shadow
              "0 2px 8px rgba(0,0,0,0.32)",
              // Mid-field shadow
              "0 16px 48px rgba(0,0,0,0.42)",
              // Ambient / bloom
              "0 44px 100px rgba(0,0,0,0.30)",
              // Wide ambient scatter
              "0 90px 200px rgba(0,0,0,0.18)",
            ].join(", "),
            // Tilt transition — ease-out-quart for a natural, weighted feel
            transition: "transform 0.45s cubic-bezier(0.23, 1, 0.32, 1)",
            position: "relative",
            // Ensures the side-button pseudo-elements don't get clipped
            overflow: "visible",
          }}
        >
          <SideButtons />

          {/* ── Screen ── */}
          <div
            style={{
              position: "absolute",
              top: BZ,
              left: BZ,
              width: S_W,
              height: S_H,
              borderRadius: SCREEN_R,
              overflow: "hidden",
              background: screenBg,
              // Subtle pressed-in look — thin dark ring around the screen
              boxShadow:
                "inset 0 0 0 1px rgba(0,0,0,0.55), inset 0 2px 6px rgba(0,0,0,0.45)",
              // Forces a GPU composited layer. Without this, the iframe's
              // position:fixed bottom nav bar (bg-white) triggers a repaint that
              // skips the overflow:hidden + border-radius clip, making the bottom
              // corners appear square on hover. The compositor always clips to the
              // rounded rect when this element is on its own layer.
              transform: "translateZ(0)",
            }}
          >
            {/* App content — iframe starts BELOW the status bar so the app
                sees a clean 393 × 793 px viewport with no overlapping chrome */}
            {src ? (
              <>
                <iframe
                  ref={frameRef}
                  src={resolvedSrc ?? undefined}
                  title="App preview"
                  allow="microphone; camera"
                  onLoad={() => setIframeReady(true)}
                  style={{
                    position: "absolute",
                    top: STATUS_H,
                    left: 0,
                    width: S_W,
                    height: S_H - STATUS_H,
                    border: "none",
                    display: "block",
                    opacity: iframeReady ? 1 : 0,
                    transition: "opacity 0.3s ease",
                  }}
                />
                {!iframeReady && (
                  <div
                    style={{
                      position: "absolute",
                      top: STATUS_H,
                      left: 0,
                      width: S_W,
                      height: S_H - STATUS_H,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: screenBg,
                    }}
                  >
                    <MapPinLoader variant="inline" />
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  position: "absolute",
                  top: STATUS_H,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  overflowY: "auto",
                  overflowX: "hidden",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {children}
              </div>
            )}

            {/* Dynamic Island — sits on top of everything */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: DI_TOP,
                left: "50%",
                transform: "translateX(-50%)",
                width: DI_W,
                height: DI_H,
                borderRadius: 9999,
                background: "#000",
                zIndex: 70,
                pointerEvents: "none",
                // Subtle inner ring to suggest glass thickness
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
              }}
            />

            {/* Status bar — overlays the app, pointerEvents off */}
            <StatusBar dark={dark} />

            {/* Home indicator */}
            <HomeIndicator dark={dark} />
          </div>
        </div>
      </div>
    </div>
  );
}
