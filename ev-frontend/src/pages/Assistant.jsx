import { useEffect, useMemo, useState } from "react";
import { Bot, Loader2, MessageSquarePlus, Send, Sparkles, Trash2, UserRound } from "lucide-react";
import Card from "../components/Card.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { aiApi } from "../services/api.js";

const suggestedPrompts = [
  "Find charging stations near Velachery",
  "Recommend the best charger near Anna Nagar",
  "How much did I spend this month?",
  "Predict the best booking option tomorrow at 10 AM",
  "Which station has highest utilization?"
];

const assistantGreeting = {
  role: "assistant",
  content: "Hi, I am your ChargeOps assistant. Ask me to find stations, review spending, check reviews, or analyze utilization."
};

const Assistant = () => {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const [conversation, setConversation] = useState([assistantGreeting]);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  const userId = useMemo(() => user?.id || user?._id || user?.email || "current-user", [user]);

  const normalizeMessages = (messages = []) => (messages.length ? messages : [assistantGreeting]);

  const refreshHistory = async ({ selectLatest = false } = {}) => {
    setIsLoadingHistory(true);
    try {
      const { data } = await aiApi.history({ userId, page: 1, limit: 20 });
      const nextSessions = data.sessions || [];
      setSessions(nextSessions);
      setPagination(data.pagination || { page: 1, limit: 20, total: nextSessions.length, pages: 1 });

      if (selectLatest && nextSessions[0]) {
        setActiveSessionId(nextSessions[0].sessionId);
        setConversation(normalizeMessages(nextSessions[0].messages));
      } else if (!activeSessionId && nextSessions[0]) {
        setActiveSessionId(nextSessions[0].sessionId);
        setConversation(normalizeMessages(nextSessions[0].messages));
      } else if (!nextSessions.length) {
        setActiveSessionId("");
        setConversation([assistantGreeting]);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load AI chat history.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    refreshHistory({ selectLatest: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const openSession = async (sessionId) => {
    if (!sessionId || sessionId === activeSessionId) {
      return;
    }

    setError("");
    setIsLoadingHistory(true);
    try {
      const { data } = await aiApi.historyBySession(sessionId, { userId });
      setActiveSessionId(sessionId);
      setConversation(normalizeMessages(data.session?.messages));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not open this chat.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const startNewChat = () => {
    setError("");
    setActiveSessionId("");
    setConversation([assistantGreeting]);
    setMessage("");
  };

  const deleteSession = async (sessionId) => {
    setError("");
    try {
      await aiApi.deleteHistory(sessionId, { userId });
      const remaining = sessions.filter((session) => session.sessionId !== sessionId);
      setSessions(remaining);

      if (activeSessionId === sessionId) {
        if (remaining[0]) {
          await openSession(remaining[0].sessionId);
        } else {
          startNewChat();
        }
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not delete this chat.");
    }
  };

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
        sessionId: activeSessionId || undefined,
        message: trimmed
      });

      if (data.sessionId) {
        setActiveSessionId(data.sessionId);
      }

      setConversation((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer || "I could not generate a response right now."
        }
      ]);

      if (data.session) {
        setSessions((current) => {
          const withoutCurrent = current.filter((session) => session.sessionId !== data.session.sessionId);
          return [data.session, ...withoutCurrent];
        });
      } else {
        refreshHistory();
      }
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
              <h2 className="mt-3 text-3xl font-semibold text-white">AI Assistant Dashboard</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Ask the ChargeOps AI Assistant for nearby stations, charger recommendations, booking optimization, cost insights, and usage analytics.
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

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="h-fit">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Chats</p>
                <h3 className="mt-1 text-base font-semibold text-white">Previous Chats</h3>
              </div>
              <button
                type="button"
                onClick={startNewChat}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-950 transition hover:bg-amber-300"
                aria-label="Start new chat"
                title="New Chat"
              >
                <MessageSquarePlus size={18} />
              </button>
            </div>

            <div className="mt-4 max-h-[460px] space-y-2 overflow-y-auto pr-1">
              {isLoadingHistory && !sessions.length && (
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/30 px-3 py-3 text-sm text-slate-300">
                  <Loader2 className="animate-spin" size={16} />
                  Loading chats
                </div>
              )}

              {!isLoadingHistory && !sessions.length && (
                <p className="rounded-xl border border-white/10 bg-slate-950/30 px-3 py-3 text-sm text-slate-400">
                  No previous chats yet.
                </p>
              )}

              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className={`group flex items-center gap-2 rounded-xl border px-3 py-2 transition ${
                    activeSessionId === session.sessionId
                      ? "border-amber-300/30 bg-amber-300/10"
                      : "border-white/10 bg-slate-950/30 hover:border-white/20 hover:bg-white/5"
                  }`}
                >
                  <button type="button" onClick={() => openSession(session.sessionId)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-medium text-white">{session.title || "New chat"}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {session.messageCount || 0} messages
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSession(session.sessionId)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-100 transition hover:bg-red-500/10 hover:text-red-200 xl:opacity-0 xl:group-hover:opacity-100"
                    aria-label="Delete chat"
                    title="Delete Chat"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            {pagination.total > pagination.limit && (
              <p className="mt-3 text-xs text-slate-500">
                Showing {sessions.length} of {pagination.total} chats.
              </p>
            )}
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
      </div>
    </main>
  );
};

export default Assistant;
