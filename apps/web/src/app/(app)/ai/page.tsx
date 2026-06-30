"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatIcon, MicIcon, PencilIcon, SendIcon, StarIcon, WalkIcon } from "@/components/icons";
import { GuideAvatar, type GuideAvatarState } from "@/components/GuideAvatar";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { guide } from "@/lib/mockData";
import { FeatureGate } from "@/components/FeatureGate";

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
  suggestions?: string[];
}

const INITIAL_SUGGESTIONS = [
  "Plan my 5-day trip",
  "I'm visiting in July",
  "Best time to visit Mongolia?",
  "What food should I try?",
];

type ConvStage =
  | "collecting-info"
  | "planning"
  | "recommending-place"
  | "nearby"
  | "food"
  | "transport"
  | "finished"
  | "fallback";

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const STAGE_POOLS: Record<ConvStage, string[]> = {
  "collecting-info": [],
  "planning": [
    "Continue", "Next day", "Change this stop", "Add a stop",
    "Show lunch nearby", "Coffee break", "Skip this", "Another option",
    "Tell me why", "What's nearby?", "I'm done, save the plan",
  ],
  "recommending-place": [
    "Add this stop", "Skip it", "Tell me more", "Nearby cafés",
    "How do I get there?", "Another option", "Photo spots", "Best time to visit",
    "History", "Horse riding",
  ],
  "nearby": [
    "Show directions", "Any alternatives?", "More details", "Is it open now?",
    "Price range?", "Add to plan", "Something else nearby",
  ],
  "food": [
    "Traditional Mongolian", "Budget option", "Vegetarian", "Coffee nearby",
    "Show directions", "Open now?", "Another restaurant", "Skip this",
  ],
  "transport": [
    "How much does it cost?", "Walking directions", "Bus route",
    "How far is it?", "Best route", "Book a taxi",
  ],
  "finished": [
    "Yes, save this plan!", "Add one more stop", "Change something", "Start over",
  ],
  "fallback": [
    "Continue", "Show nearby places", "Any local food?", "Another idea",
    "Tell me why", "What's next?", "Change the plan", "Show alternatives",
    "Add this stop", "Skip it",
  ],
};

function detectStage(messages: Message[]): ConvStage {
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  if (!lastAssistant || lastAssistant.id === "welcome") return "collecting-info";
  if (messages.some((m) => m.pendingPlan && m.planStatus === "pending")) return "finished";

  const t = lastAssistant.content.toLowerCase();

  // Planning wins if ANY day number is mentioned — even "nearby dinner" during planning
  // must stay in planning context so we don't show live-GPS suggestions.
  if (/\bday [1-9]\b|\bday one\b|\bmidday:|\bmorning:|\bafternoon:|\bevening:\b/.test(t)) return "planning";

  // Real place cards mean the AI ran a live or name-lookup search this turn.
  if (lastAssistant.places?.length) return "recommending-place";

  // "Nearby" only when there's no day-planning context already matched above.
  if (/\b(nearby|walk|min away|around you|closest|nearest)\b/.test(t)) return "nearby";
  if (/\b(restaurant|lunch|dinner|breakfast|café|cafe|eat|food|meal)\b/.test(t)) return "food";
  if (/\b(taxi|bus|transport|getting there|directions|how to get|route)\b/.test(t)) return "transport";
  return "fallback";
}

// How many days the user originally requested ("5-day trip", "7 days", etc.)
function getRequestedDays(messages: Message[]): number {
  for (const m of [...messages]) {
    const src = m.content;
    const match = src.match(/(\d+)[- ]day/i) ?? src.match(/(\d+)\s+days?/i);
    if (match) return parseInt(match[1]);
  }
  return 0;
}

// Highest day number that was actually PLANNED (not just mentioned in "Ready for Day X?")
function getPlannedDays(messages: Message[]): number {
  let max = 0;
  for (const m of messages) {
    if (m.role !== "assistant") continue;
    // Strip "Ready for/to plan Day X" and "Shall I plan Day X" so the
    // next-day question doesn't count as that day being planned yet.
    const stripped = m.content
      .replace(/ready (?:to plan |for )?day\s*\d+/gi, "")
      .replace(/shall i (?:plan|show|build) day\s*\d+/gi, "");
    // Only look inside messages that contain actual plan content.
    if (!/morning|midday|afternoon|evening|breakfast|lunch|dinner/i.test(stripped)) continue;
    for (const match of stripped.matchAll(/\bday\s*(\d+)\b/gi)) {
      const n = parseInt(match[1]);
      if (n > max) max = n;
    }
  }
  return max;
}

