'use client';

import { motion, useReducedMotion } from 'motion/react';

const BLUE  = '#2f6bff';
const AMBER = '#f59e0b';
const CY    = 3.0; // seconds per cycle

interface CompassLoaderProps {
  variant?: 'fullscreen' | 'inline';
  className?: string;
}

// Longer north tick so the settling direction is unmistakable without a label.
const TICKS = [
  { angle: 0,   r1: 29, r2: 43, sw: 2,   so: 0.6  },
  { angle: 90,  r1: 37, r2: 43, sw: 1.5, so: 0.35 },
  { angle: 180, r1: 37, r2: 43, sw: 1.5, so: 0.35 },
  { angle: 270, r1: 37, r2: 43, sw: 1.5, so: 0.35 },
  { angle: 45,  r1: 40, r2: 43, sw: 0.8, so: 0.18 },
  { angle: 135, r1: 40, r2: 43, sw: 0.8, so: 0.18 },
  { angle: 225, r1: 40, r2: 43, sw: 0.8, so: 0.18 },
  { angle: 315, r1: 40, r2: 43, sw: 0.8, so: 0.18 },
];

function tick(angleDeg: number, r1: number, r2: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x1: +(50 + Math.cos(rad) * r1).toFixed(2),
    y1: +(50 + Math.sin(rad) * r1).toFixed(2),
    x2: +(50 + Math.cos(rad) * r2).toFixed(2),
    y2: +(50 + Math.sin(rad) * r2).toFixed(2),
  };
}

function Bezel() {
  return (
    <>
      <circle cx={50} cy={50} r={43} stroke={BLUE} strokeWidth={1.5} strokeOpacity={0.2} fill="none" />
      {TICKS.map(({ angle, r1, r2, sw, so }) => {
        const { x1, y1, x2, y2 } = tick(angle, r1, r2);
        return (
          <line
            key={angle}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={BLUE}
            strokeWidth={sw}
            strokeOpacity={so}
          />
        );
      })}
    </>
  );
}

// Two triangles sharing the center pivot; the overlap is hidden by Pivot.
function Needle() {
  return (
    <>
      <path d="M 50 50 L 47 58 L 50 12 L 53 58 Z" fill={BLUE} />
      <path d="M 50 50 L 47 42 L 50 86 L 53 42 Z" fill={AMBER} opacity={0.75} />
    </>
  );
}

function Pivot() {
  return (
    <>
      <circle cx={50} cy={50} r={6} fill="white" />
      <circle cx={50} cy={50} r={3} fill={BLUE} />
    </>
  );
}

export function CompassLoader({ variant = 'inline', className }: CompassLoaderProps) {
  const reduced = useReducedMotion() ?? false;
  const fs = variant === 'fullscreen';
  const sz = fs ? 80 : 52;

  const wrapClass = [
    'flex flex-col items-center gap-5',
    fs ? 'min-h-screen justify-center' : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  if (reduced) {
    return (
      <div className={wrapClass} role="status" aria-label="Loading">
        <svg width={sz} height={sz} viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <Bezel />
          <Needle />
          <Pivot />
        </svg>
        {fs && <span className="font-serif text-ink/60 text-xl italic">Polaris</span>}
      </div>
    );
  }

  return (
    <div className={wrapClass} role="status" aria-label="Loading">
      {/* Entire compass fades in/out each cycle */}
      <motion.svg
        width={sz}
        height={sz}
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{
          duration: CY,
          times: [0, 0.08, 0.82, 0.94],
          ease: ['easeOut', 'linear', 'easeIn'],
          repeat: Infinity,
        }}
      >
        <Bezel />

        {/* Needle spins ~1.5 turns, overshoots north, then dampens to rest */}
        <motion.g
          style={{ transformOrigin: '50px 50px' }}
          animate={{
            rotate: [-150, 378, 351, 365, 357, 361, 360, 360],
          }}
          transition={{
            duration: CY,
            times:    [0, 0.43, 0.52, 0.58, 0.63, 0.67, 0.71, 0.82],
            ease:     ['easeIn', 'easeOut', 'easeOut', 'easeOut', 'easeOut', 'easeOut', 'linear'],
            repeat:   Infinity,
          }}
        >
          <Needle />
        </motion.g>

        <Pivot />
      </motion.svg>

      {fs && (
        <motion.span
          className="font-serif text-ink/70 text-xl italic tracking-wide"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
        >
          Polaris
        </motion.span>
      )}
    </div>
  );
}
