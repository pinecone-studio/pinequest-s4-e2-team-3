import Link from "next/link";
import {
  CloseIcon,
  MapPinIcon,
  PlusIcon,
  RunIcon,
  ShieldIcon,
  WarningIcon,
} from "@/components/icons";
import { softToneClass } from "@/lib/tone";
import { sos } from "@/lib/mockData";
import type { SosOption } from "@/types";

// Map each emergency option to its icon. Kept here so the data stays plain.
const OPTION_ICON: Record<string, (props: { size?: number }) => React.ReactNode> = {
  "sos-1": RunIcon,
  "sos-2": MapPinIcon,
  "sos-3": PlusIcon,
  "sos-4": ShieldIcon,
};

// The Emergency sheet, shown as a bottom sheet over a dimmed backdrop.
export default function SosPage() {
  return (
    <div className="flex min-h-screen flex-col justify-end bg-black/40">
      <div className="mx-auto w-full max-w-md rounded-t-[28px] bg-white px-5 pb-8 pt-3">
        <div className="mx-auto h-1.5 w-10 rounded-full bg-sand-300" />

        <Header />

        <h3 className="mt-5 text-lg font-bold text-ink">What&apos;s happening?</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Tap the closest — I&apos;ll line up the right help and translate it into{" "}
          {sos.language} for the operator.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {sos.options.map((option) => (
            <OptionCard key={option.id} option={option} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="mt-3 flex items-start gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fde4e4] text-safety-critical">
        <WarningIcon size={20} />
      </span>
      <div className="flex-1">
        <h2 className="font-serif text-3xl leading-none text-ink">Emergency</h2>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink-muted">
          <span className="h-2 w-2 rounded-full bg-safety-safe" />
          {sos.location}
        </p>
      </div>
      <Link
        href="/"
        aria-label="Close"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-sand-100 text-ink-muted"
      >
        <CloseIcon size={18} />
      </Link>
    </div>
  );
}

function OptionCard({ option }: { option: SosOption }) {
  const Icon = OPTION_ICON[option.id];
  return (
    <button className="rounded-3xl border border-ink/5 bg-sand-50 p-4 text-left">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${softToneClass[option.tone]}`}
      >
        {Icon ? <Icon size={20} /> : null}
      </span>
      <p className="mt-3 font-bold text-ink">{option.title}</p>
      <p className="text-sm text-ink-muted">{option.subtitle}</p>
    </button>
  );
}
