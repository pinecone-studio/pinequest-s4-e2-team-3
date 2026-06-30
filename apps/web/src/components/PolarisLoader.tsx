'use client';

import { motion, useReducedMotion } from 'motion/react';

const BLUE = '#2f6bff';
const SOFT = '#93b4ff'; // lighter halo tint

interface PolarisLoaderProps {
  variant?: 'fullscreen' | 'inline';
  className?: string;
}

// 4-pointed star in a 100×100 viewBox.
// Outer tips at r=40 → N(50,10) E(90,50) S(50,90) W(10,50).
// Waist (between tips) at r=14, 45° offset → creates elegant spiky proportions.
const STAR =
  'M 50 10 L 59.9 40.1 L 90 50 L 59.9 59.9 L 50 90 L 40.1 59.9 L 10 50 L 40.1 40.1 Z';

// Halo — same geometry, slightly larger (r=46 outer, r=16 waist), no blur.
const HALO =
  'M 50 4 L 61.3 38.7 L 96 50 L 61.3 61.3 L 50 96 L 38.7 61.3 L 4 50 L 38.7 38.7 Z';

// Total cycle length in seconds.
// Sequence: silent gap → explosive arrival + spring settle → soft breathe →
//           hold → second brighter twinkle → hold → fade out → gap.
const CY = 3.0;

export function PolarisLoader({ variant = 'inline', className }: PolarisLoaderProps) {
  const reduced = useReducedMotion() ?? false;
  const fs = variant === 'fullscreen';
  const sz = fs ? 140 : 80;

  const wrapClass = [
    'flex flex-col items-center gap-5',
    fs ? 'min-h-screen justify-center' : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  if (reduced) {
    return (
      <div className={wrapClass} role="status" aria-label="Loading">
        <svg width={sz} height={sz} viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <path d={STAR} fill={BLUE} opacity={0.85} />
          <circle cx={50} cy={50} r={4} fill="white" opacity={0.8} />
        </svg>
        {fs && (
          <span className="font-serif text-ink/60 text-xl italic">Polaris</span>
        )}
      </div>
    );
  }

  return (
    <div className={wrapClass} role="status" aria-label="Loading">
      <svg
        width={sz}
        height={sz}
        viewBox="0 0 100 100"
        fill="none"
        overflow="visible"
        aria-hidden="true"
      >
        {/* ── Halo — larger star at low opacity, no filter needed ── */}
        <motion.path
          d={HALO}
          fill={SOFT}
          style={{ transformOrigin: '50px 50px' }}
          animate={{
            opacity: [0, 0,    0.20, 0.12, 0.12, 0.26, 0.12, 0.12, 0   ],
            scale:   [0.7, 0.7, 1.0,  1.0,  1.06, 1.14, 1.0,  1.0,  0.7],
          }}
          transition={{
            duration: CY,
            times:    [0, 0.05, 0.17, 0.30, 0.50, 0.68, 0.75, 0.87, 0.96],
            ease: 'easeInOut',
            repeat: Infinity,
          }}
        />

        {/* ── Main star — explosive arrival, spring settle, two twinkles ── */}
        <motion.path
          d={STAR}
          fill={BLUE}
          style={{ transformOrigin: '50px 50px' }}
          animate={{
            scale:   [0,    1.30, 0.88, 1.02, 1.0,  1.08, 1.0,  1.18, 1.0,  1.0,  0.75],
            opacity: [0,    1,    1,    1,    1,    1,    1,    1,    1,    1,    0   ],
          }}
          transition={{
            duration: CY,
            times:    [0, 0.13, 0.22, 0.27, 0.30, 0.50, 0.58, 0.68, 0.75, 0.87, 0.96],
            ease:     [
              'easeOut',   // 0  → 0.13  explosive pop
              'easeOut',   // 0.13→ 0.22  rebound under
              'easeOut',   // 0.22→ 0.27  bounce back
              'easeOut',   // 0.27→ 0.30  settle
              'easeInOut', // 0.30→ 0.50  first soft breathe up
              'easeInOut', // 0.50→ 0.58  breathe back down
              'easeInOut', // 0.58→ 0.68  second twinkle up
              'easeInOut', // 0.68→ 0.75  twinkle back down
              'linear',    // 0.75→ 0.87  hold
              'easeIn',    // 0.87→ 0.96  fade out
            ],
            repeat: Infinity,
          }}
        />

        {/* ── White core — "burning" heart of the star ── */}
        <motion.circle
          cx={50}
          cy={50}
          r={4.5}
          fill="white"
          style={{ transformOrigin: '50px 50px' }}
          animate={{
            scale:   [0,    2.2,  1.0,  1.0,  1.5,  1.0,  2.0,  1.0,  1.0,  0   ],
            opacity: [0,    1.0,  0.60, 0.60, 0.85, 0.60, 1.0,  0.60, 0.60, 0   ],
          }}
          transition={{
            duration: CY,
            times:    [0, 0.11, 0.22, 0.30, 0.50, 0.58, 0.68, 0.75, 0.87, 0.96],
            ease: 'easeInOut',
            repeat: Infinity,
          }}
        />
      </svg>

      {fs && (
        <motion.span
          className="font-serif text-ink/70 text-xl italic tracking-wide"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.23, 1, 0.32, 1] }}
        >
          Polaris
        </motion.span>
      )}
    </div>
  );
}
