'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export type GuideAvatarState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'success'
  | 'error';

export type GuideAvatarSize = 'sm' | 'md' | 'lg';

interface GuideAvatarProps {
  state: GuideAvatarState;
  size?: GuideAvatarSize;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — matched to PineQuest palette
// ─────────────────────────────────────────────────────────────────────────────

const SIZE_PX: Record<GuideAvatarSize, number> = { sm: 40, md: 64, lg: 120 };

// Colors per state: blob fill + glow fill/opacity/scale + ring stroke
const COL: Record<
  GuideAvatarState,
  { fill: string; glow: string; glowOp: number; glowScale: number; ring: string }
> = {
  idle:      { fill: '#2f6bff', glow: '#2f6bff', glowOp: 0.18, glowScale: 0.88, ring: '#4d83ff' },
  listening: { fill: '#4d83ff', glow: '#4d83ff', glowOp: 0.36, glowScale: 1.04, ring: '#4d83ff' },
  thinking:  { fill: '#3d72e8', glow: '#7b9fff', glowOp: 0.22, glowScale: 0.90, ring: '#5b7fff' },
  speaking:  { fill: '#1f56e0', glow: '#2f6bff', glowOp: 0.40, glowScale: 1.10, ring: '#2f6bff' },
  success:   { fill: '#1F9D6B', glow: '#22c55e', glowOp: 0.40, glowScale: 1.10, ring: '#1F9D6B' },
  error:     { fill: '#C8700F', glow: '#f59e0b', glowOp: 0.34, glowScale: 0.95, ring: '#D9831F' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Blob paths — ALL have identical command structure: M + 4C + Z
// This is required for Motion to interpolate between shapes.
// 100×100 viewBox, blobs centered near (50, 50).
// ─────────────────────────────────────────────────────────────────────────────

const PATH: Record<GuideAvatarState, string> = {
  // Calm, slightly organic circle
  idle:
    'M 50 21 C 68 19 81 33 80 50 C 79 67 65 82 50 80 C 35 78 20 65 20 50 C 20 34 32 23 50 21 Z',
  // Alert, taller — leaning forward toward the user
  listening:
    'M 50 17 C 70 17 84 33 83 52 C 82 68 67 82 50 80 C 33 80 17 65 18 49 C 19 33 30 17 50 17 Z',
  // Asymmetric and tilted — clearly "working," not stuck
  thinking:
    'M 54 19 C 73 16 85 35 82 54 C 79 73 62 85 44 80 C 26 75 15 57 20 41 C 25 25 35 22 54 19 Z',
  // Fuller and expanded — presence fills the space while speaking
  speaking:
    'M 50 15 C 73 15 87 33 86 52 C 85 71 69 87 50 85 C 31 85 15 69 15 52 C 15 33 27 15 50 15 Z',
  // Very round and pushed outward — open, celebratory
  success:
    'M 50 12 C 76 12 90 30 89 52 C 88 73 72 90 50 89 C 28 90 11 73 11 52 C 11 30 24 12 50 12 Z',
  // Off-balance and tilted — confused, not broken
  error:
    'M 53 21 C 73 18 84 36 81 56 C 78 74 62 84 43 79 C 24 74 16 56 20 40 C 24 24 33 24 53 21 Z',
};

// ─────────────────────────────────────────────────────────────────────────────
// Easing curves (Emil: strong ease-out for UI, spring overshoot for success)
// ─────────────────────────────────────────────────────────────────────────────

const E: [number, number, number, number] = [0.23, 1, 0.32, 1];
const E_SPRING: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

// ─────────────────────────────────────────────────────────────────────────────
// Animation parameter builders — each returns a plain animate/transition object
// ─────────────────────────────────────────────────────────────────────────────

function outerAnim(s: GuideAvatarState, reduced: boolean) {
  if (reduced) return { scale: 1 as number | number[] };
  const map: Record<GuideAvatarState, number | number[]> = {
    idle:      [1, 1.025, 1],
    listening: [1, 1.055, 1],
    thinking:  1,
    speaking:  [1, 1.065, 1],
    success:   [1, 1.16, 1.04, 1],
    error:     1,
  };
  return { scale: map[s] };
}

function outerTransition(s: GuideAvatarState, reduced: boolean) {
  if (reduced) return { duration: 0.3, ease: E };
  if (s === 'idle')
    return { duration: 4, repeat: Infinity, repeatType: 'mirror' as const, ease: 'easeInOut' as const };
  if (s === 'listening')
    return { duration: 1.4, repeat: Infinity, repeatType: 'mirror' as const, ease: 'easeInOut' as const };
  if (s === 'speaking')
    return { duration: 0.88, repeat: Infinity, repeatType: 'mirror' as const, ease: 'easeInOut' as const };
  if (s === 'success')
    return { duration: 0.6, ease: E_SPRING };
  return { duration: 0.5, ease: E };
}

function blobGroupAnim(s: GuideAvatarState, reduced: boolean): { rotate: number | number[] } {
  if (reduced) return { rotate: 0 };
  if (s === 'thinking') return { rotate: 360 };
  if (s === 'error')    return { rotate: [-8, 8, -5, 5, -2, 2, 0] };
  return { rotate: 0 };
}

function blobGroupTransition(s: GuideAvatarState, reduced: boolean) {
  if (reduced) return { rotate: { duration: 0.3 } };
  if (s === 'thinking')
    return { rotate: { duration: 8, repeat: Infinity, ease: 'linear' as const } };
  if (s === 'error')
    return { rotate: { duration: 0.65, ease: 'easeInOut' as const, times: [0, 0.17, 0.33, 0.5, 0.66, 0.83, 1] } };
  return { rotate: { duration: 0.6, ease: E } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function GuideAvatar({ state, size = 'md', className }: GuideAvatarProps) {
  const reduced = useReducedMotion() ?? false;
  const px = SIZE_PX[size];
  const c = COL[state];

  return (
    <div
      className={className}
      style={{ width: px, height: px, flexShrink: 0 }}
      role="img"
      aria-label={`Michelle is ${state}`}
    >
      {/* Outer div: drives breathing scale and success pop */}
      <motion.div
        animate={outerAnim(state, reduced)}
        transition={outerTransition(state, reduced)}
        style={{ width: '100%', height: '100%', transformOrigin: '50% 50%' }}
      >
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          overflow="visible"
          aria-hidden="true"
        >
          <defs>
            {/*
              Top-left radial gradient for the specular highlight.
              Gives the flat blob an orb-like depth without animating gradients.
            */}
            <radialGradient
              id="guide-avatar-highlight"
              cx="35%"
              cy="28%"
              r="65%"
              fx="35%"
              fy="28%"
            >
              <stop offset="0%" stopColor="white" stopOpacity="0.44" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* ── Layer 1: Ambient glow ──────────────────────────────────────
              A blurred circle behind the blob. Color, opacity, and scale
              all transition per state — no need to animate blur radius.
          ──────────────────────────────────────────────────────────────── */}
          <motion.circle
            cx={50}
            cy={50}
            r={44}
            style={{ filter: 'blur(17px)', transformOrigin: '50px 50px' }}
            animate={{
              fill: c.glow,
              opacity: c.glowOp,
              scale: c.glowScale,
            }}
            transition={{ duration: 0.55, ease: E }}
          />

          {/* ── Layer 2a: Listening — sonar rings ─────────────────────────
              Two offset rings expand outward like a radar ping, signalling
              that the avatar is actively receiving input.
          ──────────────────────────────────────────────────────────────── */}
          <AnimatePresence>
            {!reduced && state === 'listening' && (
              <motion.g
                key="sonar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.3, ease: E } }}
              >
                {([0, 0.68] as const).map((delay, i) => (
                  <motion.circle
                    key={i}
                    cx={50}
                    cy={50}
                    fill="none"
                    stroke={c.ring}
                    strokeWidth={1}
                    initial={{ r: 32, opacity: 0.45 }}
                    animate={{ r: [32, 54] as [number, number], opacity: [0.4, 0] as [number, number] }}
                    transition={{
                      r: { duration: 1.9, repeat: Infinity, delay, ease: 'easeOut' },
                      opacity: { duration: 1.9, repeat: Infinity, delay, ease: 'easeOut' },
                    }}
                  />
                ))}
              </motion.g>
            )}
          </AnimatePresence>

          {/* ── Layer 2b: Speaking — rhythm rings ─────────────────────────
              Three staggered rings expand in steady rhythm, distinct from
              the sonar (which is faster and tighter).
          ──────────────────────────────────────────────────────────────── */}
          <AnimatePresence>
            {!reduced && state === 'speaking' && (
              <motion.g
                key="speak-rings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.3, ease: E } }}
              >
                {([0, 0.37, 0.74] as const).map((delay, i) => (
                  <motion.circle
                    key={i}
                    cx={50}
                    cy={50}
                    fill="none"
                    stroke={c.ring}
                    strokeWidth={0.75}
                    initial={{ r: 30, opacity: 0 }}
                    animate={{ r: [30, 50] as [number, number], opacity: [0.28, 0] as [number, number] }}
                    transition={{
                      r: { duration: 1.1, repeat: Infinity, delay, ease: 'easeOut' },
                      opacity: { duration: 1.1, repeat: Infinity, delay, ease: 'easeOut' },
                    }}
                  />
                ))}
              </motion.g>
            )}
          </AnimatePresence>

          {/* ── Layer 3: Blob body ────────────────────────────────────────
              The inner motion.g handles rotation:
                thinking → continuous slow spin (asymmetric shape + spin = clearly "processing")
                error    → short wobble sequence (off-balance, confused)
              The motion.path inside morphs shape and fill between states.
          ──────────────────────────────────────────────────────────────── */}
          <motion.g
            animate={blobGroupAnim(state, reduced)}
            transition={blobGroupTransition(state, reduced)}
            style={{ transformOrigin: '50px 50px' }}
          >
            {/* Main fill — shape morphs and color shifts */}
            <motion.path
              initial={{ d: PATH.idle, fill: COL.idle.fill }}
              animate={{ d: PATH[state], fill: c.fill }}
              transition={{
                d: { duration: 0.72, ease: E },
                fill: { duration: 0.5, ease: E },
              }}
            />

            {/* Specular highlight — same shape, radial gradient overlay */}
            <motion.path
              initial={{ d: PATH.idle }}
              animate={{ d: PATH[state] }}
              transition={{ d: { duration: 0.72, ease: E } }}
              fill="url(#guide-avatar-highlight)"
            />
          </motion.g>

          {/* ── Layer 4: Orbital dot — thinking only ──────────────────────
              A single dot rotates around the blob's center. Visually reads
              as "working on something" rather than frozen.
          ──────────────────────────────────────────────────────────────── */}
          <AnimatePresence>
            {!reduced && state === 'thinking' && (
              <motion.g
                key="orbit"
                style={{ transformOrigin: '50px 50px' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                exit={{ opacity: 0, transition: { duration: 0.3 } }}
                transition={{
                  opacity: { duration: 0.4, ease: E },
                  rotate: { duration: 2.4, repeat: Infinity, ease: 'linear' },
                }}
              >
                <circle cx={50} cy={15.5} r={3.5} fill="white" opacity={0.82} />
              </motion.g>
            )}
          </AnimatePresence>

          {/* ── Layer 5: Sparkle icon ─────────────────────────────────────
              Inline SVG sparkle (two overlapping 4-point stars) — dims
              when the avatar is thinking so it doesn't compete with the orbital.
          ──────────────────────────────────────────────────────────────── */}
          <motion.g
            animate={{ opacity: state === 'thinking' ? 0.32 : 0.92 }}
            transition={{ duration: 0.4, ease: E }}
            style={{ pointerEvents: 'none' }}
          >
            {/* Primary star */}
            <path
              d="M 50 42 L 51.5 48.5 L 58 50 L 51.5 51.5 L 50 58 L 48.5 51.5 L 42 50 L 48.5 48.5 Z"
              fill="white"
            />
            {/* Secondary rotated star for depth */}
            <g transform="rotate(45 50 50)">
              <path
                d="M 50 45.5 L 50.9 49.1 L 54.5 50 L 50.9 50.9 L 50 54.5 L 49.1 50.9 L 45.5 50 L 49.1 49.1 Z"
                fill="white"
                opacity={0.38}
              />
            </g>
          </motion.g>
        </svg>
      </motion.div>
    </div>
  );
}
