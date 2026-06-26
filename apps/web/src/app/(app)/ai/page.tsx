"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChatIcon, MicIcon, SendIcon, SparklesIcon, StarIcon, WalkIcon } from "@/components/icons";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { aiQuickReplies, guide } from "@/lib/mockData";

// A place Nova recommends, shown as a card under her reply.
interface PlaceCard {
  name: string;
  description?: string;
  imageUrl?: string;
  rating?: number;
  walkMinutes?: number;
}

// A finished plan Nova proposes; the traveller confirms it with the buttons.
interface PendingPlan {
  title: string;
  summary: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  places?: PlaceCard[];
  pendingPlan?: PendingPlan;
  planStatus?: "pending" | "saved" | "dismissed";
  journeyLink?: boolean;
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm Nova, your guide in Mongolia. Ask me anything — places, food, getting around, or staying safe.",
};

// Conversation is kept on the device so it survives a refresh.
const STORAGE_KEY = "lumo:chat";

// Resolve the device location, returning null if it's blocked or unavailable.
function requestLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

export default function AiPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const scrollAnchor = useRef<HTMLDivElement>(null);

  // Load any saved conversation from the device once on mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? (JSON.parse(saved) as Message[]) : null;
      if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  // Persist the conversation whenever it changes (after the initial load).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore storage limits
    }
  }, [messages, hydrated]);

  // Warm up the device location so Nova can recommend real nearby places.
  useEffect(() => {
    requestLocation().then((loc) => {
      if (loc) setCoords(loc);
    });
  }, []);

  // Voice input: spoken words land in the text box, ready to edit and send.
  const voice = useSpeechRecognition(setInput);

  function toggleVoice() {
    if (voice.isListening) voice.stop();
    else voice.start();
  }

  // Keep the latest message in view as the conversation grows.
  useEffect(() => {
    scrollAnchor.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setIsLoading(true);

    // Make sure we have a location even on the very first quick message.
    const location = coords ?? (await requestLocation());
    if (location && !coords) setCoords(location);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          location,
        }),
      });
      const data = await response.json();
      addAssistantReply(
        data.reply || "Sorry, I couldn't reach the guide right now.",
        data.places,
        data.pendingPlan,
      );
    } catch {
      addAssistantReply("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function addAssistantReply(
    content: string,
    places?: PlaceCard[],
    pendingPlan?: PendingPlan,
    journeyLink?: boolean,
  ) {
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content,
        places,
        pendingPlan,
        planStatus: pendingPlan ? "pending" : undefined,
        journeyLink,
      },
    ]);
  }

  // "Yes, save" — persist just the plan summary to the DB, then confirm.
  async function savePlan(messageId: string, plan: PendingPlan) {
    setMessages((current) =>
      current.map((m) =>
        m.id === messageId ? { ...m, planStatus: "saved" } : m,
      ),
    );
    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      const data = await response.json();
      if (data.saved) {
        // Write to localStorage so the Journey page can display it.
        try {
          const entry = { id: crypto.randomUUID(), title: plan.title, summary: plan.summary, savedAt: new Date().toISOString() };
          const prev = JSON.parse(localStorage.getItem("polaris:saved-plans") ?? "[]");
          localStorage.setItem("polaris:saved-plans", JSON.stringify([entry, ...prev]));
        } catch { /* ignore storage quota issues */ }
        addAssistantReply("Saved to your journey.", undefined, undefined, true);
      } else {
        setMessages((current) =>
          current.map((m) =>
            m.id === messageId ? { ...m, planStatus: "pending" } : m,
          ),
        );
        addAssistantReply("Sorry, I couldn't save your plan. Please try again.");
      }
    } catch {
      setMessages((current) =>
        current.map((m) =>
          m.id === messageId ? { ...m, planStatus: "pending" } : m,
        ),
      );
      addAssistantReply("Something went wrong saving your plan. Please try again.");
    }
  }

  // "No, add more" — dismiss the buttons and keep building the plan.
  function addMoreToPlan(messageId: string) {
    setMessages((current) =>
      current.map((m) =>
        m.id === messageId ? { ...m, planStatus: "dismissed" } : m,
      ),
    );
    sendMessage("I'd like to add another stop to my plan.");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="flex h-[calc(var(--device-h,100dvh)-7rem)] flex-col lg:h-[calc(var(--device-h,100dvh)-5rem)]">
      <ChatHeader />

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onSavePlan={savePlan}
            onAddMore={addMoreToPlan}
            disabled={isLoading}
          />
        ))}
        {isLoading ? <TypingBubble /> : null}
        <div ref={scrollAnchor} />
      </div>

      <QuickReplies onPick={sendMessage} disabled={isLoading} />
      <MessageInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={isLoading}
        isListening={voice.isListening}
        voiceSupported={voice.isSupported}
        onToggleVoice={toggleVoice}
      />
    </div>
  );
}

