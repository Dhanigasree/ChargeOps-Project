import { useMemo, useState } from "react";
import { Bot, Loader2, Send, Sparkles, UserRound } from "lucide-react";
import Card from "../components/Card.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { aiApi } from "../services/api.js";

const suggestedPrompts = [
  "Find charging stations near Velachery",
  "How much did I spend this month?",
  "Show reviews for a station",
  "Which station has highest utilization?"
];

const Assistant = () => {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [conversation, setConversation] = useState([
    {
      role: "assistant",
      content: "Hi, I am your ChargeOps assistant. Ask me to find stations, review spending, check reviews, or analyze utilization."
    }
  ]);

  const userId = useMemo(() => user?.id || user?._id || user?.email || "current-user", [user]);

  const sendMessage = async (nextMessage = message) => {
    const trimmed = nextMessage.trim();

    if (!trimmed || isSending) {
      return;
    }

    setError("");
    setMessage("");
    setConversation((current) => [...current, { role: "user", content: trimmed }]);
    setIsSending(true);

    try {
      const { data } = await aiApi.chat({
        userId,
        message: trimmed
      });

      setConversation((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer || "I could not generate a response right now."
        }
      ]);
    } catch (requestError) {
      const details = requestError.response?.data?.message || "AI Assistant is not reachable yet. Check that ai-service is running.";
      setError(details);
      setConversation((current) => [
        ...current,
        {
          role: "assistant",
          content: "I could not reach the AI service from this deployment yet."
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <main className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <Sidebar />

      <div className="flex-1 space-y-6">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-5 border-b border-white/10 pb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">Agentic AI</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">ChargeOps Assistant</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Ask for station search, booking help, spending summaries, reviews, and operations analytics.
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-800 via-violet-700 to-amber-400 text-white shadow-lg shadow-violet-950/30">
              <Sparkles size={24} />
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-left text-sm text-slate-200 transition hover:border-amber-300/30 hover:bg-white/5"
              >
                {prompt}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex h-[min(58vh,620px)] flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              {conversation.map((entry, index) => {
                const isUser = entry.role === "user";
                const Icon = isUser ? UserRound : Bot;

                return (
                  <div key={`${entry.role}-${index}`} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                    {!isUser && (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200">
                        <Icon size={18} />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                        isUser
                          ? "bg-gradient-to-r from-blue-800 via-violet-700 to-amber-400 text-white"
                          : "border border-white/10 bg-slate-950/40 text-slate-200"
                      }`}
                    >
                      {entry.content}
                    </div>
                    {isUser && (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-200">
                        <Icon size={18} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 flex gap-3">
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ask ChargeOps Assistant..."
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/40"
              />
              <button
                type="submit"
                disabled={isSending || !message.trim()}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              </button>
            </form>
          </div>
        </Card>
      </div>
    </main>
  );
};

export default Assistant;
