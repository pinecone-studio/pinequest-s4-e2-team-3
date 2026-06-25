import { MicIcon, SwapIcon } from "@/components/icons";
import { interpreterLanguages, interpreterSegments } from "@/lib/mockData";
import type { InterpreterSegment } from "@/types";

export default function TranslatePage() {
  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col lg:h-[calc(100vh-5rem)]">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-4xl leading-none text-ink">Interpreter</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Just talk — I&apos;ll handle both sides.
          </p>
        </div>
        <LanguagePill />
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto py-5">
        {interpreterSegments.map((segment) => (
          <Segment key={segment.id} segment={segment} />
        ))}
      </div>

      <MicControl />
    </div>
  );
}

function LanguagePill() {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-bold text-ink shadow-sm">
      {interpreterLanguages.from}
      <SwapIcon size={16} className="text-primary-600" />
      {interpreterLanguages.to}
    </div>
  );
}

function Segment({ segment }: { segment: InterpreterSegment }) {
  const isYou = segment.side === "you";
  return (
    <div className={isYou ? "flex flex-col items-end" : "flex flex-col items-start"}>
      <p
        className={[
          "text-[11px] font-bold uppercase tracking-wide",
          isYou ? "text-primary-600" : "text-safety-safe",
        ].join(" ")}
      >
        {segment.label}
      </p>
      <p
        className={[
          "mt-2 max-w-[85%] rounded-3xl px-4 py-3 text-base font-semibold",
          isYou ? "bg-primary-600 text-white" : "bg-white text-ink shadow-sm",
        ].join(" ")}
      >
        {segment.text}
      </p>
      {segment.sub ? (
        <p className="mt-1.5 text-xs text-ink-muted">{segment.sub}</p>
      ) : null}
    </div>
  );
}

// The single primary action — a big thumb-friendly mic button.
function MicControl() {
  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <p className="text-sm font-bold text-ink">Tap to reply</p>
      <button
        className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/30"
        aria-label="Tap to reply"
      >
        <MicIcon size={28} />
      </button>
      <p className="text-sm text-ink-muted">
        I&apos;ll keep the conversation flowing
      </p>
    </div>
  );
}
