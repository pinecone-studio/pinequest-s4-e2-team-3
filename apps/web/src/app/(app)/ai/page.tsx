"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatIcon, MapPinIcon, MicIcon, PencilIcon, SendIcon, StarIcon, WalkIcon } from "@/components/icons";
import { GuideAvatar, type GuideAvatarState } from "@/components/GuideAvatar";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { guide } from "@/lib/mockData";
import { FeatureGate } from "@/components/FeatureGate";
import { ExploreCard } from "@/components/ExploreCard";
import type { ExploreSpot } from "@/types";

// A place Michelle recommends, shown as a card under her reply.
interface PlaceCard {
  id?: string;
  name: string;
  latitude?: number;
  longitude?: number;
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
  datePromptPlanId?: string; // triggers a start-date picker for this saved plan
}

const INITIAL_SUGGESTIONS = [
  "Where should I visit first?",
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
  "collecting-info": [
    "Temples & history", "Nature & hiking", "Nomadic culture & horse riding", "Local markets & food",
    "Traditional Mongolian food", "Vegetarian options", "Street food & local cafés", "Fine dining",
    "Very active — hiking!", "Easy & relaxed pace", "Mix of everything", "Surprise me!",
  ],
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

  // Preference-gathering questions (collecting-info) — must come before food/nearby
  // so "local markets & food" or "nature & hikes" don't falsely trigger those stages.
  if (/\b(enjoy|interest|choose from|what.*prefer|what.*like)\b/.test(t) &&
      /temples|nomadic|horse riding|hikes|markets/.test(t)) return "collecting-info";
  if (/\b(how many hours|how many days|which month|what month|city or countryside|countryside or city)\b/.test(t)) return "collecting-info";
  // Food *preference* question (Step 5) — not a food recommendation
  if (/food preference|are you into|vegetarian|street food|fine dining/.test(t) &&
      /prefer|preference|into/.test(t)) return "collecting-info";
  // Start time question (Step 6)
  if (/what time|what hour|when.*start|plan to start|time.*plan|time do you/.test(t)) return "collecting-info";

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
  // Use only the last sentence/question — avoids matching old context ("after lunch…")
  const lastQ = (t.match(/[^.!?\n]{10,}[?][^.!?\n]*$/) ?? [t.slice(-300)])[0].trim();

  const stage = detectStage(messages);

  // Filter out suggestions the user already clicked in the last 8 messages.
  const recentClicked = new Set(
    messages.filter((m) => m.role === "user").slice(-8).map((m) => m.content.toLowerCase().trim()),
  );
  function fresh(list: string[]): string[] {
    const filtered = list.filter((s) => !recentClicked.has(s.toLowerCase().trim()));
    return (filtered.length >= 2 ? filtered : list).slice(0, 5);
  }

  const requestedDays = getRequestedDays(messages);
  const plannedDays = getPlannedDays(messages);
  const allDaysDone = requestedDays > 0 && plannedDays >= requestedDays;
  const nextDay = plannedDays + 1;

  // ── FINISHED: plan is ready to save ──────────────────────────────────────
  if (stage === "finished")
    return fresh(["Yes, save this plan!", `Edit Day ${plannedDays}`, "Add one more stop", "Start a completely new plan"]);

  // ── PLANNING: interactive step-by-step day building ─────────────────────
  if (stage === "planning") {
    // "Ready to save your plan?" — always show save options
    if (/\b(ready to save|save your.*plan|shall i save|happy with.*plan|save.*full)\b/.test(lastQ))
      return fresh(["Yes, save this plan!", "Add one more stop", "Change something", "Start over"]);

    // Day-to-day transition
    if (/\b(ready for day|shall i plan day|let'?s? (move|continue) (on )?to day)\b/.test(lastQ) ||
        /\b(ready for day|shall i plan day)\b/.test(t)) {
      if (allDaysDone)
        return fresh(["Yes, save this plan!", "Add one more stop", "Change something", "Start over"]);
      return fresh([`Yes, let's plan Day ${nextDay}!`, "Take a rest day", "Change something", "Skip ahead"]);
    }

    // "What would you like to change?" type questions
    if (/what.*change|different (activity|venue|option|place|stop)|looking for (a different|another)|let me know/.test(lastQ))
      return fresh(["Change the morning activity", "Different lunch spot", "Change the evening plans", "Suggest something else"]);

    // Interactive stage: picking dinner restaurant
    if (/\b(dinner|evening meal|supper|which.*dinner|dinner.*prefer|where.*dinner)\b/.test(lastQ)) {
      if (allDaysDone)
        return fresh(["That one sounds perfect!", "Show me another option", "Vegetarian option?", "Save this plan!"]);
      return fresh(["That one sounds perfect!", "Show me another option", "Vegetarian option?", `On to Day ${nextDay}`]);
    }

    // Interactive stage: picking afternoon activity
    if (/\b(afternoon|activity.*afternoon|afternoon.*activity|what.*afternoon|afternoon.*prefer)\b/.test(lastQ))
      return fresh(["That sounds great!", "Show me another option", "Something more relaxed?", "What's for dinner after?"]);

    // Interactive stage: picking lunch
    if (/\b(lunch|where.*eat|lunch.*prefer|which.*lunch|eat.*afternoon)\b/.test(lastQ))
      return fresh(["That one!", "Show me another option", "Vegetarian option?", "Something quick & cheap"]);

    // Interactive stage: picking morning activity
    if (/\b(morning|what.*morning|morning.*activity|activity.*morning|which.*morning)\b/.test(lastQ)) {
      if (/monastery|temple|gandan|lama/.test(t))
        return fresh(["Let's go there!", "Show me another option", "Entry fee?", "What's for lunch after?"]);
      if (/museum|gallery|palace|monument/.test(t))
        return fresh(["Perfect!", "Another option?", "How long to visit?", "What's for lunch after?"]);
      if (/park|nature|hike|terelj|mountain/.test(t))
        return fresh(["Love it!", "Another option?", "What activities there?", "What's for lunch?"]);
      if (/horse|camel|ride/.test(t))
        return fresh(["Sounds fun!", "Another option?", "How long is the ride?", "What's next after?"]);
      return fresh(["That sounds great!", "Show me another option", "What's for lunch after?", "Add another stop"]);
    }

    // Interactive stage: picking breakfast spot
    if (/\b(breakfast|start.*day|kick.*off|where.*breakfast|breakfast.*prefer|morning.*café|café.*morning)\b/.test(lastQ))
      return fresh(["That one!", "Show me another option", "Something local?", "Quick & easy"]);

    // Preference question during planning
    if (/\b(nature|countryside|outdoor).{0,60}\bor\b|\bor\b.{0,60}\b(nature|countryside|outdoor)\b/.test(lastQ))
      return fresh(["Start with nature!", "Cultural sites first", "Mix of both", "Surprise me!"]);
    if (/\b(active|hik|trek|adventure).{0,60}\bor\b|\bor\b.{0,60}\b(active|hik|trek|relaxed|easy)\b/.test(lastQ))
      return fresh(["Very active — hiking!", "Moderate walks", "Easy & relaxed", "Mix of both"]);
    if (/\b(history|culture|museum|temple|monument).{0,60}\bor\b|\bor\b.{0,60}\b(history|culture|museum|temple)\b/.test(lastQ))
      return fresh(["History & culture first", "Nature & outdoors", "Mix of both", "Surprise me!"]);

    return fresh(["Sounds good!", "Add a stop", "Change this", "What's for lunch?"]);
  }

  // ── RECOMMENDING PLACE: specific to place type ────────────────────────────
  if (stage === "recommending-place") {
    if (/monastery|temple|gandan|erdene|lama/.test(t))
      return fresh(["Best time to visit?", "Is there an entry fee?", "Lunch spots nearby", "Add to itinerary"]);
    if (/museum|gallery|palace|history/.test(t))
      return fresh(["Opening hours?", "How long to visit?", "Lunch spots nearby", "Add to itinerary"]);
    if (/park|terelj|gobi|nature|steppe|mountain/.test(t))
      return fresh(["Horse riding available?", "Best hiking trail?", "Camping nearby?", "Add to itinerary"]);
    if (/market|bazaar|shop|mall/.test(t))
      return fresh(["What's worth buying?", "Best prices?", "Opening hours?", "Add to itinerary"]);
    if (/restaurant|cafe|food|eat|lunch|dinner/.test(t))
      return fresh(["What's their specialty?", "Price range?", "Vegetarian-friendly?", "Add to itinerary"]);
    return fresh(["Add to my itinerary", "How far is it?", "Is there an entry fee?", "Show alternatives"]);
  }

  // ── NEARBY: live location search results ──────────────────────────────────
  if (stage === "nearby")
    return fresh(["Give me walking directions", "Is it open right now?", "Show cheaper options", "Something else nearby"]);

  // ── FOOD: meal-specific ───────────────────────────────────────────────────
  if (stage === "food") {
    if (/\b(lunch)\b/.test(lastQ))
      return fresh(["Traditional Mongolian", "Something quick & cheap", "Vegetarian options?", "Skip lunch"]);
    if (/\b(dinner)\b/.test(lastQ))
      return fresh(["Traditional restaurant", "Modern dining", "Cheap & local", "Plan tomorrow instead"]);
    if (/\b(breakfast|brunch)\b/.test(lastQ))
      return fresh(["Hotel breakfast ok?", "Local café nearby?", "What time to eat?", "Skip, start early"]);
    if (/\b(buuz|khuushuur|tsuivan|khuurga)\b/.test(t))
      return fresh(["Where's the best one?", "Price range?", "Vegetarian version?", "Add to plan"]);
    return fresh(["Traditional Mongolian", "Western / Modern", "Best coffee nearby", "Show directions"]);
  }

  // ── TRANSPORT ─────────────────────────────────────────────────────────────
  if (stage === "transport")
    return fresh(["How much is a taxi?", "Can I walk there?", "Which bus route?", "Share my location"]);

  // ── COLLECTING INFO: answer the specific question asked ───────────────────
  if (/which month|what month|when.*visit|time of year/.test(lastQ))
    return fresh(["July (Naadam season)", "June (pleasant weather)", "August", "Winter (Ice Festival)"]);
  if (/how many hours|how much time|roughly how many|2 hours|half a day/.test(lastQ))
    return fresh(["2 hours", "3–4 hours", "Half a day", "Full day"]);
  if (/how many days|how long|length of.*trip/.test(lastQ))
    return fresh(["Just a few hours", "1 Day", "3 Days (Quick UB & Terelj)", "5 Days (Classic trip)"]);
  if (/what time|when.*start|plan to start|time do you/.test(t))
    return fresh(["08:00", "10:00", "14:00", "17:00"]);
  if (/(city|ulaanbaatar).{0,80}or.{0,80}(countryside|nature)|(countryside|nature).{0,80}or.{0,80}(city|ulaanbaatar)/.test(t))
    return fresh(["Mainly countryside & nature", "Explore Ulaanbaatar city", "A perfect mix of both"]);
  if (/gobi|khövsgöl|khovsgol|terelj/.test(t))
    return fresh(["Gobi Desert", "Northern Mongolia", "Terelj / Gorkhi", "Lake Khövsgöl"]);
  // Use `t` (full message) for multi-sentence questions — lastQ only captures the last "?" fragment
  if (/\b(enjoy|what do you enjoy|what.*enjoy most)\b/.test(t) &&
      /temples|nomadic|horse riding|hikes|markets/.test(t))
    return fresh(["Temples & history", "Nature & hiking", "Nomadic culture & horse riding", "Local markets & food"]);
  if (/food preference|are you into|vegetarian|street food|fine dining/.test(t) &&
      /prefer|preference|into|food preference/.test(t) &&
      !/enjoy most|temples|nomadic/.test(t))
    return fresh(["Traditional Mongolian", "Street food & local cafés", "Vegetarian", "Fine dining"]);
  if (/food|eat|cuisine|diet|meal|vegetar|vegan/.test(lastQ))
    return fresh(["Traditional Mongolian dishes", "Street food & local cafés", "Vegetarian options", "Fine dining"]);
  if (/active|pace|physical|hik|adventur|relax/.test(lastQ))
    return fresh(["Very active — hiking!", "Moderate walks", "Easy & relaxed pace", "Mix of both"]);
  if (/solo|traveling with|group|how many (people|of you)/.test(lastQ))
    return fresh(["Solo", "With a partner", "Small group", "Family with kids"]);
  if (/budget|price|afford|luxury|cost/.test(lastQ))
    return fresh(["Backpacker / budget", "Mid-range comfortable", "Luxury & ger camps"]);
  if (/morning or afternoon|early or later/.test(lastQ))
    return fresh(["Early morning", "Late morning", "Afternoon", "Flexible"]);
  if (/safe|emergency|hospital/.test(t))
    return fresh(["Find nearest hospital", "Emergency contacts", "Is it safe?", "Call for help"]);
  if (/naadam|tsagaan sar|festival|national holiday/.test(t))
    return fresh(["Yes, I'd love it!", "Tell me more", "I prefer quieter times", "What else is on?"]);
  if (/car|driver|transport|getting around|taxi/.test(lastQ))
    return fresh(["Need a rental car + driver", "Using public transport", "I will drive myself"]);

  // ── FALLBACK: shuffle pool, filter recently clicked ───────────────────────
  const pool = STAGE_POOLS[stage] ?? STAGE_POOLS.fallback;
  return fresh(shuffled(pool));
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
  const searchParams = useSearchParams();
  // planId is set when navigating from Journey → "Continue chatting".
  // We keep a ref so savePlan (an async function) always reads the latest
  // value even after the await for image lookups.
  const editingPlanIdRef = useRef<string | null>(searchParams.get("planId"));
  useEffect(() => {
    editingPlanIdRef.current = searchParams.get("planId");
  }, [searchParams]);

  // Load the conversation: if a planId URL param is present, restore the chat
  // snapshot saved when that plan was created. Otherwise load the current chat
  // from local cache, then sync from the backend.
  useEffect(() => {
    const planId = new URLSearchParams(window.location.search).get("planId");
    if (planId) {
      try {
        const snap = localStorage.getItem(`lumo:chat:${planId}`);
        const parsed = snap ? (JSON.parse(snap) as Message[]) : null;
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed);
          setHydrated(true);
          return;
        }
      } catch { /* ignore corrupt snapshot */ }
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? (JSON.parse(saved) as Message[]) : null;
      if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
    } catch { /* ignore corrupt storage */ }

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
    datePromptPlanId?: string,
  ) {
    const reply: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content,
      places,
      pendingPlan,
      planStatus: pendingPlan ? "pending" : undefined,
      journeyLink,
      datePromptPlanId,
    };
    setMessages((current) => [...current, reply]);
    persistMessage(reply);
  }

  function updatePlanStartDate(planId: string, startDate: string) {
    try {
      const stored = JSON.parse(localStorage.getItem("polaris:saved-plans") ?? "[]") as Array<{ id: string; startDate?: string; savedAt?: string }>;
      // Try exact match first; fall back to the most recently saved non-demo plan
      // (needed when Supabase sync already replaced the local entry.id with its own UUID).
      let idx = stored.findIndex((p) => p.id === planId);
      if (idx < 0) idx = stored.findIndex((p) => !p.id.startsWith("route:"));
      if (idx >= 0) {
        stored[idx] = { ...stored[idx], startDate };
        localStorage.setItem("polaris:saved-plans", JSON.stringify(stored));
      }
    } catch { /* ignore */ }
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

    // Read from the ref — always current regardless of async gaps in this function.
    const editingPlanId = editingPlanIdRef.current;

    if (editingPlanId) {
      // Opened via Journey → "Continue chatting": update the existing plan in
      // place rather than creating a new one.
      try {
        const stored = JSON.parse(localStorage.getItem("polaris:saved-plans") ?? "[]") as Array<{ id: string }>;
        const updated = stored.map((p) =>
          p.id === editingPlanId
            ? { ...p, title: plan.title, summary: plan.summary, stops: plan.stops ?? [], places }
            : p,
        );
        localStorage.setItem("polaris:saved-plans", JSON.stringify(updated));
        localStorage.setItem(`lumo:chat:${editingPlanId}`, JSON.stringify(messages));
      } catch { /* ignore storage quota issues */ }

      addAssistantReply("Journey updated! When do you plan to start? Pick a date so Journey can show your timeline.", undefined, undefined, true, editingPlanId);

      // Await the PATCH so Supabase is up to date before the user navigates
      // back to Journey (otherwise Journey's refetch returns stale data).
      await fetch("/api/trips", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingPlanId, title: plan.title, summary: plan.summary, stops: plan.stops ?? [], places }),
      }).catch(() => { /* ignore network errors */ });

      return;
    }

    // Save to localStorage — Journey reads from here.
    const entry = { id: crypto.randomUUID(), title: plan.title, summary: plan.summary, stops: plan.stops ?? [], savedAt: new Date().toISOString(), places };
    try {
      const prev = JSON.parse(localStorage.getItem("polaris:saved-plans") ?? "[]");
      localStorage.setItem("polaris:saved-plans", JSON.stringify([entry, ...prev]));
      // Snapshot the chat so Journey can navigate back to this exact conversation.
      localStorage.setItem(`lumo:chat:${entry.id}`, JSON.stringify(messages));
    } catch { /* ignore storage quota issues */ }

    addAssistantReply("Saved to your journey! When do you plan to start? Pick a date so Journey can show your timeline.", undefined, undefined, true, entry.id);

    // Background sync to Supabase — the FULL plan (stops + places), so it
    // survives a new device. When Supabase returns its own UUID, update the
    // localStorage entry and chat snapshot to use that same ID so Journey can
    // navigate back to this chat when the user is signed in.
    fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: plan.title, summary: plan.summary, stops: plan.stops ?? [], places }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { id?: string } | null) => {
        if (!data?.id) return;
        try {
          // Re-key the localStorage plan entry to the Supabase ID.
          const stored = JSON.parse(localStorage.getItem("polaris:saved-plans") ?? "[]") as Array<{ id: string }>;
          const updated = stored.map((p) => (p.id === entry.id ? { ...p, id: data.id! } : p));
          localStorage.setItem("polaris:saved-plans", JSON.stringify(updated));
          // Re-key the chat snapshot so Journey can find it by the Supabase ID.
          const snap = localStorage.getItem(`lumo:chat:${entry.id}`);
          if (snap) localStorage.setItem(`lumo:chat:${data.id}`, snap);
        } catch { /* ignore storage errors */ }
      })
      .catch(() => { /* ignore network errors */ });
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

        {messages.map((message, idx) => (
          <MessageBubble
            key={message.id}
            message={message}
            coords={coords}
            onSavePlan={savePlan}
            onAddMore={addMoreToPlan}
            onUpdateStartDate={updatePlanStartDate}
            onSelect={
              idx === messages.length - 1 &&
              !isLoading &&
              message.role === "assistant" &&
              (
                /which would you prefer|which one do you prefer|which sounds best|which would you like|which do you prefer|which would you choose|which one would you|which option you.{0,10}prefer|let me know which|which of these|which catch|which interests/i.test(message.content) ||
                (/[\r\n]1\.\s+\S/.test(message.content) && !/[\r\n]\d{1,2}:\d{2}/.test(message.content))
              )
                ? sendMessage
                : undefined
            }
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
  onNewChat,
  disabled,
}: {
  avatarState: GuideAvatarState;
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

// Extract specific place names from time-plan lines like "09:00: Breakfast at Sky Lounge — ..."
// Also handles numbered suggestion lists like "1. Café Amsterdam — great coffee"
// and bold-formatted names like "**Café Amsterdam**"
// Returns names suitable for passing to /api/places?q=
function extractPlanPlaceNames(content: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const add = (name: string) => {
    const n = name.replace(/\*\*/g, "").trim(); // strip any stray bold markers
    if (n.length > 2 && !seen.has(n.toLowerCase())) {
      seen.add(n.toLowerCase());
      names.push(n);
    }
  };

  // Strip action prefixes before place name
  const stripAction = (s: string) =>
    s.replace(/^(breakfast|brunch|lunch|dinner|coffee|tea|drinks?|visit|explore|stop at|head to|relax at|check out)\s+(at\s+)?/i, "").trim();

  for (const raw of content.split("\n")) {
    // Remove markdown bold markers so "• **09:00**: Cafe 21" becomes "• 09:00: Cafe 21"
    const line = raw.trim().replace(/\*\*/g, "");

    // Strip leading bullet/dash so "• 09:00: ..." and "09:00: ..." both hit the same path
    const stripped = line.replace(/^[-•*]\s+/, "");

    // Time-formatted itinerary lines: "09:00: Breakfast at Cafe 21 — ..."
    if (/^\d{1,2}:\d{2}/.test(stripped)) {
      const body = stripped.replace(/^\d{1,2}:\d{2}[^\w]*/, "");
      const beforeDesc = body.split(/\s+[—–-]\s+/)[0].trim();
      add(stripAction(beforeDesc));
      continue;
    }

    // Numbered suggestion lines: "1. Café Amsterdam — great coffee"
    const numberedMatch = stripped.match(/^\d+[.)]\s+(.+)/);
    if (numberedMatch) {
      add(numberedMatch[1].split(/\s+[—–-]\s+/)[0].trim());
      continue;
    }

    // Bare "Place Name — description" lines (capital letter, em/en dash separator)
    const bareMatch = stripped.match(/^([A-Z][^:.\n—–]{2,60}?)\s+[—–]\s+\S/);
    if (bareMatch) {
      add(bareMatch[1].trim());
      continue;
    }
  }

  // Bold names **Place Name** — skip time codes like **09:00**
  for (const match of content.matchAll(/\*\*([^*]{3,50})\*\*/g)) {
    if (!/^\d{1,2}:\d{2}/.test(match[1])) add(match[1]);
  }

  // Inline numbered items without newlines: "1. BD's Mongolian BBQ — desc 2. Millie's..."
  // Catches lists the AI emits as one paragraph (no \n between items).
  for (const match of content.matchAll(/(?<!\d)\d+[.)]\s+(.+?)(?:\s+[—–-]\s+|\s{2,}(?=\d+[.)]))/g)) {
    const candidate = match[1].replace(/\*\*/g, "").trim();
    if (candidate.length > 2) add(candidate);
  }

  return names;
}

