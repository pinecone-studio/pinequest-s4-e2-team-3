"use client";

import { useRef, useState, useEffect } from "react";
import { SwapIcon } from "@/components/icons";

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

export default function TranslatePage() {
  const recorderRef   = useRef<MediaRecorder | null>(null);
  const chunksRef     = useRef<Blob[]>([]);
  const activeLangRef = useRef<"mn" | "en">("mn");
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
    // Retry up to 2 times — first tap may race with the browser permission popup
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicError(null);
        const recorder = new MediaRecorder(stream);
        chunksRef.current = [];
        recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
        recorder.start();
        recorderRef.current = recorder;
        return;
      } catch (err) {
        if (attempt === 0) {
          // Short pause then retry — permission may have just been granted
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
    recorderRef.current.stop();
    recorderRef.current.onstop = async () => {
      const lang = activeLangRef.current;
      setActiveLang(null);
      setLoading(true);
      try {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const fd   = new FormData();
        fd.append("audio", blob, "audio.webm");
        fd.append("lang", lang);

        const sttRes = await fetch("/api/stt", { method: "POST", body: fd });
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
      } finally {
        setLoading(false);
      }
    };
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
