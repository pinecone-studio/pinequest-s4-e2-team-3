'use client';

import { motion, useReducedMotion } from 'motion/react';

const BLUE = '#2f6bff';

// Classic map pin in a 100×100 viewBox.
// Head: full circle, center (50,30) r=28, traced as two 90° arcs (12-o'clock → 3 → 9).
// Body: two cubic beziers leaving the 3 and 9 o'clock points with vertical tangents,
//       tapering smoothly to the tip at (50,90). No visible junction between head and body.
const PIN =
  'M 50 2 A 28 28 0 0 1 78 30 C 78 55 55 88 50 90 C 45 88 22 55 22 30 A 28 28 0 0 1 50 2 Z';

const CY = 2.8;

interface MapPinLoaderProps {
  variant?: 'fullscreen' | 'inline';
  className?: string;
}

export function MapPinLoader({ variant = 'inline', className }: MapPinLoaderProps) {
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
          <path d={PIN} fill={BLUE} />
          <circle cx={50} cy={30} r={12} fill="white" opacity={0.9} />
        </svg>
        {fs && <span className="font-serif text-ink/60 text-xl italic">PineQuest</span>}
      </div>
    );
  }

  // Three ripple rings staggered at 0.22, 0.33, 0.44 of CY.
  // Each ring starts invisible, pops into opacity then expands + fades over 0.50 of CY.
  const rippleStarts = [0.22, 0.33, 0.44];

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
        {/* Ripple rings — expand from pin tip (landing point) */}
        {rippleStarts.map((start, i) => (
          <motion.circle
            key={i}
            cx={50}
            cy={90}
            r={14}
            fill="none"
            stroke={BLUE}
            strokeWidth={1.5}
            style={{ transformOrigin: '50px 90px' }}
            animate={{
              scale:   [0,     0,     0.1,         2.6,              2.6 ],
              opacity: [0,     0,     0.45,        0,                0   ],
            }}
            transition={{
              duration: CY,
              times:    [0, start, start + 0.01, start + 0.50, 1.0],
              ease: ['linear', 'linear', 'easeOut', 'linear'],
              repeat: Infinity,
            }}
          />
        ))}

        {/* Pin — drops from above, squash-bounces on landing, lifts and fades out */}
        <motion.g
          style={{ transformOrigin: '50px 90px' }}
          animate={{
            y:       [-110, 0,    0,    0,    0,    0,    0,    -10  ],
            scaleY:  [1,    1,    0.68, 1.18, 0.96, 1.0,  1.0,  1.0  ],
            scaleX:  [1,    1,    1.38, 0.88, 1.03, 1.0,  1.0,  1.0  ],
            opacity: [0,    1,    1,    1,    1,    1,    1,    0    ],
          }}
          transition={{
            duration: CY,
            times:    [0, 0.22, 0.30, 0.42, 0.50, 0.57, 0.82, 0.96],
            ease:     ['easeIn', 'easeOut', 'easeOut', 'easeOut', 'easeOut', 'linear', 'easeIn'],
            repeat: Infinity,
          }}
        >
          <path d={PIN} fill={BLUE} />
          {/* White dot inside the circular head */}
          <circle cx={50} cy={30} r={12} fill="white" opacity={0.9} />
        </motion.g>
      </svg>

      {fs && (
        <motion.span
          className="font-serif text-ink/70 text-xl italic tracking-wide"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
        >
          PineQuest
        </motion.span>
      )}
    </div>
  );
}
