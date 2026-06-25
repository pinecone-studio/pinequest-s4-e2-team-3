import { MicIcon, SendIcon, SparklesIcon } from "@/components/icons";
import { aiConversation, aiQuickReplies, guide } from "@/lib/mockData";
import type { GuideMessage } from "@/types";

export default function AiPage() {
  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col lg:h-[calc(100vh-5rem)]">
      <ChatHeader />

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {aiConversation.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      <QuickReplies />
      <MessageInput />
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

function MessageBubble({ message }: { message: GuideMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <p
        className={[
          "max-w-[80%] rounded-3xl px-4 py-3 text-sm",
          isUser
            ? "bg-primary-600 text-white"
            : "bg-white text-ink shadow-sm",
        ].join(" ")}
      >
        {message.content}
      </p>
    </div>
  );
}

function QuickReplies() {
  return (
    <div className="flex flex-wrap gap-2 py-3">
      {aiQuickReplies.map((reply) => (
        <button
          key={reply}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-muted shadow-sm hover:text-ink"
        >
          {reply}
        </button>
      ))}
    </div>
  );
}

function MessageInput() {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-sm">
      <input
        type="text"
        placeholder="Message Lumo…"
        className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
      />
      <button className="text-ink-muted hover:text-ink" aria-label="Voice input">
        <MicIcon size={20} />
      </button>
      <button
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white"
        aria-label="Send message"
      >
        <SendIcon size={18} />
      </button>
    </div>
  );
}