function getContextualSuggestions(messages: Message[]): string[] {
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  if (!lastAssistant || lastAssistant.id === "welcome") return INITIAL_SUGGESTIONS;

  // API-supplied suggestions take priority.
  if (lastAssistant.suggestions?.length) return lastAssistant.suggestions;

  const t = lastAssistant.content.toLowerCase();
  const stage = detectStage(messages);

  const requestedDays = getRequestedDays(messages);
  const plannedDays = getPlannedDays(messages);
  const allDaysDone = requestedDays > 0 && plannedDays >= requestedDays;
  const nextDay = plannedDays + 1;

  // ── FINISHED: plan is ready to save ──────────────────────────────────────
  if (stage === "finished")
    return ["Yes, save this plan!", `Edit Day ${plannedDays}`, "Add one more stop", "Start a completely new plan"];

  // ── PLANNING: content-driven by time-of-day and place type ───────────────
  if (stage === "planning") {
    // Day-to-day transition ("Ready for Day 3?", "Shall I plan Day 2?")
    if (/\b(ready for day|shall i plan day|let'?s? (move|continue) (on )?to day|day [2-9])\b/.test(t)) {
      if (allDaysDone)
        return ["Yes, save this plan!", "Add one more stop", "Change something", "Start over"];
      return [`Yes, let's plan Day ${nextDay}!`, "Take a rest day", "Change something", "Skip ahead"];
    }

    // Preference question during planning ("nature or cultural?", "active or relaxed?")
    if (/\b(nature|countryside|outdoor).{0,60}\bor\b|\bor\b.{0,60}\b(nature|countryside|outdoor)\b/.test(t))
      return ["Start with nature!", "Cultural sites first", "Mix of both", "Surprise me!"];
    if (/\b(active|hik|trek|adventure).{0,60}\bor\b|\bor\b.{0,60}\b(active|hik|trek|relaxed|easy)\b/.test(t))
      return ["Very active — hiking!", "Moderate walks", "Easy & relaxed", "Mix of both"];
    if (/\b(history|culture|museum|temple|monument).{0,60}\bor\b|\bor\b.{0,60}\b(history|culture|museum|temple)\b/.test(t))
      return ["History & culture first", "Nature & outdoors", "Mix of both", "Surprise me!"];
    if (/\b(morning|afternoon|early|late).{0,60}\bor\b|\bor\b.{0,60}\b(morning|afternoon|early|late)\b/.test(t))
      return ["Early morning start", "Late morning", "Afternoon arrival", "Flexible"];

    // Evening / dinner
    if (/\b(evening|dinner|night|19:|20:|21:)\b/.test(t)) {
      if (allDaysDone)
        return ["Show me dinner spots", "Any bars nearby?", "Save this plan!", "Add another stop"];
      return ["Show me dinner spots", "Any bars or live music?", `Plan Day ${nextDay}`, "Change something"];
    }

    // Dinner mentioned during planning
    if (/\b(dinner|evening meal|supper|restaurant for dinner)\b/.test(t))
      return ["Sounds great!", "Vegetarian option?", "Budget-friendly alternative?", `Continue to Day ${nextDay}`];

    // Afternoon activity during planning
    if (/\b(afternoon|coffee break|14:|15:|16:|17:)\b/.test(t))
      return ["Sounds good!", "How long should we stay?", "What's for dinner?", "Add another stop"];

    // Lunch during planning
    if (/\b(lunch|12:|13:)\b/.test(t))
      return ["Traditional Mongolian?", "Vegetarian options?", "Budget-friendly?", "Continue to afternoon"];

    // Morning / first stop of the day
    if (/\b(morning|breakfast|08:|09:|10:|first stop|start with|explore)\b/.test(t)) {
      if (/monastery|temple|gandan|gandantegchinlen|lama/.test(t))
        return ["Sounds amazing!", "Entry fee?", "What's for lunch after?", "Add another morning stop"];
      if (/museum|gallery|palace|monument/.test(t))
        return ["Sounds great!", "How long to visit?", "What's for lunch after?", "Add another morning stop"];
      if (/park|nature|hike|trek|terelj|gobi|lake|mountain/.test(t))
        return ["Let's do it!", "What activities are there?", "What's for lunch?", "Add another stop"];
      if (/horse|camel|ride/.test(t))
        return ["Sounds fun!", "How long is the ride?", "Any safety tips?", "What's next after?"];
      return ["Sounds great!", "Any tips?", "What's for lunch?", "Add another stop"];
    }

    return ["Sounds good!", "Add a stop", "Change this", "What's for lunch?"];
  }

  // ── RECOMMENDING PLACE: specific to place type ────────────────────────────
  if (stage === "recommending-place") {
    if (/monastery|temple|gandan|erdene|lama/.test(t))
      return ["Best time to visit?", "Is there an entry fee?", "Lunch spots nearby", "Add to itinerary"];
    if (/museum|gallery|palace|history/.test(t))
      return ["Opening hours?", "How long to visit?", "Lunch spots nearby", "Add to itinerary"];
    if (/park|terelj|gobi|nature|steppe|mountain/.test(t))
      return ["Horse riding available?", "Best hiking trail?", "Camping nearby?", "Add to itinerary"];
    if (/market|bazaar|shop|mall/.test(t))
      return ["What's worth buying?", "Best prices?", "Opening hours?", "Add to itinerary"];
    if (/restaurant|cafe|food|eat|lunch|dinner/.test(t))
      return ["What's their specialty?", "Price range?", "Vegetarian-friendly?", "Add to itinerary"];
    return ["Add to my itinerary", "How far is it?", "Is there an entry fee?", "Show alternatives"];
  }

  // ── NEARBY: live location search results ──────────────────────────────────
  if (stage === "nearby")
    return ["Give me walking directions", "Is it open right now?", "Show cheaper options", "Something else nearby"];

  // ── FOOD: meal-specific ───────────────────────────────────────────────────
  if (stage === "food") {
    if (/\b(lunch)\b/.test(t))
      return ["Traditional Mongolian", "Something quick & cheap", "Vegetarian options?", "Skip lunch"];
    if (/\b(dinner)\b/.test(t))
      return ["Traditional restaurant", "Modern dining", "Cheap & local", "Plan tomorrow instead"];
    if (/\b(breakfast|brunch)\b/.test(t))
      return ["Hotel breakfast ok?", "Local café nearby?", "What time to eat?", "Skip, start early"];
    if (/\b(buuz|khuushuur|tsuivan|khuurga)\b/.test(t))
      return ["Where's the best one?", "Price range?", "Vegetarian version?", "Add to plan"];
    return ["Traditional Mongolian", "Western / Modern", "Best coffee nearby", "Show directions"];
  }

  // ── TRANSPORT ─────────────────────────────────────────────────────────────
  if (stage === "transport")
    return ["How much is a taxi?", "Can I walk there?", "Which bus route?", "Share my location"];

  // ── COLLECTING INFO: answer the specific question asked ───────────────────
  if (/which month|what month|when.*visit|time of year/.test(t))
    return ["July (Naadam season)", "June (pleasant weather)", "August", "Winter (Ice Festival)"];
  if (/how many days|how long|length of.*trip/.test(t))
    return ["3 Days (Quick UB & Terelj)", "5 Days (Classic trip)", "7 Days (Countryside tour)", "2 Weeks+"];
  if (/(city|ulaanbaatar).{0,80}or.{0,80}(countryside|nature)|(countryside|nature).{0,80}or.{0,80}(city|ulaanbaatar)/.test(t))
    return ["Mainly countryside & nature", "Explore Ulaanbaatar city", "A perfect mix of both"];
  if (/gobi|khövsgöl|khovsgol|terelj/.test(t))
    return ["Gobi Desert", "Northern Mongolia", "Terelj / Gorkhi", "Lake Khövsgöl"];
  if (/interests|what.*enjoy|what.*like|history.*nature|nature.*adventure/.test(t))
    return ["Nomadic culture & history", "Hiking & pure nature", "Adventure & horse riding", "Food & photography"];
  if (/solo|traveling with|group|how many (people|of you)/.test(t))
    return ["Solo", "With a partner", "Small group", "Family with kids"];
  if (/budget|price|afford|luxury|cost/.test(t))
    return ["Backpacker / budget", "Mid-range comfortable", "Luxury & ger camps"];
  if (/morning or afternoon|early or later/.test(t))
    return ["Early morning", "Late morning", "Afternoon", "Flexible"];
  if (/safe|emergency|hospital/.test(t))
    return ["Find nearest hospital", "Emergency contacts", "Is it safe?", "Call for help"];
  if (/naadam|tsagaan sar|festival|national holiday/.test(t))
    return ["Yes, I'd love it!", "Tell me more", "I prefer quieter times", "What else is on?"];
  if (/car|driver|transport|getting around|taxi/.test(t))
    return ["Need a rental car + driver", "Using public transport", "I will drive myself"];

  // ── FALLBACK: shuffle pool, filter recently clicked ───────────────────────
  const pool = STAGE_POOLS[stage] ?? STAGE_POOLS.fallback;
  const recentClicked = new Set(
    messages.filter((m) => m.role === "user").slice(-5).map((m) => m.content.toLowerCase().trim()),
  );
  const fresh = pool.filter((s) => !recentClicked.has(s.toLowerCase().trim()));
  return shuffled(fresh.length >= 3 ? fresh : pool).slice(0, 4);
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm Michelle, your guide in Mongolia. Ask me anything — places, food, getting around, or staying safe.",
};

// Conversation is kept on the device so it survives a refresh.
const STORAGE_KEY = "lumo:chat";

// Separates the streamed reply text from the metadata tail — must match the API route.
const META_DELIM = "\n\nPINEQUEST_META:";

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

  // Load the conversation: local cache first (instant / offline), then the
  // backend (source of truth when signed in) so the chat follows you across
  // devices. The backend wins only when it actually has history.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? (JSON.parse(saved) as Message[]) : null;
      if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
    } catch {
      // ignore corrupt storage
    }
    void fetch("/api/chat-history")
      .then((r) => (r.ok ? r.json() : []))
      .then((server: Message[]) => {
        if (Array.isArray(server) && server.length) setMessages(server);
      })
      .catch(() => { /* offline / signed out — keep local */ })
      .finally(() => setHydrated(true));
  }, []);

  // Append one message to the backend history (no-op when signed out / offline).
  function persistMessage(message: Message) {
    fetch("/api/chat-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    }).catch(() => { /* ignore */ });
  }

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

  // Drive the avatar from real app state — listening > thinking > idle.
  const avatarState = useMemo<GuideAvatarState>(() => {
    if (voice.isListening) return 'listening';
    if (isLoading) return 'thinking';
    return 'idle';
  }, [voice.isListening, isLoading]);

  const suggestions = useMemo(() => getContextualSuggestions(messages), [messages]);

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
    persistMessage(userMessage);
    setInput("");
    setIsLoading(true);

    // Make sure we have a location even on the very first quick message.
    const location = coords ?? (await requestLocation());
    if (location && !coords) setCoords(location);

    const assistantId = crypto.randomUUID();
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          location,
        }),
      });
      if (!response.body) throw new Error("no stream");

      // Add an empty assistant bubble, then fill it as tokens stream in.
      setMessages((c) => [...c, { id: assistantId, role: "assistant", content: "" }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // Strip META_DELIM (or its partial prefix) so it never flashes in the bubble
        const metaStart = buffer.indexOf("\n\nPINEQUEST_META:");
        const displayText = metaStart >= 0 ? buffer.slice(0, metaStart) : buffer;
        setMessages((c) => c.map((m) => (m.id === assistantId ? { ...m, content: displayText } : m)));
      }
      // Flush any bytes the decoder buffered for multi-byte characters
      buffer += decoder.decode();

      // Split the streamed text from the metadata tail (place cards + pending plan).
      const i = buffer.indexOf(META_DELIM);
      const text = i >= 0 ? buffer.slice(0, i) : buffer;
      let meta: { places?: PlaceCard[]; pendingPlan?: PendingPlan; suggestions?: string[]; error?: boolean } = {};
      if (i >= 0) {
        try { meta = JSON.parse(buffer.slice(i + META_DELIM.length)); } catch { /* ignore */ }
      }

      const reply: Message = {
        id: assistantId,
        role: "assistant",
        content: text || (meta.error ? "Sorry, I couldn't reach the guide right now." : ""),
        places: meta.places,
        pendingPlan: meta.pendingPlan,
        planStatus: meta.pendingPlan ? "pending" : undefined,
        suggestions: meta.suggestions,
      };
      setMessages((c) => c.map((m) => (m.id === assistantId ? reply : m)));
      persistMessage(reply);
    } catch {
      const fallback: Message = {
        id: assistantId,
        role: "assistant",
        content: "Something went wrong. Please try again.",
      };
      setMessages((c) =>
        c.some((m) => m.id === assistantId)
          ? c.map((m) => (m.id === assistantId ? fallback : m))
          : [...c, fallback],
      );
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
    const reply: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content,
      places,
      pendingPlan,
      planStatus: pendingPlan ? "pending" : undefined,
      journeyLink,
    };
    setMessages((current) => [...current, reply]);
    persistMessage(reply);
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
          const top = data[0] ?? {};
          // Capture coordinates too — the Live Guide needs them to plot/narrate
          // this plan later (stops without one are geocoded again at launch).
          return {
            name: st.title,
            imageUrl: top.imageUrl as string | undefined,
            latitude: top.latitude as number | undefined,
            longitude: top.longitude as number | undefined,
          };
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

    // Background sync to Supabase — the FULL plan (stops + places), so it
    // survives a new device. Failure is silent; the plan is already saved locally.
    fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: plan.title, summary: plan.summary, stops: plan.stops ?? [], places }),
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

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(input);
  }

  // The most recent finished plan that hasn't been saved yet — powers the
  // always-visible Save button in the header.
  const savable = [...messages].reverse().find((m) => m.pendingPlan && m.planStatus !== "saved");

  function newChat() {
    setMessages([WELCOME]);
    setInput("");
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    fetch("/api/chat-history", { method: "DELETE" }).catch(() => { /* ignore */ });
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col lg:h-[calc(100dvh-5rem)]">
      <ChatHeader
        avatarState={avatarState}
        onSave={savable ? () => savePlan(savable.id, savable.pendingPlan!) : undefined}
        onNewChat={newChat}
        disabled={isLoading}
      />

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {/* Large focused avatar — shown on empty state, collapses once the
            conversation starts. Demonstrates the "centred above chat input"
            context alongside the small header widget. */}
        {messages.length === 1 && messages[0].id === 'welcome' && (
          <div className="flex flex-col items-center gap-3 pb-2 pt-6">
            <GuideAvatar size="lg" state={avatarState} />
            <p className="text-sm font-medium text-ink-muted">{guide.name} · {guide.status}</p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onSavePlan={savePlan}
            onAddMore={addMoreToPlan}
            disabled={isLoading}
          />
        ))}
        {isLoading && (
          messages[messages.length - 1]?.role === "user" ||
          messages[messages.length - 1]?.content === ""
        ) ? <TypingBubble /> : null}
        <div ref={scrollAnchor} />
      </div>

      <FeatureGate feature="aiChat">
        <QuickReplies suggestions={suggestions} onPick={sendMessage} disabled={isLoading} />
        <MessageInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={isLoading}
          isListening={voice.isListening}
          voiceSupported={voice.isSupported}
          onToggleVoice={toggleVoice}
        />
      </FeatureGate>
    </div>
  );
}

