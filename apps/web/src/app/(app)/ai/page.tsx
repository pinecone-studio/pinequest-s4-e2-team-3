"use client";

import { useEffect, useRef, useState } from "react";
import { MicIcon, SendIcon, SparklesIcon } from "@/components/icons";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { aiQuickReplies, guide } from "@/lib/mockData";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm Nova, your guide in Mongolia. Ask me anything — places, food, getting around, or staying safe.",
};

export default function AiPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const scrollAnchor = useRef<HTMLDivElement>(null);

  // Grab the device location so Nova can recommend real nearby places.
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords(null),
      { enableHighAccuracy: true, timeout: 10000 },
    );
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

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          location: coords,
        }),
      });
      const data = await response.json();
      addAssistantReply(
        data.reply || "Sorry, I couldn't reach the guide right now.",
      );
    } catch {
      addAssistantReply("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function addAssistantReply(content: string) {
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "assistant", content },
    ]);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col lg:h-[calc(100vh-5rem)]">
      <ChatHeader />

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
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

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <p
        className={[
          "max-w-[80%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm",
          isUser ? "bg-primary-600 text-white" : "bg-white text-ink shadow-sm",
        ].join(" ")}
      >
        {message.content}
      </p>
    </div>
  );
}

// The "Nova is typing" indicator shown while awaiting a reply.
function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex gap-1 rounded-3xl bg-white px-4 py-4 shadow-sm">
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
      className="h-2 w-2 animate-bounce rounded-full bg-ink-muted"
      style={{ animationDelay: delay }}
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
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-muted shadow-sm hover:text-ink disabled:opacity-50"
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
      className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-sm"
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
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white disabled:opacity-50"
        aria-label="Send message"
      >
        <SendIcon size={18} />
      </button>
    </form>
  );
}
