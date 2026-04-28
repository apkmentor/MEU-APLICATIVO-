import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  PaperPlaneTilt, Plus, Trash, Sparkle, Lightning, Robot, Crown,
} from "@phosphor-icons/react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function ChatPage() {
  const { user } = useAuth();
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [sub, setSub] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const scrollRef = useRef(null);

  const refreshSessions = async () => {
    const { data } = await api.get("/chat/sessions");
    setSessions(data);
  };

  const refreshSub = async () => {
    try {
      const { data } = await api.get("/subscription/me");
      setSub(data);
    } catch {
      // ignore
    }
  };

  // initial load
  useEffect(() => {
    refreshSessions();
    refreshSub();
    api.get("/prompts").then((r) => setPrompts(r.data));
  }, []);

  // load messages when sessionId changes
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    setLoadingMsgs(true);
    api
      .get(`/chat/sessions/${sessionId}/messages`)
      .then((r) => setMessages(r.data))
      .catch(() => navigate("/app/chat"))
      .finally(() => setLoadingMsgs(false));
  }, [sessionId, navigate]);

  // auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  // pending prompt from landing
  useEffect(() => {
    const pending = sessionStorage.getItem("mentoria_pending_prompt");
    if (pending) {
      sessionStorage.removeItem("mentoria_pending_prompt");
      setInput(pending);
    }
  }, []);

  const send = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");

    const tempUser = {
      id: `tmp-${Date.now()}`, role: "user", content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, tempUser]);

    try {
      const { data } = await api.post("/chat/message", {
        session_id: sessionId || null,
        content: text,
      });
      setMessages((m) => [
        ...m.filter((x) => x.id !== tempUser.id),
        data.user_message,
        data.ai_message,
      ]);
      if (!sessionId) {
        navigate(`/app/chat/${data.session_id}`, { replace: true });
      }
      refreshSessions();
      refreshSub();
    } catch (e) {
      const status = e.response?.status;
      const detail = e.response?.data?.detail;
      if (status === 402) {
        setMessages((m) => [
          ...m.filter((x) => x.id !== tempUser.id),
          { ...tempUser, id: `u-${Date.now()}` },
          {
            id: `paywall-${Date.now()}`, role: "assistant",
            content:
              `**Limite diário atingido.** ⚡\n\n` +
              (typeof detail === "string" ? detail : "Você atingiu o limite diário do plano Free.") +
              `\n\n👉 [Fazer upgrade pra Premium](#upgrade) e desbloquear chat ilimitado.`,
            created_at: new Date().toISOString(),
            paywall: true,
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          {
            id: `err-${Date.now()}`, role: "assistant",
            content: "**Erro:** não consegui responder agora. Tente novamente em instantes.",
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setSending(false);
    }
  };

  const newChat = () => navigate("/app/chat");

  const deleteSession = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Excluir esta conversa?")) return;
    await api.delete(`/chat/sessions/${id}`);
    refreshSessions();
    if (id === sessionId) navigate("/app/chat");
  };

  const isEmpty = !sessionId && messages.length === 0;

  return (
    <div className="flex h-screen md:h-screen overflow-hidden">
      {/* Sessions panel */}
      <div className="hidden lg:flex w-[280px] shrink-0 flex-col border-r border-[#27272A] bg-[#0F0F10]" data-testid="chat-sessions-panel">
        <div className="p-4 border-b border-[#27272A]">
          <button
            onClick={newChat}
            data-testid="new-chat-btn"
            className="w-full flex items-center justify-center gap-2 bg-[#FF4500] text-white font-bold rounded-xl px-4 py-3 hover:bg-[#E03E00] transition-all"
          >
            <Plus size={16} weight="bold" /> Nova conversa
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <div className="text-xs uppercase tracking-[0.2em] text-[#52525B] px-3 mb-2 font-bold">
            Histórico
          </div>
          {sessions.length === 0 && (
            <div className="text-xs text-[#52525B] px-3 py-2">Nenhuma conversa ainda.</div>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/app/chat/${s.id}`)}
              data-testid={`session-item-${s.id}`}
              className={`group w-full text-left flex items-start gap-2 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                s.id === sessionId
                  ? "bg-[#FF4500]/10 border border-[#FF4500]/30"
                  : "hover:bg-white/5 border border-transparent"
              }`}
            >
              <span className="text-sm flex-1 truncate">{s.title}</span>
              <Trash
                size={14}
                onClick={(e) => deleteSession(s.id, e)}
                className="opacity-0 group-hover:opacity-100 text-[#A1A1AA] hover:text-[#EF4444] transition-opacity shrink-0 mt-0.5"
                data-testid={`session-delete-${s.id}`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 min-w-0 flex flex-col bg-[#0A0A0A]">
        <div className="border-b border-[#27272A] px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#FF4500]/15 border border-[#FF4500]/30 flex items-center justify-center">
            <Robot size={18} weight="duotone" className="text-[#FF4500]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-base">MentorIA</div>
            <div className="text-xs text-[#A1A1AA]">Mentor de Marketing Digital · gpt-5.2</div>
          </div>
          {sub && sub.plan === "free" && (
            <button
              onClick={() => navigate("/app/upgrade")}
              data-testid="chat-upgrade-cta"
              className="hidden md:flex items-center gap-2 bg-[#FF4500]/10 border border-[#FF4500]/40 text-[#FF4500] hover:bg-[#FF4500]/20 rounded-full px-4 py-2 text-xs font-semibold transition-colors"
              title={`${sub.messages_remaining_today ?? 0}/${sub.free_daily_limit} mensagens restantes hoje`}
            >
              <Crown size={14} weight="fill" />
              {sub.messages_remaining_today ?? 0}/{sub.free_daily_limit} hoje · Upgrade
            </button>
          )}
          {sub && sub.plan === "premium" && (
            <div
              className="hidden md:flex items-center gap-2 bg-[#10B981]/10 border border-[#10B981]/40 text-[#10B981] rounded-full px-4 py-2 text-xs font-semibold"
              data-testid="chat-premium-badge"
            >
              <Crown size={14} weight="fill" /> Premium
            </div>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto" data-testid="chat-messages">
          {isEmpty ? (
            <EmptyState user={user} prompts={prompts} onPick={(p) => send(p)} />
          ) : (
            <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-6">
              {loadingMsgs && (
                <div className="text-center text-[#A1A1AA] text-sm">Carregando conversa...</div>
              )}
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {sending && (
                <div className="flex items-start gap-3 animate-in" data-testid="ai-typing">
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-[#FF4500]/15 border border-[#FF4500]/30 flex items-center justify-center">
                    <Robot size={16} weight="duotone" className="text-[#FF4500]" />
                  </div>
                  <div className="dot-pulse pt-3"><span /><span /><span /></div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-[#27272A] bg-[#0A0A0A] p-4">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex items-end gap-2 bg-[#141414] border border-[#27272A] rounded-2xl p-2 pl-5 focus-within:border-[#FF4500] transition-colors"
              data-testid="chat-form"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder="Pergunte ao seu mentor de marketing digital..."
                rows={1}
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-[#52525B] resize-none py-2 max-h-40"
                data-testid="chat-input"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                data-testid="chat-send-btn"
                className="bg-[#FF4500] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl w-11 h-11 flex items-center justify-center hover:bg-[#E03E00] transition-all"
              >
                <PaperPlaneTilt size={18} weight="fill" />
              </button>
            </form>
            <div className="text-[10px] text-[#52525B] mt-2 text-center uppercase tracking-[0.2em]">
              MentorIA pode errar. Use o cérebro também.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const navigate = useNavigate();
  const isUser = message.role === "user";
  if (isUser) {
    return (
      <div className="flex justify-end animate-in" data-testid={`msg-user-${message.id}`}>
        <div className="max-w-[85%] bg-[#FF4500]/10 border border-[#FF4500]/30 text-white rounded-2xl rounded-tr-sm px-5 py-3">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 animate-in" data-testid={`msg-ai-${message.id}`}>
      <div className="w-8 h-8 shrink-0 rounded-lg bg-[#FF4500]/15 border border-[#FF4500]/30 flex items-center justify-center mt-0.5">
        <Robot size={16} weight="duotone" className="text-[#FF4500]" />
      </div>
      <div className="prose-mentor flex-1 min-w-0">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children, ...rest }) => {
              if (href === "#upgrade") {
                return (
                  <a
                    {...rest}
                    href="#upgrade"
                    onClick={(e) => { e.preventDefault(); navigate("/app/upgrade"); }}
                    data-testid="paywall-upgrade-link"
                  >
                    {children}
                  </a>
                );
              }
              return <a href={href} target="_blank" rel="noreferrer" {...rest}>{children}</a>;
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
        {message.paywall && (
          <button
            onClick={() => navigate("/app/upgrade")}
            data-testid="paywall-upgrade-btn"
            className="mt-3 inline-flex items-center gap-2 bg-[#FF4500] text-white font-bold rounded-full px-5 py-2.5 hover:bg-[#E03E00] transition-all text-sm"
          >
            <Crown size={14} weight="fill" /> Fazer Upgrade
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ user, prompts, onPick }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 animate-in">
      <div className="flex items-center gap-2 text-[#FF4500] text-xs uppercase tracking-[0.3em] font-bold mb-4">
        <Lightning size={14} weight="fill" /> Mentor IA
      </div>
      <h1 className="font-display text-3xl md:text-5xl font-black tracking-tighter">
        Olá, {user?.name?.split(" ")[0] || "aluno"}.
      </h1>
      <p className="font-display text-3xl md:text-5xl font-black tracking-tighter text-[#A1A1AA]">
        Em que vou te fazer crescer hoje?
      </p>

      <div className="mt-10">
        <div className="text-xs uppercase tracking-[0.2em] text-[#52525B] mb-3 font-bold flex items-center gap-2">
          <Sparkle size={12} weight="fill" /> Comece com um prompt
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {prompts.map((p, i) => (
            <button
              key={i}
              onClick={() => onPick(p.prompt)}
              data-testid={`prompt-card-${i}`}
              className="text-left bg-[#141414] border border-[#27272A] rounded-xl p-4 hover:border-[#FF4500]/50 hover:bg-[#FF4500]/5 transition-all group"
            >
              <div className="text-xs uppercase tracking-[0.2em] text-[#FF4500] font-bold mb-1.5">
                {p.title}
              </div>
              <div className="text-sm text-[#E4E4E7] line-clamp-2">{p.prompt}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
