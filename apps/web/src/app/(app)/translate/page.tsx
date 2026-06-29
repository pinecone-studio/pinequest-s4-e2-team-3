"use client";

import { useRef, useState, useEffect } from "react";
import { SwapIcon } from "@/components/icons";
import { useOnline } from "@/hooks/useOnline";

type Turn = {
  id: string;
  spokenLang: "mn" | "en";
  spokenText: string;
  translatedText: string;
  audioUrl?: string;
};

const STORAGE_KEY = "lumo_interpreter_turns";

function loadTurns(): Turn[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveTurns(turns: Turn[]) {
  const clean = turns.map(({ audioUrl: _a, ...t }) => t);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
}

const LANG = {
  mn: { label: "Mongolian" },
  en: { label: "English" },
};

const QUICK_PHRASES: { en: string; mn: string; audio: string }[] = [
  { en: "I am lost.",                        mn: "Би төөрчихлөө.",                         audio: "/phrases/phrase-00.wav" },
  { en: "Where is the nearest bus stop?",    mn: "Ойрын автобусны буудал хаана байна вэ?", audio: "/phrases/phrase-01.wav" },
  { en: "Where can I find WiFi?",            mn: "Интернет хаана байдаг вэ?",              audio: "/phrases/phrase-02.wav" },
  { en: "How much does this cost?",          mn: "Энэ хэд вэ?",                            audio: "/phrases/phrase-03.wav" },
  { en: "Where is the toilet?",              mn: "Жорлон хаана байна вэ?",                 audio: "/phrases/phrase-04.wav" },
  { en: "Please help me.",                   mn: "Надад тусалж өгнө үү.",                  audio: "/phrases/phrase-05.wav" },
  { en: "I need a doctor.",                  mn: "Надад эмч хэрэгтэй байна.",              audio: "/phrases/phrase-06.wav" },
  { en: "Where is the hotel?",               mn: "Зочид буудал хаана байна вэ?",           audio: "/phrases/phrase-07.wav" },
  { en: "Do you speak English?",             mn: "Та англиар ярьж чадах уу?",              audio: "/phrases/phrase-08.wav" },
  { en: "Thank you.",                        mn: "Баярлалаа.",                             audio: "/phrases/phrase-09.wav" },
  { en: "How do I get to the city center?", mn: "Хот төв рүү хэрхэн очих вэ?",           audio: "/phrases/phrase-10.wav" },
  { en: "Can you call a taxi for me?",       mn: "Надад такси дуудаж өгнө үү.",           audio: "/phrases/phrase-11.wav" },
];

function FlagIcon({ lang, size = 18 }: { lang: "mn" | "en"; size?: number }) {
  const w = Math.round(size * 1.5);
  if (lang === "mn") {
    return (
      <svg width={w} height={size} viewBox="0 0 3 2" aria-label="Mongolia" className="rounded-sm overflow-hidden shrink-0">
        <rect width="1" height="2" fill="#C4272F" />
        <rect x="1" width="1" height="2" fill="#015197" />
        <rect x="2" width="1" height="2" fill="#C4272F" />
      </svg>
    );
  }
  return (
    <svg width={w} height={size} viewBox="0 0 60 30" aria-label="United Kingdom" className="rounded-sm overflow-hidden shrink-0">
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0l60 30M60 0L0 30" stroke="#fff" strokeWidth="7" />
      <path d="M0 0l60 30M60 0L0 30" stroke="#C8102E" strokeWidth="4.5" />
      <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="11" />
      <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="7" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function WifiOffIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  );
}

// ── Offline view ──────────────────────────────────────────────────────────────

function OfflineView() {
  const [playing, setPlaying] = useState<string | null>(null);

  const playPhrase = (phrase: { en: string; mn: string; audio: string }) => {
    const audio = new Audio(phrase.audio);
    setPlaying(phrase.en);
    audio.onended = () => setPlaying(null);
    audio.onerror = () => setPlaying(null);
    audio.play();
  };

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col lg:h-[calc(100dvh-5rem)]">
      {/* Header */}
      <header className="pb-4">
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2.5">
          <WifiOffIcon />
          <div>
            <p className="text-sm font-bold text-amber-800">You're offline</p>
            <p className="text-xs text-amber-700">Tap a phrase to play it aloud in Mongolian</p>
          </div>
        </div>
        <h1 className="font-serif text-3xl leading-none tracking-tight text-ink">Quick Phrases</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pre-translated phrases — no internet needed.
        </p>
      </header>

      {/* Phrase cards */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pb-2">
        {QUICK_PHRASES.map((phrase) => {
          const isPlaying = playing === phrase.en;
          return (
            <button
              key={phrase.en}
              onClick={() => playPhrase(phrase)}
              className={[
                "w-full rounded-2xl border text-left transition-all active:scale-[0.98]",
                isPlaying
                  ? "border-primary-300 bg-primary-50 shadow-md"
                  : "border-sand-200 bg-white shadow-ink-sm hover:border-primary-200 hover:bg-primary-50/40",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <FlagIcon lang="en" size={11} />
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">English</p>
                  </div>
                  <p className="font-semibold text-sm text-ink leading-snug">{phrase.en}</p>
                  <div className="flex items-center gap-1.5 mt-2 mb-0.5">
                    <FlagIcon lang="mn" size={11} />
                    <p className="text-[10px] font-bold uppercase tracking-wide text-primary-500">Mongolian</p>
                  </div>
                  <p className="text-sm text-primary-700 font-medium leading-snug">{phrase.mn}</p>
                </div>
                <div className={[
                  "shrink-0 flex h-10 w-10 items-center justify-center rounded-full transition-all",
                  isPlaying
                    ? "bg-primary-600 text-white animate-pulse"
                    : "bg-primary-100 text-primary-600",
                ].join(" ")}>
                  <SpeakerIcon />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Online view ───────────────────────────────────────────────────────────────

function OnlineView() {
  const recorderRef   = useRef<MediaRecorder | null>(null);
  const chunksRef     = useRef<Blob[]>([]);
  const activeLangRef = useRef<"mn" | "en">("mn");
  const mimeTypeRef   = useRef<string>("audio/webm");
  const bottomRef     = useRef<HTMLDivElement | null>(null);

  const [activeLang, setActiveLang] = useState<"mn" | "en" | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [turns,      setTurns]      = useState<Turn[]>([]);
  const [micError,   setMicError]   = useState<string | null>(null);

  useEffect(() => { setTurns(loadTurns()); }, []);
  useEffect(() => { if (turns.length > 0) saveTurns(turns); }, [turns]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns, loading]);

  const handleMicPress = async (lang: "mn" | "en") => {
    setMicError(null);
    if (activeLang === lang) {
      stopRecording();
    } else {
      activeLangRef.current = lang;
      setActiveLang(lang);
      await startRecording();
    }
  };

  const startRecording = async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicError(null);
        const mimeType = ["audio/webm", "audio/mp4", "audio/ogg"].find(
          (t) => MediaRecorder.isTypeSupported(t),
        ) ?? "audio/webm";
        mimeTypeRef.current = mimeType;
        const recorder = new MediaRecorder(stream, { mimeType });
        chunksRef.current = [];
        recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
        recorder.start();
        recorderRef.current = recorder;
        return;
      } catch (err) {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 300));
        } else {
          console.error("getUserMedia:", err);
          setActiveLang(null);
          setMicError("Could not access microphone. Please reload the page and allow microphone access when prompted.");
        }
      }
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current) return;
    const recorder = recorderRef.current;
    recorder.onstop = async () => {
      const lang = activeLangRef.current;
      setActiveLang(null);
      setLoading(true);
      try {
        const mimeType = mimeTypeRef.current;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const fd   = new FormData();
        fd.append("audio", blob, "recording");
        fd.append("lang", lang);

        const sttRes = await fetch("/api/stt", { method: "POST", body: fd });
        if (!sttRes.ok) {
          const err = await sttRes.json().catch(() => ({ error: "Speech recognition failed" }));
          throw new Error(err.error ?? "Speech recognition failed");
        }
        const { text } = await sttRes.json() as { text: string };
        if (!text?.trim()) { setLoading(false); return; }

        const targetLang: "mn" | "en" = lang === "mn" ? "en" : "mn";
        const transRes = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, from: lang, to: targetLang }),
        });
        const { translation } = await transRes.json() as { translation: string };

        const ttsRes = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: translation, lang: targetLang }),
        });
        const audioUrl = URL.createObjectURL(await ttsRes.blob());

        setTurns((prev) => [
          ...prev,
          { id: crypto.randomUUID(), spokenLang: lang, spokenText: text, translatedText: translation, audioUrl },
        ]);

        new Audio(audioUrl).play();
      } catch (err) {
        console.error(err);
        setMicError(err instanceof Error ? err.message : "Translation failed. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    recorder.stop();
  };

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col lg:h-[calc(100dvh-5rem)]">
      {/* Header */}
      <header className="flex items-start justify-between pb-4">
        <div>
          <h1 className="font-serif text-4xl leading-none tracking-tight text-balance text-ink">Interpreter</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Tap a flag, speak, tap again to translate.
          </p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          {turns.length > 0 && (
            <button
              onClick={() => {
                setTurns([]);
                localStorage.removeItem(STORAGE_KEY);
              }}
              className="rounded-full bg-sand-100 px-3 py-2 text-xs font-semibold text-ink-muted hover:bg-sand-200 hover:text-ink"
            >
              Clear
            </button>
          )}
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-bold text-ink shadow-ink-sm">
            <FlagIcon lang="mn" size={14} />
            <span>MN</span>
            <SwapIcon size={14} className="text-ink-muted" />
            <FlagIcon lang="en" size={14} />
            <span>EN</span>
          </div>
        </div>
      </header>

      {/* Mic error */}
      {micError && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{micError}</span>
          <div className="flex shrink-0 gap-2">
            <button onClick={() => window.location.reload()} className="font-semibold underline">Reload</button>
            <button onClick={() => setMicError(null)} className="font-semibold">✕</button>
          </div>
        </div>
      )}

      {/* Conversation */}
      <div className="flex-1 space-y-6 overflow-y-auto py-2">
        {turns.length === 0 && !loading && !activeLang && (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0" />
                <path d="M12 18v3" />
              </svg>
            </div>
            <p className="font-serif text-xl text-ink">Ready to interpret</p>
            <p className="max-w-xs text-sm text-ink-muted">
              Tap the Mongolian or English flag below, then speak. Tap again to stop and translate.
            </p>
          </div>
        )}

        {turns.map((turn) => {
          const targetLang: "mn" | "en" = turn.spokenLang === "mn" ? "en" : "mn";
          const fromLeft = turn.spokenLang === "mn";
          return (
            <div key={turn.id} className="space-y-3">
              <div className={`flex flex-col ${fromLeft ? "items-start" : "items-end"}`}>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <FlagIcon lang={turn.spokenLang} size={12} />
                  <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                    {LANG[turn.spokenLang].label}
                  </p>
                </div>
                <p className={[
                  "max-w-[80%] rounded-3xl px-4 py-3 text-base font-semibold",
                  fromLeft ? "rounded-tl-sm bg-white text-ink shadow-ink-sm" : "rounded-tr-sm bg-primary-600 text-white",
                ].join(" ")}>
                  {turn.spokenText}
                </p>
              </div>

              <div className={`flex flex-col ${fromLeft ? "items-end" : "items-start"}`}>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <FlagIcon lang={targetLang} size={12} />
                  <p className="text-[11px] font-bold uppercase tracking-wide text-primary-600">
                    {LANG[targetLang].label} · played aloud
                  </p>
                </div>
                <p className={[
                  "max-w-[80%] rounded-3xl px-4 py-3 text-base font-semibold",
                  fromLeft ? "rounded-tr-sm bg-primary-600 text-white" : "rounded-tl-sm bg-white text-ink shadow-ink-sm",
                ].join(" ")}>
                  {turn.translatedText}
                </p>
                {turn.audioUrl && (
                  <audio controls src={turn.audioUrl} className="mt-1.5 h-7 opacity-50" />
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Translating…</p>
            <div className="flex items-center gap-1.5 rounded-3xl bg-white px-4 py-3 shadow-ink-sm">
              <span className="h-2 w-2 rounded-full bg-ink-muted" style={{ animation: "typingDot 1.2s ease-out infinite", animationDelay: "0ms" }} />
              <span className="h-2 w-2 rounded-full bg-ink-muted" style={{ animation: "typingDot 1.2s ease-out infinite", animationDelay: "150ms" }} />
              <span className="h-2 w-2 rounded-full bg-ink-muted" style={{ animation: "typingDot 1.2s ease-out infinite", animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Mic buttons */}
      <div className="py-4">
        <div className="flex items-end justify-around">
          {(["mn", "en"] as const).map((lang) => {
            const isActive = activeLang === lang;
            return (
              <div key={lang} className="flex flex-col items-center gap-2">
                <p className="text-xs font-bold text-ink-muted">
                  {isActive ? "Listening…" : LANG[lang].label}
                </p>
                <button
                  onClick={() => handleMicPress(lang)}
                  disabled={loading || (activeLang !== null && activeLang !== lang)}
                  aria-label={`Speak ${LANG[lang].label}`}
                  className={[
                    "flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-all",
                    "disabled:opacity-30",
                    isActive
                      ? "animate-pulse bg-red-500 shadow-red-500/30"
                      : "bg-primary-600 shadow-primary-600/30 hover:bg-primary-700 active:scale-[0.97]",
                  ].join(" ")}
                >
                  <FlagIcon lang={lang} size={22} />
                </button>
                <p className="text-xs text-ink-muted">
                  {isActive ? "Tap to stop" : "Tap to speak"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TranslatePage() {
  const networkOnline = useOnline();
  const [devOverride, setDevOverride] = useState<"online" | "offline" | null>(null);

  // null override → real network drives the view
  const isOnline = devOverride !== null ? devOverride === "online" : networkOnline;
  const usingOverride = devOverride !== null;

  const toggleOverride = (mode: "online" | "offline") => {
    // clicking the active override resets to auto
    setDevOverride((prev) => (prev === mode ? null : mode));
  };

  return (
    <div className="relative">
      {/* ── Dev toggle ── remove before shipping ─────────────────────────────── */}
      <div className="absolute -top-1 right-0 z-50 flex flex-col items-end gap-1">
        {/* Real network badge */}
        <div className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur">
          <span
            className={[
              "h-1.5 w-1.5 rounded-full",
              networkOnline ? "bg-green-400" : "bg-red-400",
            ].join(" ")}
          />
          <span className="opacity-60">real net:</span>
          <span>{networkOnline ? "online" : "offline"}</span>
        </div>

        {/* Override buttons */}
        <div className="flex items-center gap-1 rounded-full bg-black/80 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
          <span className="mr-0.5 opacity-60">DEV</span>

          <button
            onClick={() => toggleOverride("online")}
            className={[
              "rounded-full px-2 py-0.5 transition-colors",
              devOverride === "online"
                ? "bg-green-500 text-white"
                : isOnline && !usingOverride
                  ? "bg-green-500/40 text-white"   // auto-detected online
                  : "text-white/40 hover:text-white",
            ].join(" ")}
            title={devOverride === "online" ? "Click to reset to auto" : "Force online"}
          >
            Online{devOverride === "online" ? " ✕" : ""}
          </button>

          <button
            onClick={() => toggleOverride("offline")}
            className={[
              "rounded-full px-2 py-0.5 transition-colors",
              devOverride === "offline"
                ? "bg-amber-500 text-white"
                : !isOnline && !usingOverride
                  ? "bg-amber-500/40 text-white"   // auto-detected offline
                  : "text-white/40 hover:text-white",
            ].join(" ")}
            title={devOverride === "offline" ? "Click to reset to auto" : "Force offline"}
          >
            Offline{devOverride === "offline" ? " ✕" : ""}
          </button>

          {usingOverride && (
            <button
              onClick={() => setDevOverride(null)}
              className="rounded-full px-2 py-0.5 text-white/60 hover:text-white transition-colors"
              title="Back to auto detection"
            >
              Auto
            </button>
          )}
        </div>
      </div>
      {/* ─────────────────────────────────────────────────────────────────────── */}

      {isOnline ? <OnlineView /> : <OfflineView />}
    </div>
  );
}