function ChatHeader({
  avatarState,
  onSave,
  onNewChat,
  disabled,
}: {
  avatarState: GuideAvatarState;
  onSave?: () => void;
  onNewChat: () => void;
  disabled: boolean;
}) {
  return (
    <header className="flex items-center gap-3 border-b border-sand-200 pb-4">
      <GuideAvatar size="sm" state={avatarState} />
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
      <button
        onClick={onNewChat}
        disabled={disabled}
        aria-label="New chat"
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-sand-100 hover:text-ink disabled:opacity-40"
      >
        <PencilIcon size={18} />
      </button>
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
      {isUser ? (
        <p className="max-w-[80%] whitespace-pre-wrap rounded-3xl bg-primary-600 px-4 py-3 text-sm text-white">
          {message.content}
        </p>
      ) : (
        <div className="max-w-[80%] space-y-2 rounded-3xl bg-white px-4 py-3 text-sm text-ink shadow-ink-sm [&_a]:text-primary-600 [&_a]:underline [&_li]:my-0.5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-0 [&_strong]:font-bold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </div>
      )}

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
  suggestions,
  onPick,
  disabled,
}: {
  suggestions: string[];
  onPick: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 py-3">
      {suggestions.map((reply) => (
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
  onSubmit: (event: React.SyntheticEvent<HTMLFormElement>) => void;
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
