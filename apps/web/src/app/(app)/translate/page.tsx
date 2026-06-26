"use client";

import { useRef, useState, useEffect } from "react";
import { SwapIcon } from "@/components/icons";

type Turn = {
  id: string;
  spokenLang: "mn" | "en";
  spokenText: string;
  translatedText: string;
  audioUrl?: string; // not persisted — blob URLs don't survive refresh
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
  // strip audioUrl — blob URLs are session-only
  const clean = turns.map(({ audioUrl: _a, ...t }) => t);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
}

const LANG = {
  mn: { label: "Mongolian", flag: "🇲🇳" },
  en: { label: "English",   flag: "🇬🇧" },
};

export default function TranslatePage() {
  const recorderRef    = useRef<MediaRecorder | null>(null);
  const chunksRef      = useRef<Blob[]>([]);
  const activeLangRef  = useRef<"mn" | "en">("mn");
  const bottomRef      = useRef<HTMLDivElement | null>(null);

  const [activeLang, setActiveLang] = useState<"mn" | "en" | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [turns,      setTurns]      = useState<Turn[]>([]);

  // Load saved conversation on mount
  useEffect(() => {
    setTurns(loadTurns());
  }, []);

  // Persist whenever turns change
  useEffect(() => {
    if (turns.length > 0) saveTurns(turns);
  }, [turns]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  const handleMicPress = async (lang: "mn" | "en") => {
    if (activeLang === lang) {
      // stop this language's recording
      stopRecording();
    } else {
      activeLangRef.current = lang;
      setActiveLang(lang);
      await startRecording();
    }
  };

  const startRecording = async () => {
    const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.start();
    recorderRef.current = recorder;
  };

  const stopRecording = () => {
    if (!recorderRef.current) return;
    recorderRef.current.stop();
    recorderRef.current.onstop = async () => {
      const lang = activeLangRef.current;
      setActiveLang(null);
      setLoading(true);
      try {
        // 1. STT — send audio + language hint
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const fd   = new FormData();
        fd.append("audio", blob, "audio.webm");
        fd.append("lang", lang);

        const sttRes = await fetch("/api/stt", { method: "POST", body: fd });
        const { text } = await sttRes.json() as { text: string };
        if (!text?.trim()) { setLoading(false); return; }

        // 2. Translate to the other language
        const targetLang: "mn" | "en" = lang === "mn" ? "en" : "mn";
        const transRes = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, from: lang, to: targetLang }),
        });
        const { translation } = await transRes.json() as { translation: string };

        // 3. Speak — OpenAI TTS for EN, Chimege for MN
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
    <div className="flex h-[calc(100vh-7rem)] flex-col lg:h-[calc(100vh-5rem)]">
      {/* Header */}
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-4xl leading-none text-ink">Interpreter</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Tap your flag, speak, tap again to translate.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            🇲🇳 MN
            <SwapIcon size={14} className="text-ink-muted" />
            🇬🇧 EN
          </div>
        </div>
      </header>

      {/* Conversation */}
      <div className="flex-1 space-y-6 overflow-y-auto py-6">
        {turns.length === 0 && !loading && !activeLang && (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <div className="text-5xl">🎙️</div>
            <p className="font-serif text-xl text-ink">Ready to interpret</p>
            <p className="max-w-xs text-sm text-ink-muted">
              Tap 🇲🇳 to speak Mongolian or 🇬🇧 to speak English. Tap again to stop.
            </p>
          </div>
        )}

        {turns.map((turn) => {
          const targetLang: "mn" | "en" = turn.spokenLang === "mn" ? "en" : "mn";
          const fromLeft = turn.spokenLang === "mn";
          return (
            <div key={turn.id} className="space-y-3">
              {/* Original */}
              <div className={`flex flex-col ${fromLeft ? "items-start" : "items-end"}`}>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                  {LANG[turn.spokenLang].flag} {LANG[turn.spokenLang].label}
                </p>
                <p className={[
                  "max-w-[80%] rounded-3xl px-4 py-3 text-base font-semibold",
                  fromLeft ? "rounded-tl-sm bg-white text-ink shadow-ink-sm" : "rounded-tr-sm bg-primary-600 text-white",
                ].join(" ")}>
                  {turn.spokenText}
                </p>
              </div>

              {/* Translation */}
              <div className={`flex flex-col ${fromLeft ? "items-end" : "items-start"}`}>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-primary-600">
                  {LANG[targetLang].flag} {LANG[targetLang].label} · played aloud
                </p>
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

      {/* Two mic buttons */}
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
                    "flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-all",
                    "disabled:opacity-30",
                    isActive
                      ? "animate-pulse bg-red-500 shadow-red-500/30"
                      : "bg-primary-600 shadow-primary-600/30 hover:bg-primary-700",
                  ].join(" ")}
                >
                  <span className="text-2xl">{LANG[lang].flag}</span>
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
