export default function GuidePage() {
  return (
    <div className="h-screen flex flex-col max-w-3xl mx-auto px-4">
      <div className="py-6 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-primary-900">AI Guide</h1>
        <p className="text-gray-500 text-sm mt-1">Ask anything about your destination</p>
      </div>

      {/* TODO: chat message list */}
      <div className="flex-1 py-6 flex items-center justify-center">
        <p className="text-gray-400">Conversation history placeholder</p>
      </div>

      {/* TODO: text input + voice input (Chimege STT) */}
      <div className="py-4 border-t border-gray-100 flex gap-3">
        <input
          type="text"
          placeholder="Ask the AI guide..."
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-3 rounded-xl transition-colors">
          🎤
        </button>
        <button className="bg-primary-600 text-white px-5 py-3 rounded-xl hover:bg-primary-700 transition-colors font-medium">
          Send
        </button>
      </div>
    </div>
  );
}
