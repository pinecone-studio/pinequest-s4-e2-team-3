import type { Tone } from "@/types";
import { pillToneClass } from "@/lib/tone";

type TagProps = {
  label: string;
  tone?: Tone;
};

// Small rounded pill used for spot categories, journey stop labels and status
// badges. The colour comes from `tone`.
export function Tag({ label, tone = "white" }: TagProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${pillToneClass[tone]}`}
    >
      {label}
    </span>
  );
}
