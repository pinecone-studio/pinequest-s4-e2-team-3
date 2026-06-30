"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import {
  CloseIcon,
  MapPinIcon,
  MicIcon,
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
import { useTwilioCall } from "@/hooks/useTwilioCall";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useOnlineStatus } from "@/context/OnlineStatus";
import type { SosOption } from "@/types";

const OPTION_ICON: Record<string, (props: { size?: number }) => React.ReactNode> = {
  "sos-1": RunIcon,
  "sos-2": MapPinIcon,
  "sos-3": PlusIcon,
  "sos-4": ShieldIcon,
};

const COUNTDOWN_SECONDS = 5;

type Step = "choose" | "countdown" | "ready" | "calling";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Writes a single incident to the offline queue in localStorage.
function enqueueOfflineIncident(
  option: SosOption,
  location: EmergencyLocation,
  language: string,
) {
  try {
    const incident = {
      type: option.id,
      title: option.title,
      service: option.service,
      service_number: option.serviceNumber,
      lat: location.rawLat,
      lng: location.rawLng,
      place_name: location.place,
      coords: location.coords,
      language,
      queuedAt: Date.now(),
    };
    const prev = JSON.parse(localStorage.getItem("sos:queued_incidents") ?? "[]");
    localStorage.setItem("sos:queued_incidents", JSON.stringify([...prev, incident]));
  } catch {
    // ignore storage errors
  }
}

