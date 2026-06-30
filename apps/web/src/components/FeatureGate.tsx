"use client";

import type { ReactNode } from "react";
import { useOnlineStatus } from "@/context/OnlineStatus";
import { featureAvailability, type FeatureKey } from "@/lib/featureAvailability";

function WifiOffIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

interface FeatureGateProps {
  feature: FeatureKey;
  /** Override the default degraded note text. */
  degradedNote?: string;
  children: ReactNode;
}

/**
 * Wraps UI by feature tier and applies the correct treatment when offline:
 *
 * - offline / always → no visual change
 * - degraded         → render children + a small inline note below
 * - online-only      → dim + pointer-events-none + "Needs connection" chip above
 */
export function FeatureGate({ feature, degradedNote, children }: FeatureGateProps) {
  const { online } = useOnlineStatus();
  const tier = featureAvailability[feature];

  // These tiers are unaffected by connectivity state.
  if (tier === "always" || tier === "offline") return <>{children}</>;

  // When online, every tier renders normally.
  if (online) return <>{children}</>;

  if (tier === "degraded") {
    return (
      <div>
        {children}
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
          <WifiOffIcon size={12} />
          {degradedNote ?? "Using saved data — live updates need a connection"}
        </p>
      </div>
    );
  }

  // online-only: label upfront so users know before tapping, then dim content.
  return (
    <div className="space-y-2">
      <div className="flex w-fit items-center gap-1.5 rounded-full bg-sand-100 px-3 py-1.5 text-xs font-semibold text-ink-muted">
        <WifiOffIcon size={11} />
        Needs connection
      </div>
      <div className="pointer-events-none select-none opacity-40" aria-disabled="true">
        {children}
      </div>
    </div>
  );
}
