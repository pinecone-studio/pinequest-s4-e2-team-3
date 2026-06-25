import Link from "next/link";
import {
  BarsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  MicIcon,
  PauseIcon,
  StarIcon,
} from "@/components/icons";
import { liveGuide } from "@/lib/mockData";

// The dark, full-screen live guide. It sits outside the (app) shell, so it has
// no sidebar/tab bar — just the map and the narration card.
export default function LiveGuidePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0d1422] text-white">
      <MapBackdrop />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-6 pt-6">
        <TopBar />
        <NextStopPill />
        <div className="flex-1" />
        <NarrationCard />
      </div>
    </div>
  );
}

function TopBar() {
  const { temperature, walk, crowd } = liveGuide.status;
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/journey"
        aria-label="Back"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
      >
        <ChevronLeftIcon size={20} />
      </Link>

      <StatusPill>
        <StarIcon size={13} className="text-safety-armed" />
        {temperature}
      </StatusPill>
      <StatusPill>
        <MapPinIcon size={13} />
        {walk}
      </StatusPill>
      <StatusPill>
        <span className="h-2 w-2 rounded-full bg-safety-safe" />
        {crowd}
      </StatusPill>

      <Link
        href="/sos"
        className="ml-auto flex h-10 items-center rounded-full bg-safety-critical px-4 text-xs font-extrabold tracking-wide"
      >
        SOS
      </Link>
    </div>
  );
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-bold">
      {children}
    </span>
  );
}

function NextStopPill() {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-full bg-white/10 px-3 py-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-600">
        <MapPinIcon size={13} />
      </span>
      <span className="text-xs font-semibold text-white/70">Next</span>
      <span className="text-sm font-bold">{liveGuide.nextStop}</span>
      <ChevronRightIcon size={16} className="ml-auto text-white/50" />
    </div>
  );
}

// A simple stylised route — a dotted path with a start dot and a pulsing
// current-location marker. Stands in for the real map.
function MapBackdrop() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_70%_20%,#16233d_0%,#0d1422_60%)]" />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d="M30 28 C 20 45, 60 50, 50 62 S 60 85, 52 95"
          fill="none"
          stroke="#2f6bff"
          strokeWidth="3"
          strokeDasharray="1 5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="absolute left-[30%] top-[28%] h-3 w-3 -translate-x-1/2 rounded-full bg-safety-safe" />
      <span className="absolute left-[50%] top-[62%] flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-primary-600 ring-8 ring-primary-600/20">
        <span className="h-2.5 w-2.5 rounded-full bg-white" />
      </span>
    </div>
  );
}

function NarrationCard() {
  return (
    <div className="rounded-3xl bg-white/[0.07] p-5 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700" />
        <div>
          <p className="font-bold">Nova</p>
          <p className="text-xs text-white/60">speaking · live guide</p>
        </div>
        <BarsIcon size={22} className="ml-auto text-primary-500" />
      </div>

      <p className="mt-4 text-lg leading-snug">{liveGuide.narration}</p>

      <div className="mt-5 flex items-center gap-3">
        <button
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-600"
          aria-label="Pause"
        >
          <PauseIcon size={20} />
        </button>
        <button className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/10 py-3.5 text-sm font-bold">
          Next moment
          <ChevronRightIcon size={16} />
        </button>
        <button
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10"
          aria-label="Microphone"
        >
          <MicIcon size={20} />
        </button>
      </div>
    </div>
  );
}
