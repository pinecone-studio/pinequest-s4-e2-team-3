'use client';

import { motion, useReducedMotion } from 'motion/react';

// ─── Public API ───────────────────────────────────────────────────────────────

interface WaypointLoaderProps {
  variant?: 'fullscreen' | 'inline';
  className?: string;
}

// ─── Design tokens ───────────────────────────────────────────────────────────

const BLUE  = '#2f6bff'; // primary-600
const AMBER = '#f59e0b'; // accent-500

// Gentle S-curve through three waypoints in a 100×48 viewBox.
// Left node (10,24) → center (50,24) → right (90,24) with
// opposing control points so the curve undulates up then down.
const PATH_D = 'M 10 24 Q 30 10 50 24 Q 70 38 90 24';

// ─── Animation constants ──────────────────────────────────────────────────────

// Total cycle: 2.8 s
// 0 %  → 44 %  path draws left to right
// 44 % → 65 %  everything holds fully visible
// 65 % → 88 %  fade out
// 88 % → 100 % silent gap before next loop
const CY = 2.8;

// ─── Component ───────────────────────────────────────────────────────────────

export function WaypointLoader({ variant = 'inline', className }: WaypointLoaderProps) {
  const reduced = useReducedMotion() ?? false;
  const fs = variant === 'fullscreen';

  const svgW    = fs ? 128 : 72;
  const svgH    = svgW * 0.48;
  const nodeR   = fs ? 5.5 : 4;
  const diamH   = fs ? 8 : 5.5; // diamond half-height
  const strokeW = fs ? 1.5 : 1;

  const wrapClass = [
    'flex flex-col items-center gap-5',
    fs ? 'min-h-screen justify-center' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  // ── Reduced-motion fallback: static fully-drawn route ─────────────────────
  if (reduced) {
    return (
      <div className={wrapClass} role="status" aria-label="Loading">
        <svg
          width={svgW}
          height={svgH}
          viewBox="0 0 100 48"
          fill="none"
          aria-hidden="true"
        >
          <path
            d={PATH_D}
            stroke={BLUE}
            strokeWidth={strokeW}
            strokeLinecap="round"
            opacity={0.35}
          />
          <circle cx={10}  cy={24} r={nodeR} fill={BLUE}  opacity={0.5} />
          <path
            d={`M 50 ${24 - diamH} L ${50 + diamH} 24 L 50 ${24 + diamH} L ${50 - diamH} 24 Z`}
            fill={AMBER}
            opacity={0.5}
          />
          <circle cx={90} cy={24} r={nodeR} fill={BLUE}  opacity={0.5} />
        </svg>
        {fs && (
          <span className="font-serif text-ink/60 text-xl italic">Polaris</span>
        )}
      </div>
    );
  }

  // ── Full animation ─────────────────────────────────────────────────────────

  return (
    <div className={wrapClass} role="status" aria-label="Loading">
      <svg
        width={svgW}
        height={svgH}
        viewBox="0 0 100 48"
        fill="none"
        overflow="visible"
        aria-hidden="true"
      >
        {/* Connecting path — draws left-to-right via pathLength */}
        <motion.path
          d={PATH_D}
          stroke={BLUE}
          strokeWidth={strokeW}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{
            pathLength: [0, 1,    1,    0   ],
            opacity:    [0, 0.75, 0.75, 0   ],
          }}
          transition={{
            duration: CY,
            times:    [0, 0.44, 0.65, 0.88],
            ease:     ['easeOut', 'linear', 'easeIn'],
            repeat:   Infinity,
          }}
        />

        {/* Left waypoint — blue circle, appears as path starts */}
        <motion.circle
          cx={10} cy={24} r={nodeR}
          fill={BLUE}
          style={{ transformOrigin: '10px 24px' }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale:   [0, 1.18, 1,   1,   0  ],
            opacity: [0, 1,    1,   1,   0  ],
          }}
          transition={{
            duration: CY,
            times:    [0, 0.07, 0.14, 0.65, 0.88],
            ease:     ['easeOut', 'easeOut', 'linear', 'easeIn'],
            repeat:   Infinity,
          }}
        />

        {/* Center waypoint — amber diamond, pops when path reaches midpoint */}
        <motion.path
          d={`M 50 ${24 - diamH} L ${50 + diamH} 24 L 50 ${24 + diamH} L ${50 - diamH} 24 Z`}
          fill={AMBER}
          style={{ transformOrigin: '50px 24px' }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale:   [0, 0,    1.18, 1,   1,   0  ],
            opacity: [0, 0,    1,    1,   1,   0  ],
          }}
          transition={{
            duration: CY,
            times:    [0, 0.20, 0.28, 0.35, 0.65, 0.88],
            ease:     ['linear', 'easeOut', 'easeOut', 'linear', 'easeIn'],
            repeat:   Infinity,
          }}
        />

        {/* Right waypoint — blue circle, pops as path completes */}
        <motion.circle
          cx={90} cy={24} r={nodeR}
          fill={BLUE}
          style={{ transformOrigin: '90px 24px' }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale:   [0, 0,    1.18, 1,   1,   0  ],
            opacity: [0, 0,    1,    1,   1,   0  ],
          }}
          transition={{
            duration: CY,
            times:    [0, 0.40, 0.48, 0.54, 0.65, 0.88],
            ease:     ['linear', 'easeOut', 'easeOut', 'linear', 'easeIn'],
            repeat:   Infinity,
          }}
        />
      </svg>

      {/* Wordmark — fullscreen only, fades in after first cycle starts */}
      {fs && (
        <motion.span
          className="font-serif text-ink/70 text-xl italic tracking-wide"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: [0.23, 1, 0.32, 1] }}
        >
          Polaris
        </motion.span>
      )}
    </div>
  );
}
