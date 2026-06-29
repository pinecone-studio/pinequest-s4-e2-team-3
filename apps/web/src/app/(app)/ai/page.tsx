"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChatIcon, MicIcon, SendIcon, SparklesIcon, StarIcon, WalkIcon } from "@/components/icons";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { aiQuickReplies, guide } from "@/lib/mockData";

// A place Michelle recommends, shown as a card under her reply.
interface PlaceCard {
  name: string;
  description?: string;
  imageUrl?: string;
  rating?: number;
  walkMinutes?: number;
  address?: string;
  reviewCount?: number;
  reviews?: { text: string; author?: string; rating?: number }[];
}

// One stop in a finished plan (structured data the AI returns).
interface PlanStop {
  day: number;
  time: string;
  title: string;
  note?: string;
}

// A finished plan Michelle proposes; the traveller confirms it with the buttons.
interface PendingPlan {
  title: string;
  summary: string;
  stops?: PlanStop[];
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
    "Hi! I'm Michelle, your guide in Mongolia. Ask me anything — places, food, getting around, or staying safe.",
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

  // Warm up the device location so Michelle can recommend real nearby places.
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

  // "Yes, save" — write plan to localStorage immediately so Journey can display it,
  // then fire a background sync to Supabase (failure is silent).
  async function savePlan(messageId: string, plan: PendingPlan) {
    setMessages((current) =>
      current.map((m) =>
        m.id === messageId ? { ...m, planStatus: "saved" } : m,
      ),
    );

    // One image per stop: prefer the photo Michelle already showed for that place;
    // for any stop without one, look it up by name (same Google Places source as
    // Explore) so every stop in the Journey timeline gets a real photo.
    const norm = (s: string) => s.toLowerCase().trim();
    const cards = messages.flatMap((m) => m.places ?? []);
    const cardFor = (title: string) =>
      cards.find((c) => norm(c.name) === norm(title)) ??
      cards.find((c) => norm(title).includes(norm(c.name)) || norm(c.name).includes(norm(title)));

    const loc = coords;
    const places = await Promise.all(
      (plan.stops ?? []).map(async (st) => {
        const card = cardFor(st.title);
        if (card?.imageUrl) {
          return { name: st.title, imageUrl: card.imageUrl, address: card.address, rating: card.rating, walkMinutes: card.walkMinutes };
        }
        try {
          const qs = new URLSearchParams({ q: st.title });
          if (loc) { qs.set("lat", String(loc.lat)); qs.set("lng", String(loc.lng)); }
          const res = await fetch(`/api/places?${qs.toString()}`);
          const data = res.ok ? await res.json() : [];
          return { name: st.title, imageUrl: data[0]?.imageUrl as string | undefined };
        } catch {
          return { name: st.title };
        }
      }),
    );

    // Save to localStorage — Journey reads from here.
    try {
      const entry = { id: crypto.randomUUID(), title: plan.title, summary: plan.summary, stops: plan.stops ?? [], savedAt: new Date().toISOString(), places };
      const prev = JSON.parse(localStorage.getItem("polaris:saved-plans") ?? "[]");
      localStorage.setItem("polaris:saved-plans", JSON.stringify([entry, ...prev]));
    } catch { /* ignore storage quota issues */ }

    addAssistantReply("Saved to your journey.", undefined, undefined, true);

    // Background sync to Supabase — failure is silent, plan is already saved locally.
    fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: plan.title, summary: plan.summary }),
    }).catch(() => { /* ignore */ });
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

  // The most recent finished plan that hasn't been saved yet — powers the
  // always-visible Save button in the header.
  const savable = [...messages].reverse().find((m) => m.pendingPlan && m.planStatus !== "saved");

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col lg:h-[calc(100dvh-5rem)]">
      <ChatHeader
        onSave={savable ? () => savePlan(savable.id, savable.pendingPlan!) : undefined}
        disabled={isLoading}
      />

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

function ChatHeader({
  onSave,
  disabled,
}: {
  onSave?: () => void;
  disabled: boolean;
}) {
  return (
    <header className="flex items-center gap-3 border-b border-sand-200 pb-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white">
        <SparklesIcon size={20} />
      </span>
      <div className="flex-1">
        <p className="font-bold text-ink">{guide.name}</p>
        <p className="text-sm text-ink-muted">{guide.status}</p>
      </div>
      {onSave ? (
        <button
          onClick={onSave}
          disabled={disabled}
          className="rounded-full bg-primary-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
        >
          Save plan
        </button>
      ) : null}
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

// A compact photo card for a place Michelle recommends. Tapping it expands the
// card in place to reveal its address and more reviews.
function PlaceCardView({ place }: { place: PlaceCard }) {
  const [expanded, setExpanded] = useState(false);
  const reviews = place.reviews ?? [];
  const shownReviews = expanded ? reviews : reviews.slice(0, 1);
  const canExpand = reviews.length > 1 || Boolean(place.address);

  return (
    <button
      type="button"
      onClick={() => canExpand && setExpanded((v) => !v)}
      className={`shrink-0 overflow-hidden rounded-2xl bg-white text-left shadow-sm transition ${
        expanded ? "w-60" : "w-44"
      } ${canExpand ? "hover:shadow-md active:scale-[0.99]" : "cursor-default"}`}
    >
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
              {place.reviewCount ? (
                <span className="font-normal text-ink-muted/70">
                  ({place.reviewCount})
                </span>
              ) : null}
            </span>
          ) : null}
          {place.walkMinutes ? (
            <span className="flex items-center gap-1">
              <WalkIcon size={12} />
              {place.walkMinutes} min
            </span>
          ) : null}
        </div>

        {expanded && place.address ? (
          <p className="mt-2 text-[11px] leading-snug text-ink-muted">
            📍 {place.address}
          </p>
        ) : null}

        {shownReviews.length > 0 ? (
          <div className="mt-2 space-y-1.5">
            {shownReviews.map((review, i) => (
              <div key={i} className="rounded-lg bg-sand-100 p-2">
                <p
                  className={`text-[11px] italic leading-snug text-ink-muted ${
                    expanded ? "" : "line-clamp-3"
                  }`}
                >
                  "{review.text}"
                </p>
                {review.author ? (
                  <p className="mt-1 text-[10px] font-semibold text-ink-muted/70">
                    — {review.author}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : place.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-ink-muted">
            {place.description}
          </p>
        ) : null}

        {canExpand ? (
          <span className="mt-2 inline-block text-[11px] font-semibold text-primary-600">
            {expanded ? "Show less ▲" : "More details ▼"}
          </span>
        ) : null}
      </div>
    </button>
  );
}

// The "Michelle is typing" indicator shown while awaiting a reply.
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