function ChatHeader() {
  return (
    <header className="flex items-center gap-3 border-b border-sand-200 pb-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white">
        <SparklesIcon size={20} />
      </span>
      <div>
        <p className="font-bold text-ink">{guide.name}</p>
        <p className="text-sm text-ink-muted">{guide.status}</p>
      </div>
    </header>
  );
}

function MessageBubble({
  message,
  onSavePlan,
  onAddMore,
  disabled,
}: {
  message: Message;
  onSavePlan: (messageId: string, plan: PendingPlan) => void;
  onAddMore: (messageId: string) => void;
  disabled: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex flex-col items-end" : "flex flex-col items-start"}>
      <p
        className={[
          "max-w-[80%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm",
          isUser ? "bg-primary-600 text-white" : "bg-white text-ink shadow-ink-sm",
        ].join(" ")}
      >
        {message.content}
      </p>

      {message.places?.length ? (
        <div className="mt-2 flex w-full max-w-[90%] gap-3 overflow-x-auto pb-1">
          {message.places.map((place) => (
            <PlaceCardView key={place.name} place={place} />
          ))}
        </div>
      ) : null}

      {message.pendingPlan && message.planStatus === "pending" ? (
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => onSavePlan(message.id, message.pendingPlan!)}
            disabled={disabled}
            className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            Yes, save
          </button>
          <button
            onClick={() => onAddMore(message.id)}
            disabled={disabled}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-muted shadow-sm hover:text-ink disabled:opacity-50"
          >
            No, add more
          </button>
        </div>
      ) : null}

      {message.journeyLink ? (
        <Link
          href="/journey"
          className="mt-2 flex items-center gap-1.5 rounded-full bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-600 transition-colors hover:bg-primary-100"
        >
          <ChatIcon size={14} />
          View your journey
        </Link>
      ) : null}
    </div>
  );
}

// A compact photo card for a place Nova recommends.
function PlaceCardView({ place }: { place: PlaceCard }) {
  return (
    <div className="w-44 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="h-24 bg-sand-200">
        {place.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.imageUrl}
            alt={place.name}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="p-3">
        <p className="text-sm font-bold leading-tight text-ink">{place.name}</p>
        <div className="mt-1 flex items-center gap-3 text-[11px] font-semibold text-ink-muted">
          {place.rating ? (
            <span className="flex items-center gap-1">
              <StarIcon size={11} className="text-safety-armed" />
              {place.rating}
            </span>
          ) : null}
          {place.walkMinutes ? (
            <span className="flex items-center gap-1">
              <WalkIcon size={12} />
              {place.walkMinutes} min
            </span>
          ) : null}
        </div>
        {place.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-ink-muted">
            {place.description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// The "Nova is typing" indicator shown while awaiting a reply.
function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex gap-1 rounded-3xl bg-white px-4 py-4 shadow-ink-sm">
        <Dot delay="0ms" />
        <Dot delay="150ms" />
        <Dot delay="300ms" />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-2 w-2 rounded-full bg-ink-muted"
      style={{ animation: `typingDot 1.2s ease-out infinite`, animationDelay: delay }}
    />
  );
}

function QuickReplies({
  onPick,
  disabled,
}: {
  onPick: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 py-3">
      {aiQuickReplies.map((reply) => (
        <button
          key={reply}
          onClick={() => onPick(reply)}
          disabled={disabled}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-muted shadow-ink-sm transition-colors hover:bg-sand-50 hover:text-ink disabled:opacity-50"
        >
          {reply}
        </button>
      ))}
    </div>
  );
}

function MessageInput({
  value,
  onChange,
  onSubmit,
  disabled,
  isListening,
  voiceSupported,
  onToggleVoice,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  disabled: boolean;
  isListening: boolean;
  voiceSupported: boolean;
  onToggleVoice: () => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-ink-sm"
    >
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={isListening ? "Listening…" : "Message Polaris…"}
        className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
      />
      {voiceSupported ? (
        <button
          type="button"
          onClick={onToggleVoice}
          aria-label={isListening ? "Stop voice input" : "Start voice input"}
          className={
            isListening
              ? "flex h-9 w-9 items-center justify-center rounded-full bg-safety-critical text-white animate-pulse"
              : "text-ink-muted hover:text-ink"
          }
        >
          <MicIcon size={20} />
        </button>
      ) : null}
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white transition-colors hover:bg-primary-700 active:scale-[0.95] disabled:opacity-50"
        aria-label="Send message"
      >
        <SendIcon size={18} />
      </button>
    </form>
  );
}
