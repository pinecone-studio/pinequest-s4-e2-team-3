"use client";

import { motion, useReducedMotion } from "motion/react";

// 4-point compass / north-star mascot — a fitting character for a travel guide.

// 8-point compass star: long cardinal points, short diagonals, pinched centre.
const STAR =
  "M50 4 L52.68 43.53 L65.56 34.44 L56.47 47.32 L96 50 L56.47 52.68 " +
  "L65.56 65.56 L52.68 56.47 L50 96 L47.32 56.47 L34.44 65.56 L43.53 52.68 " +
  "L4 50 L43.53 47.32 L34.44 34.44 L47.32 43.53 Z";

// The star mark + face, reusable at any size. No bubble, no float —
// used both floating on the Home card and small in the chat header.
export function GuideStar({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      overflow="visible"
    >
      <defs>
        <linearGradient id="guide-star" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6fe4f4" />
          <stop offset="100%" stopColor="#2bb6d6" />
        </linearGradient>
      </defs>

      <path d={STAR} fill="url(#guide-star)" />

      {/* Two eyes — pupils glancing up. Blink occasionally to feel alive. */}
      <motion.g
        style={{ transformOrigin: "50px 47.5px" }}
        animate={reduced ? undefined : { scaleY: [1, 1, 0.1, 1] }}
        transition={{
          duration: 4.5,
          repeat: Infinity,
          times: [0, 0.9, 0.95, 1],
          ease: "easeInOut",
        }}
      >
        {/* left eye */}
        <circle cx="44" cy="47.5" r="5" fill="white" />
        <circle cx="44.9" cy="46.4" r="2.5" fill="#14213d" />
        <circle cx="45.8" cy="45.4" r="0.9" fill="white" />
        {/* right eye */}
        <circle cx="56" cy="47.5" r="5" fill="white" />
        <circle cx="56.9" cy="46.4" r="2.5" fill="#14213d" />
        <circle cx="57.8" cy="45.4" r="0.9" fill="white" />
      </motion.g>

      {/* Smile */}
      <path
        d="M47.8 54 Q50 56.6 52.2 54"
        fill="none"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

// The floating guide on the Home "Live Guide" card: the star gently bobs
// with a "Let's Go" speech bubble popping out beside it.
export function LiveGuideAvatar() {
  const reduced = useReducedMotion() ?? false;

  return (
    <div
      className="relative h-[118px] w-[132px] select-none"
      aria-hidden="true"
    >
      {/* Speech bubble — emerges once, from the star */}
      <motion.div
        className="absolute left-0 top-1 z-10 origin-bottom-right"
        initial={reduced ? false : { opacity: 0, scale: 0.6, y: 8 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div className="relative rounded-2xl rounded-br-md bg-white px-3 py-1.5 shadow-lg">
          <span className="whitespace-nowrap text-xs font-bold text-primary-900">
            Let's Go
          </span>
          {/* tail pointing down toward the star */}
          <span className="absolute -bottom-1 right-3.5 h-3 w-3 rotate-45 rounded-[3px] bg-white" />
        </div>
      </motion.div>

      {/* Floating compass star */}
      <motion.div
        className="absolute bottom-0 right-1"
        animate={reduced ? undefined : { y: [0, -7, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="relative h-[92px] w-[92px]">
          {/* soft cyan glow behind the star */}
          <div className="absolute inset-1 rounded-full bg-[#4fd8ee] opacity-45 blur-xl" />
          <GuideStar size={92} className="relative h-full w-full" />
        </div>
      </motion.div>
    </div>
  );
}
