"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CloseIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  RunIcon,
  ShieldIcon,
  SpeakerIcon,
  WarningIcon,
} from "@/components/icons";
import { softToneClass } from "@/lib/tone";
import { sos } from "@/lib/mockData";
import { logSosIncident } from "@/lib/sosIncidents";
import {
  useEmergencyLocation,
  type EmergencyLocation,
} from "@/hooks/useEmergencyLocation";
import type { SosOption } from "@/types";

// Map each emergency option to its icon. Kept here so the data stays plain.
const OPTION_ICON: Record<string, (props: { size?: number }) => React.ReactNode> = {
  "sos-1": RunIcon,
  "sos-2": MapPinIcon,
  "sos-3": PlusIcon,
  "sos-4": ShieldIcon,
};

// How long the "getting help ready" countdown runs before showing the call screen.
const COUNTDOWN_SECONDS = 5;

type Step = "choose" | "countdown" | "ready" | "calling";

// The Emergency sheet (the white card only — the backdrop is supplied by the
// caller). Tapping an option starts a short countdown that the user can cancel;
// if it finishes, the prepared call screen appears.
// `onClose` lets the modal dismiss with router.back(); without it the close
// button falls back to a link home (used by the standalone /sos page).
export function SosFlow({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState<Step>("choose");
  const [selected, setSelected] = useState<SosOption | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const location = useEmergencyLocation();

  useEffect(() => {
    if (step !== "countdown") return;
    if (secondsLeft <= 0) {
      setStep("ready");
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, secondsLeft]);

  function startCountdown(option: SosOption) {
    setSelected(option);
    setSecondsLeft(COUNTDOWN_SECONDS);
    setStep("countdown");
  }

  function cancel() {
    setStep("choose");
    setSelected(null);
    setSecondsLeft(COUNTDOWN_SECONDS);
  }

  return (
    <div className="relative mx-auto w-full max-w-md rounded-t-[28px] bg-white px-5 pb-8 pt-3">
      <div className="mx-auto h-1.5 w-10 rounded-full bg-sand-300" />
      <Header onClose={onClose} location={location} />
      {step === "choose" ? <ChooseGrid onChoose={startCountdown} /> : null}
      {step === "countdown" && selected ? (
        <CountdownView option={selected} secondsLeft={secondsLeft} onCancel={cancel} />
      ) : null}
      {step === "ready" && selected ? (
        <ReadyView
          option={selected}
          location={location}
          onCall={async () => {
            const language = navigator.language;
            const isOnline = navigator.onLine;
            let batteryLevel: number | null = null;
            if ("getBattery" in navigator) {
              try {
                const bat = await (navigator as unknown as { getBattery(): Promise<{ level: number }> }).getBattery();
                batteryLevel = Math.round(bat.level * 100);
              } catch { /* unsupported */ }
            }
            logSosIncident({
              type: selected.id,
              title: selected.title,
              service: selected.service,
              service_number: selected.serviceNumber,
              lat: location.rawLat,
              lng: location.rawLng,
              place_name: location.place,
              coords: location.coords,
              language,
              battery_level: batteryLevel,
              is_online: isOnline,
            }).catch(() => {});
            setStep("calling");
          }}
        />
      ) : null}
      {step === "calling" && selected ? (
        <CallView option={selected} location={location} onEnd={cancel} />
      ) : null}
    </div>
  );
}

// Wording + colour for the small location status line under "Emergency".
const LOCATION_STATUS = {
  loading: { text: "Locating you…", color: "text-ink-muted", dot: "bg-ink-muted" },
  ready: { text: "Location ready", color: "text-safety-safe", dot: "bg-safety-safe" },
  denied: {
    text: "Location unavailable",
    color: "text-safety-critical",
    dot: "bg-safety-critical",
  },
} as const;

function Header({
  onClose,
  location,
}: {
  onClose?: () => void;
  location: EmergencyLocation;
}) {
  const closeClass =
    "flex h-9 w-9 items-center justify-center rounded-full bg-sand-100 text-ink-muted";
  const status = LOCATION_STATUS[location.status];
  return (
    <div className="mt-3 flex items-start gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fde4e4] text-safety-critical">
        <WarningIcon size={20} />
      </span>
      <div className="flex-1">
        <h2 className="font-serif text-3xl leading-none text-ink">Emergency</h2>
        <p className={`mt-1 flex items-center gap-1.5 text-sm font-semibold ${status.color}`}>
          <span className={`h-2 w-2 rounded-full ${status.dot}`} />
          {status.text}
        </p>
      </div>
      {onClose ? (
        <button onClick={onClose} aria-label="Close" className={closeClass}>
          <CloseIcon size={18} />
        </button>
      ) : (
        <Link href="/" aria-label="Close" className={closeClass}>
          <CloseIcon size={18} />
        </Link>
      )}
    </div>
  );
}

function ChooseGrid({ onChoose }: { onChoose: (option: SosOption) => void }) {
  return (
    <>
      <h3 className="mt-5 text-lg font-bold text-ink">What&apos;s happening?</h3>
      <p className="mt-1 text-sm text-ink-muted">
        Tap the closest — I&apos;ll line up the right help and translate it into{" "}
        {sos.language} for the operator.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {sos.options.map((option) => {
          const Icon = OPTION_ICON[option.id];
          return (
            <button
              key={option.id}
              onClick={() => onChoose(option)}
              className="rounded-3xl border border-ink/5 bg-sand-50 p-4 text-left transition-colors hover:bg-sand-100"
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${softToneClass[option.tone]}`}
              >
                {Icon ? <Icon size={20} /> : null}
              </span>
              <p className="mt-3 font-bold text-ink">{option.title}</p>
              <p className="text-sm text-ink-muted">{option.subtitle}</p>
            </button>
          );
        })}
      </div>
    </>
  );
}

function CountdownView({
  option,
  secondsLeft,
  onCancel,
}: {
  option: SosOption;
  secondsLeft: number;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <CountdownRing secondsLeft={secondsLeft} />

      <h3 className="mt-6 text-center text-xl font-bold text-ink">
        Getting help ready — {option.title}
      </h3>
      <p className="mt-2 text-center text-sm text-ink-muted">
        Stay where you are. I&apos;m preparing {option.service} (
        {option.serviceNumber}) and attaching your live location.
      </p>

      <button
        onClick={onCancel}
        className="mt-6 w-full rounded-2xl border border-ink/10 bg-white py-4 text-base font-bold text-ink"
      >
        Cancel — I&apos;m okay
      </button>
    </div>
  );
}

// The draining red ring with the seconds count in the middle. The ring runs one
// smooth animation across the whole countdown so it empties exactly when the
// timer hits zero (rather than stepping once per second).
function CountdownRing({ secondsLeft }: { secondsLeft: number }) {
  const radius = 52;

  return (
    <div className="relative my-4 h-40 w-40">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e8e0d3" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#e53935"
          strokeWidth="9"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          style={{ animation: `sosDrain ${COUNTDOWN_SECONDS}s linear forwards` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-6xl font-extrabold text-safety-critical">
          {secondsLeft}
        </span>
        <span className="text-xs font-bold uppercase tracking-wide text-ink-muted">
          Seconds
        </span>
      </div>
    </div>
  );
}

function ReadyView({
  option,
  location,
  onCall,
}: {
  option: SosOption;
  location: EmergencyLocation;
  onCall: () => void;
}) {
  return (
    <div>
      <div className="mt-4 rounded-3xl border border-ink/5 bg-sand-50 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">
          Ready to send
        </p>
        <h3 className="mt-2 text-2xl font-bold text-ink">{option.title}</h3>
        <p className="mt-2 text-sm text-ink-muted">{option.message}</p>

        <div className="my-4 h-px bg-ink/10" />

        <div className="flex items-start gap-2">
          <MapPinIcon size={18} className="mt-0.5 text-safety-safe" />
          <LocationLine location={location} />
        </div>
      </div>

      <button
        onClick={onCall}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#d96a5f] py-4 text-base font-bold text-white shadow-lg shadow-[#d96a5f]/30"
      >
        <PhoneIcon size={20} />
        Call {option.serviceNumber} · {option.service}
      </button>
      <p className="mt-3 text-center text-sm text-ink-muted">
        Your location is attached automatically
      </p>
    </div>
  );
}

// The in-app call screen (matches the Emergency mockup): a live "On call" banner
// with a running timer, the operator-ready message shown in English and Mongolian,
// and actions to read it aloud, watch help arrive, or end the call. The call runs
// entirely inside the web app — it never hands off to the phone dialer.
function CallView({
  option,
  location,
  onEnd,
}: {
  option: SosOption;
  location: EmergencyLocation;
  onEnd: () => void;
}) {
  const [seconds, setSeconds] = useState(0);

  // A simple call timer, ticking up from connection.
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Stop any speech if the screen unmounts (e.g. the call ends mid-readout).
  useEffect(() => {
    return () => window.speechSynthesis?.cancel();
  }, []);

  const place = location.place ?? "your current location";
  const coords = location.coords;
  const englishLocation = `My location is ${place}.${coords ? ` Coordinates ${coords}.` : ""}`;
  const mongolianLocation = `Миний байршил: ${place}.${coords ? ` Координат: ${coords}.` : ""}`;

  function readAloud() {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${option.messageMn} ${mongolianLocation}`);
    utterance.lang = "mn-MN";
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="mt-4">
      {/* Live call banner */}
      <div className="flex items-center justify-between rounded-2xl bg-ink px-5 py-4 text-white">
        <div className="flex items-start gap-3">
          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-safety-safe" />
          <div>
            <p className="font-bold leading-tight">
              On call · {option.serviceNumber} {option.service}
            </p>
            <p className="text-sm text-white/60">Connected · operator speaks Mongolian</p>
          </div>
        </div>
        <span className="font-mono text-xl font-bold tabular-nums">{formatDuration(seconds)}</span>
      </div>

      {/* The message the operator hears, in English and Mongolian */}
      <div className="mt-4 rounded-3xl border border-ink/5 bg-sand-50 p-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">
            Your message
          </p>
          <span className="flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-600">
            EN <span aria-hidden>→</span> MN
          </span>
        </div>

        <p className="mt-3 text-base leading-relaxed text-ink-muted">
          {option.message} {englishLocation}
        </p>

        <div className="my-4 h-px bg-ink/10" />

        <p className="text-lg font-bold leading-relaxed text-ink">{option.messageMn}</p>
        <p className="mt-2 text-base leading-relaxed text-ink-muted">{mongolianLocation}</p>
      </div>

      <button
        onClick={readAloud}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary-600 py-4 text-base font-bold text-white shadow-lg shadow-primary-600/30"
      >
        <SpeakerIcon size={20} />
        Read aloud in Mongolian
      </button>

      <button
        onClick={onEnd}
        className="mt-3 w-full rounded-full bg-[#fbe9e7] py-4 text-base font-bold text-safety-critical"
      >
        End call
      </button>
    </div>
  );
}

// Seconds → mm:ss for the call timer.
function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// Shows the real device location: place name + coordinates once available, or a
// loading / permission message while it isn't.
function LocationLine({ location }: { location: EmergencyLocation }) {
  if (location.status === "denied") {
    return (
      <div>
        <p className="font-bold text-ink">Location unavailable</p>
        <p className="text-sm text-ink-muted">
          Enable location access to share your position
        </p>
      </div>
    );
  }

  if (!location.coords) {
    return (
      <div>
        <p className="font-bold text-ink">Locating you…</p>
        <p className="text-sm text-ink-muted">Getting your exact position</p>
      </div>
    );
  }

  return (
    <div>
      <p className="font-bold text-ink">{location.place ?? "Current location"}</p>
      <p className="text-sm text-ink-muted">{location.coords}</p>
    </div>
  );
}