export function SosFlow({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState<Step>("choose");
  const [selected, setSelected] = useState<SosOption | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [checkInRequested, setCheckInRequested] = useState(false);
  const [customText, setCustomText] = useState("");
  const [translating, setTranslating] = useState(false);
  const location = useEmergencyLocation();
  const voice = useSpeechRecognition(setCustomText);
  const { online } = useOnlineStatus();

  // Free-form SOS: the traveller describes their emergency in their own words
  // (typed or spoken), we translate it to Mongolian, then the same call flow reads
  // the translation aloud to the operator.
  async function startCustomCall() {
    const text = customText.trim();
    if (!text || translating) return;
    setTranslating(true);
    let messageMn = text;
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, from: "en", to: "mn" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.translation) messageMn = data.translation;
      }
    } catch {
      /* fall back to the original text */
    }
    setTranslating(false);
    startCountdown({
      id: "sos-custom",
      title: "Emergency",
      subtitle: "Your description",
      tone: "amber",
      message: text,
      messageMn,
      service: "Emergency",
      serviceNumber: "103",
    });
  }

  useEffect(() => {
    if (!incidentId) return;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const channel = supabase
      .channel(`incident_${incidentId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "sos_incidents",
        filter: `id=eq.${incidentId}`,
      }, (payload) => {
        const row = payload.new as { check_in_requested?: boolean; status?: string };
        if (row.check_in_requested) setCheckInRequested(true);
        if (row.status === "resolved") setCheckInRequested(false);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [incidentId]);

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
    setIncidentId(null);
    setCheckInRequested(false);
    localStorage.removeItem("sos_incident_id");
  }

  // Initiates the Twilio-assisted in-app call (online only).
  async function handleTwilioCall() {
    if (!selected) return;
    const language = navigator.language;
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
      is_online: true,
    }).then((id) => {
      if (id) {
        setIncidentId(id);
        localStorage.setItem("sos_incident_id", id);
      }
    }).catch(() => {});
    setStep("calling");
  }

  return (
    <div className="relative mx-auto w-full max-w-md rounded-t-[28px] bg-white px-5 pb-8 pt-3">
      <div className="mx-auto h-1.5 w-10 rounded-full bg-sand-300" />
      <Header onClose={onClose} location={location} />
      {step === "choose" ? (
        <>
          <ChooseGrid onChoose={startCountdown} />
          <CustomEmergency
            text={customText}
            onText={setCustomText}
            onSubmit={startCustomCall}
            translating={translating}
            voice={voice}
          />
        </>
      ) : null}
      {step === "countdown" && selected ? (
        <CountdownView option={selected} secondsLeft={secondsLeft} onCancel={cancel} />
      ) : null}
      {step === "ready" && selected ? (
        <ReadyView
          option={selected}
          location={location}
          isOnline={online}
          onTwilioCall={handleTwilioCall}
        />
      ) : null}
      {step === "calling" && selected ? (
        <CallView option={selected} location={location} incidentId={incidentId} onEnd={cancel} />
      ) : null}

      {/* Check-in overlay — admin asked "Are you okay?" */}
      {checkInRequested && incidentId && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-t-[28px] bg-white/95 backdrop-blur-sm px-6 text-center z-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 mb-4">
            <span className="text-3xl">👋</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900">Are you okay?</h3>
          <p className="mt-2 text-sm text-gray-500">The support team is checking on you</p>
          <button
            onClick={async () => {
              setCheckInRequested(false);
              await fetch("/api/sos/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: incidentId }),
              }).catch(() => {});
              cancel();
            }}
            className="mt-6 w-full rounded-2xl bg-green-500 py-4 text-base font-bold text-white"
          >
            Yes, I&apos;m safe ✓
          </button>
          <button
            onClick={async () => {
              setCheckInRequested(false);
              await fetch("/api/sos/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: incidentId, action: "decline" }),
              }).catch(() => {});
            }}
            className="mt-3 w-full rounded-2xl border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-600"
          >
            No, I still need help
          </button>
        </div>
      )}
    </div>
  );
}

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

// Free-form emergency: the traveller types or speaks what's wrong in their own
// language; we translate it to Mongolian and call the operator with it.
function CustomEmergency({
  text,
  onText,
  onSubmit,
  translating,
  voice,
}: {
  text: string;
  onText: (v: string) => void;
  onSubmit: () => void;
  translating: boolean;
  voice: { isListening: boolean; isSupported: boolean; start: () => void; stop: () => void };
}) {
  return (
    <div className="mt-5 rounded-3xl border border-ink/5 bg-sand-50 p-4">
      <p className="text-sm font-bold text-ink">Or describe it in your own words</p>
      <p className="mt-0.5 text-xs text-ink-muted">
        Type or speak what&apos;s wrong — we translate it to Mongolian and read it to the operator.
      </p>
      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => onText(e.target.value)}
          rows={2}
          placeholder={voice.isListening ? "Listening…" : "e.g. My friend is unconscious and not breathing"}
          className="flex-1 resize-none rounded-2xl border border-ink/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary-500"
        />
        {voice.isSupported ? (
          <button
            type="button"
            onClick={() => (voice.isListening ? voice.stop() : voice.start())}
            aria-label={voice.isListening ? "Stop voice" : "Speak"}
            className={
              voice.isListening
                ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-safety-critical text-white animate-pulse"
                : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink-muted shadow-sm"
            }
          >
            <MicIcon size={20} />
          </button>
        ) : null}
      </div>
      <button
        onClick={onSubmit}
        disabled={!text.trim() || translating}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d96a5f] py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {translating ? "Translating…" : "Translate & get help"}
      </button>
    </div>
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
  isOnline,
  onTwilioCall,
}: {
  option: SosOption;
  location: EmergencyLocation;
  isOnline: boolean;
  onTwilioCall: () => void;
}) {
  // Auto-queue the incident to localStorage the moment the user arrives at
  // the ready screen while offline. The OnlineStatusProvider flushes this to
  // Supabase as soon as connectivity is restored.
  const queued = useRef(false);
  useEffect(() => {
    if (isOnline || queued.current) return;
    queued.current = true;
    enqueueOfflineIncident(option, location, navigator.language);
  }, [isOnline, option, location]);

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

      {/* Offline queued state — shown alongside direct-dial, never instead of it */}
      {!isOnline && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-800">
            ⏳
          </span>
          <div>
            <p className="text-sm font-bold text-amber-900">Report queued</p>
            <p className="mt-0.5 text-xs leading-snug text-amber-800">
              Your location and emergency details are saved on this device and will
              auto-send to our team the moment you reconnect.
            </p>
          </div>
        </div>
      )}

      {/* Direct-dial — ALWAYS shown regardless of connectivity. Works with no data
          via the native phone dialer. Primary action when offline. */}
      <a
        href={`tel:${option.serviceNumber}`}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#d96a5f] py-4 text-base font-bold text-white shadow-lg shadow-[#d96a5f]/30"
      >
        <PhoneIcon size={20} />
        Call {option.serviceNumber} · {option.service}
      </a>
      <p className="mt-2 text-center text-xs font-semibold text-ink-muted">
        {isOnline
          ? "Your location is attached automatically"
          : "Calls directly from your phone — no internet needed"}
      </p>

      {/* AI-assisted Twilio call — secondary action, online only */}
      {isOnline && (
        <button
          onClick={onTwilioCall}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-ink/10 bg-white py-3.5 text-sm font-bold text-ink hover:bg-sand-50"
        >
          <SpeakerIcon size={18} />
          AI-assisted call in Mongolian
        </button>
      )}
    </div>
  );
}

// The in-app Twilio call screen — only reachable when online (user clicked the
// AI-assisted call button). No offline fallback needed here; the ReadyView
// handles everything before this step.
function CallView({
  option,
  location,
  incidentId,
  onEnd,
}: {
  option: SosOption;
  location: EmergencyLocation;
  incidentId: string | null;
  onEnd: () => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const { status, call, hangup, say } = useTwilioCall();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ en: string; mn: string }[]>([]);
  const [operatorMsgs, setOperatorMsgs] = useState<{ mn: string; en: string }[]>([]);
  const followUpVoice = useSpeechRecognition(setFollowUp);

  // Poll the operator's transcribed + translated replies while on the call.
  useEffect(() => {
    if (!incidentId) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/sos/status?id=${incidentId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.messages)) setOperatorMsgs(data.messages);
        }
      } catch { /* ignore */ }
    };
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [incidentId]);

  // Mid-call: translate a new English phrase to Mongolian and speak it to the
  // operator on the live call — so the traveller keeps the conversation going.
  async function sendFollowUp() {
    const text = followUp.trim();
    if (!text || sending) return;
    setSending(true);
    let mn = text;
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, from: "en", to: "mn" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.translation) mn = data.translation;
      }
    } catch {
      /* fall back to original text */
    }
    await say(mn);
    setSent((s) => [...s, { en: text, mn }]);
    setFollowUp("");
    setSending(false);
  }

  useEffect(() => {
    const place = location.place ?? "the traveller's current location";
    const enCo = location.coords ? ` Coordinates ${location.coords}.` : "";
    const en = `Emergency call for ${option.service}. ${option.message} My location is ${place}.${enCo}`;
    const mnPlace = location.place ? ` Миний байршил ${location.place}.` : "";
    const mn = `${option.messageMn}${mnPlace}`;
    call(en, mn, incidentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== "connected") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      audioRef.current?.pause();
    };
  }, []);

  const place = location.place ?? "your current location";
  const coords = location.coords;
  const mongolianLocation = `Миний байршил: ${place}.${coords ? ` Координат: ${coords}.` : ""}`;

  async function readAloud() {
    const text = `${option.messageMn} ${mongolianLocation}`;
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang: "mn" }),
      });
      if (res.ok) {
        const url = URL.createObjectURL(await res.blob());
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
        return;
      }
    } catch {
      /* fall through to browser speech */
    }
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "mn-MN";
    window.speechSynthesis.speak(utterance);
  }

  function endCall() {
    hangup();
    onEnd();
  }

  const banner = CALL_STATUS[status];

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between rounded-2xl bg-ink px-5 py-4 text-white">
        <div className="flex items-start gap-3">
          <span className={`mt-1 h-2.5 w-2.5 rounded-full ${banner.dot}`} />
          <div>
            <p className="font-bold leading-tight">
              {banner.title} · {option.serviceNumber} {option.service}
            </p>
            <p className="text-sm text-white/60">{banner.subtitle}</p>
          </div>
        </div>
        {status === "connected" ? (
          <span className="font-mono text-xl font-bold tabular-nums">{formatDuration(seconds)}</span>
        ) : null}
      </div>

      {/* Operator's replies — their Mongolian speech transcribed + translated to English */}
      <div className="mt-4 rounded-3xl border border-ink/5 bg-sand-50 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-ink">Operator · {option.serviceNumber}</p>
          <span className="flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-600">
            MN <span aria-hidden>→</span> EN
          </span>
        </div>
        {operatorMsgs.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">Listening for the operator&apos;s reply…</p>
        ) : (
          <div className="mt-2 space-y-1.5">
            {operatorMsgs.map((m, i) => (
              <div key={i} className="rounded-xl bg-white px-3 py-2">
                <p className="text-sm font-semibold text-ink">{m.en}</p>
                <p className="text-xs text-ink-muted">{m.mn}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={readAloud}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary-600 py-4 text-base font-bold text-white shadow-lg shadow-primary-600/30"
      >
        <SpeakerIcon size={20} />
        Read aloud in Mongolian
      </button>

      {/* Say more — translate a new phrase and speak it to the operator live */}
      <div className="mt-4 rounded-3xl border border-ink/5 bg-sand-50 p-4">
        <p className="text-sm font-bold text-ink">Say more to the operator</p>
        {sent.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {sent.map((s, i) => (
              <div key={i} className="rounded-xl bg-white px-3 py-2">
                <p className="text-xs text-ink-muted">{s.en}</p>
                <p className="text-sm font-semibold text-ink">{s.mn}</p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-end gap-2">
          <textarea
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            rows={1}
            placeholder={followUpVoice.isListening ? "Listening…" : "Type or speak in English…"}
            className="flex-1 resize-none rounded-2xl border border-ink/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary-500"
          />
          {followUpVoice.isSupported ? (
            <button
              type="button"
              onClick={() => (followUpVoice.isListening ? followUpVoice.stop() : followUpVoice.start())}
              aria-label={followUpVoice.isListening ? "Stop voice" : "Speak"}
              className={
                followUpVoice.isListening
                  ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-safety-critical text-white animate-pulse"
                  : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink-muted shadow-sm"
              }
            >
              <MicIcon size={20} />
            </button>
          ) : null}
        </div>
        <button
          onClick={sendFollowUp}
          disabled={!followUp.trim() || sending}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {sending ? "Translating…" : "Translate & say it"}
        </button>
      </div>

      <button
        onClick={endCall}
        className="mt-3 w-full rounded-full bg-[#fbe9e7] py-4 text-base font-bold text-safety-critical"
      >
        End call
      </button>
    </div>
  );
}

const CALL_STATUS = {
  connecting: { title: "Calling", subtitle: "Dialing the operator…", dot: "bg-safety-armed animate-pulse" },
  connected: { title: "On call", subtitle: "Reading your message to the operator in Mongolian", dot: "bg-safety-safe" },
  ended: { title: "Call ended", subtitle: "You can call again if you need to", dot: "bg-ink-muted" },
  unavailable: { title: "Couldn't place call", subtitle: "Tap End and try again", dot: "bg-safety-critical" },
} as const;

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

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