function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractTextFromChildren).join("");
  if (children !== null && typeof children === "object" && "props" in (children as object)) {
    const el = children as { props?: { children?: React.ReactNode } };
    return extractTextFromChildren(el.props?.children);
  }
  return "";
}

function MessageBubble({
  message,
  coords,
  onSavePlan,
  onAddMore,
  onUpdateStartDate,
  onSelect,
  disabled,
}: {
  message: Message;
  coords: { lat: number; lng: number } | null;
  onSavePlan: (messageId: string, plan: PendingPlan) => void;
  onAddMore: (messageId: string) => void;
  onUpdateStartDate: (planId: string, date: string) => void;
  onSelect?: (name: string) => void;
  disabled: boolean;
}) {
  const isUser = message.role === "user";
  const [autoSpots, setAutoSpots] = useState<(ExploreSpot | { name: string })[]>([]);
  const [spotsLoading, setSpotsLoading] = useState(false);
  const [spotsCount, setSpotsCount] = useState(3);

  useEffect(() => {
    if (isUser) return;
    const names = message.places?.length
      ? message.places.map((p) => p.name)
      : extractPlanPlaceNames(message.content);
    if (!names.length) return;
    const lat = coords?.lat ?? 47.9077;
    const lng = coords?.lng ?? 106.8832;
    let cancelled = false;
    setSpotsCount(Math.min(names.length, 5));
    setSpotsLoading(true);
    Promise.all(
      names.map((name) =>
        fetch(`/api/places?q=${encodeURIComponent(name)}&lat=${lat}&lng=${lng}`)
          .then((r) => (r.ok ? r.json() : []))
          .then((data: ExploreSpot[]) => data[0] ?? null)
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return;
      const mapped = results.map((r, i) => r ?? { name: names[i] });
      // Found places first, unfound last
      mapped.sort((a, b) => ("id" in b ? 1 : 0) - ("id" in a ? 1 : 0));
      setAutoSpots(mapped);
      setSpotsLoading(false);
    }).catch(() => {
      if (!cancelled) setSpotsLoading(false);
    });
    return () => {
      cancelled = true;
      setSpotsLoading(false);
    };
  }, [message.id, message.places]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={isUser ? "flex flex-col items-end" : "flex flex-col items-start"}>
      {isUser ? (
        <p className="max-w-[80%] whitespace-pre-wrap rounded-3xl bg-primary-600 px-4 py-3 text-sm text-white">
          {message.content}
        </p>
      ) : (
        <div className="max-w-[85%] space-y-2 rounded-3xl bg-white px-4 py-3 text-sm text-ink shadow-ink-sm [&_a]:text-primary-600 [&_a]:underline [&_li]:my-0.5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-0 [&_strong]:font-bold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
              ),
              li: ({ children, ...props }) => {
                if (onSelect) {
                  const text = extractTextFromChildren(children);
                  const placeName = text.split(/\s*[—–-]\s*/)[0].replace(/^\d+[.)]\s*/, "").trim();
                  if (placeName.length > 2) {
                    return (
                      <li {...props}>
                        <button
                          type="button"
                          onClick={() => onSelect(`I'd like to go to ${placeName}`)}
                          className="text-left text-primary-600 underline underline-offset-2 hover:text-primary-700 active:opacity-70"
                        >
                          {placeName}
                        </button>
                        {text.includes("—") || text.includes("–") ? (
                          <span className="text-ink"> — {text.split(/\s*[—–]\s*/).slice(1).join(" — ")}</span>
                        ) : null}
                      </li>
                    );
                  }
                }
                return <li {...props}>{children}</li>;
              },
            }}
          >{message.content}</ReactMarkdown>

          {onSelect && (
            <p className="text-[11px] text-ink-muted/70 -mt-1">(tap a name above to choose)</p>
          )}

          {spotsLoading && (
            <div className="flex gap-3 overflow-x-auto pb-1 pt-1" style={{ scrollbarWidth: "none" }}>
              {Array.from({ length: spotsCount }).map((_, i) => (
                <div key={i} className="flex-none overflow-hidden rounded-3xl bg-sand-100 animate-pulse" style={{ width: 160 }}>
                  <div className="h-28 w-full bg-sand-200" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 w-3/4 rounded-full bg-sand-200" />
                    <div className="h-3 w-1/2 rounded-full bg-sand-200" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!spotsLoading && autoSpots.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-1 pt-1" style={{ scrollbarWidth: "none" }}>
              {autoSpots.map((spot, spotIdx) => {
                if ("id" in spot) {
                  return (
                    <div key={`${spot.id}-${spotIdx}`} className="flex-none" style={{ width: 160 }}>
                      <ExploreCard spot={spot} compact />
                    </div>
                  );
                }
                return (
                  <a
                    key={`${spot.name}-${spotIdx}`}
                    href={`https://www.google.com/maps/search/${encodeURIComponent(spot.name + " Ulaanbaatar")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-none overflow-hidden rounded-3xl bg-white shadow-ink-sm text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-ink-md active:translate-y-0 active:shadow-ink-sm"
                    style={{ width: 160 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/nature-default.jpg" alt="" className="h-28 w-full object-cover" />
                    <div className="p-3">
                      <h3 className="text-sm font-bold text-ink leading-tight line-clamp-2">{spot.name}</h3>
                      <p className="mt-2 text-sm text-primary-500 font-medium">Search on Maps ↗</p>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}

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

      {message.datePromptPlanId ? (
        <DatePickerPrompt planId={message.datePromptPlanId} onSave={onUpdateStartDate} />
      ) : null}
    </div>
  );
}

// Date picker shown after a plan is saved so the user can set a start date.
// Saves the date to localStorage (and attempts a backend sync) via onSave.
function DatePickerPrompt({ planId, onSave }: { planId: string; onSave: (planId: string, date: string) => void }) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [date, setDate] = useState(tomorrow.toISOString().slice(0, 10));
  const [saved, setSaved] = useState(false);

  if (saved) {
    return (
      <p className="mt-2 text-sm font-semibold text-primary-600">
        ✓ Start date set — check your Journey!
      </p>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        type="date"
        value={date}
        min={new Date().toISOString().slice(0, 10)}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-xl border border-sand-200 bg-white px-3 py-1.5 text-sm text-ink focus:border-primary-300 focus:outline-none"
      />
      <button
        onClick={() => { onSave(planId, date); setSaved(true); }}
        disabled={!date}
        className="rounded-full bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
      >
        Set date
      </button>
    </div>
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
