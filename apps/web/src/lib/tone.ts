import type { Tone } from "@/types";

// Solid pill styles (coloured background, light text) for tags and badges.
export const pillToneClass: Record<Tone, string> = {
  blue: "bg-primary-600 text-white",
  amber: "bg-safety-armed text-white",
  green: "bg-safety-safe text-white",
  purple: "bg-[#7c5cff] text-white",
  white: "bg-white text-ink",
};

// Soft chip styles (tinted background, coloured icon) for SOS and banner icons.
export const softToneClass: Record<Tone, string> = {
  blue: "bg-primary-50 text-primary-600",
  amber: "bg-[#fdeede] text-safety-armed",
  green: "bg-[#e4f5ee] text-safety-safe",
  purple: "bg-[#efeafe] text-[#7c5cff]",
  white: "bg-white text-ink",
};
