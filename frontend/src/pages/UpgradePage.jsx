import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Crown, Lightning, ChatCircleDots, BookOpen, ShareNetwork, CheckCircle,
  ArrowLeft, Sparkle, Spinner, XCircle,
} from "@phosphor-icons/react";
import api, { formatApiErrorDetail } from "../lib/api";

const BENEFITS = [
  { icon: ChatCircleDots, title: "Mensagens ilimitadas", text: "Converse o quanto quiser com o MentorIA. Sem limite diário." },
  { icon: Lightning, title: "Respostas com GPT-5.2", text: "Acesso ao modelo mais avançado da OpenAI, em PT-BR." },
  { icon: BookOpen, title: "Trilhas completas", text: "Todas as lições do básico ao avançado, sempre que precisar." },
  { icon: ShareNetwork, title: "15% de comissão recorrente", text: "Cada amigo seu que assinar, te paga comissão todo mês." },
];

export default function UpgradePage() {
  const [plan, setPlan] = useState(null);
  const [sub, setSub] = useState(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [polling, setPolling] = useState(false);
  const [pollResult, setPollResult] = useState(null); // 'paid' | 'expired' | null
  const [errorMsg, setErrorMsg] = useState("");
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/subscription/plan").then((r) => setPlan(r.data));
    api.get("/subscription/me").then((r) => setSub(r.data));
  }, []);

  // Poll on return from Stripe
  useEffect(() => {
    const sid = params.get("session_id");
    if (!sid) return;
    setPolling(true);
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const { data } = await api.get(`/subscription/checkout/status/${sid}`);
        if (data.payment_status === "paid") {
          setPolling(false);
          setPollResult("paid");
          // refresh subscription
          api.get("/subscription/me").then((r) => setSub(r.data));
          return;
        }
        if (data.status === "expired") {
          setPolling(false);
          setPollResult("expired");
          return;
        }
        if (attempts >= 6) {
          setPolling(false);
          setPollResult("timeout");
          return;
        }
        setTimeout(poll, 2000);
      } catch {
        setPolling(false);
        setPollResult("error");
      }
    };
    poll();
    // remove session_id from url
    const next = new URLSearchParams(params);
    next.delete("session_id");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCheckout = async () => {
    setErrorMsg("");
    setLoadingCheckout(true);
    try {
      const { data } = await api.post("/subscription/checkout", {
        origin_url: window.location.origin,
      });
      window.location.href = data.url;
    } catch (e) {
      setErrorMsg(formatApiErrorDetail(e.response?.data?.detail) || "Falha ao iniciar checkout.");
      setLoadingCheckout(false);
    }
  };

  const isPremium = sub?.plan === "premium";
  const canceled = params.get("canceled") === "1";

  return (
    <div className="px-6 md:px-12 py-10 max-w-5xl mx-auto" data-testid="upgrade-page">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-[#A1A1AA] hover:text-white mb-6"
        data-testid="upgrade-back-btn"
      >
        <ArrowLeft size={14} /> Voltar
      </button>

      <div className="flex items-start gap-3 flex-wrap">
        <div className="w-12 h-12 rounded-xl bg-[#FF4500]/15 border border-[#FF4500]/40 flex items-center justify-center">
          <Crown size={24} weight="duotone" className="text-[#FF4500]" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-[#FF4500] font-bold mb-1">// Plano Premium</div>
          <h1 className="font-display text-3xl md:text-5xl font-black tracking-tighter">
            Acesso <span className="text-[#FF4500]">ilimitado.</span>
          </h1>
        </div>
      </div>

      {/* Status banners */}
      {polling && (
        <div className="mt-6 flex items-center gap-3 bg-[#141414] border border-[#27272A] rounded-xl p-4" data-testid="upgrade-polling">
          <Spinner size={18} className="text-[#FF4500] animate-spin" />
          <div className="text-sm text-[#E4E4E7]">Confirmando seu pagamento... aguarde.</div>
        </div>
      )}
      {pollResult === "paid" && (
        <div className="mt-6 flex items-center gap-3 bg-[#10B981]/10 border border-[#10B981]/40 rounded-xl p-4" data-testid="upgrade-success">
          <CheckCircle size={20} weight="fill" className="text-[#10B981]" />
          <div className="text-sm text-[#E4E4E7]">
            <strong className="text-[#10B981]">Pagamento confirmado!</strong> Seu plano Premium está ativo.
          </div>
        </div>
      )}
      {(pollResult === "expired" || pollResult === "error" || pollResult === "timeout") && (
        <div className="mt-6 flex items-center gap-3 bg-[#EF4444]/10 border border-[#EF4444]/40 rounded-xl p-4" data-testid="upgrade-failed">
          <XCircle size={20} weight="fill" className="text-[#EF4444]" />
          <div className="text-sm text-[#E4E4E7]">Não conseguimos confirmar seu pagamento. Tente novamente.</div>
        </div>
      )}
      {canceled && !pollResult && (
        <div className="mt-6 text-sm text-[#A1A1AA] bg-[#141414] border border-[#27272A] rounded-xl p-4" data-testid="upgrade-canceled">
          Pagamento cancelado. Você pode tentar de novo quando quiser.
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Plan card */}
        <div
          className="lg:col-span-3 rounded-2xl p-8 border border-[#FF4500]/30 relative overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at top right, rgba(255,69,0,0.18), transparent 60%), #141414",
          }}
        >
          <div className="text-xs uppercase tracking-[0.2em] text-[#FF4500] font-bold flex items-center gap-2">
            <Sparkle size={12} weight="fill" /> Recomendado
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-5xl md:text-6xl font-black tracking-tighter">
              R$ {plan ? plan.amount.toFixed(2).replace(".", ",") : "—"}
            </span>
            <span className="text-[#A1A1AA] text-sm">/mês</span>
          </div>
          <div className="text-sm text-[#A1A1AA] mt-1">
            Renove a cada 30 dias. Cancele quando quiser.
          </div>

          <div className="mt-6 space-y-3">
            {BENEFITS.map((b, i) => {
              const Icon = b.icon;
              return (
                <div key={i} className="flex items-start gap-3" data-testid={`benefit-${i}`}>
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-[#FF4500]/15 border border-[#FF4500]/30 flex items-center justify-center">
                    <Icon size={16} weight="duotone" className="text-[#FF4500]" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{b.title}</div>
                    <div className="text-sm text-[#A1A1AA]">{b.text}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {isPremium ? (
            <div className="mt-7 bg-[#10B981]/10 border border-[#10B981]/40 rounded-xl p-4 flex items-center gap-3" data-testid="already-premium">
              <CheckCircle size={20} weight="fill" className="text-[#10B981]" />
              <div className="text-sm">
                <strong className="text-[#10B981]">Plano ativo.</strong>
                <span className="text-[#A1A1AA]">
                  {" "}Válido até{" "}
                  {sub.premium_until
                    ? new Date(sub.premium_until).toLocaleDateString("pt-BR")
                    : "—"}
                  .
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={startCheckout}
              disabled={loadingCheckout}
              data-testid="upgrade-checkout-btn"
              className="mt-7 w-full bg-[#FF4500] text-white font-bold rounded-xl px-6 py-4 hover:bg-[#E03E00] hover:scale-[1.01] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,69,0,0.4)]"
            >
              {loadingCheckout ? (
                <><Spinner size={18} className="animate-spin" /> Abrindo checkout...</>
              ) : (
                <><Crown size={18} weight="fill" /> Assinar agora — R$ {plan ? plan.amount.toFixed(2).replace(".", ",") : "—"}</>
              )}
            </button>
          )}

          {errorMsg && (
            <div className="mt-3 text-sm text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg px-3 py-2" data-testid="upgrade-error">
              {errorMsg}
            </div>
          )}

          <div className="mt-3 text-[10px] text-[#52525B] uppercase tracking-[0.2em] text-center">
            Pagamento processado por Stripe · Modo teste
          </div>
        </div>

        {/* Free vs Premium */}
        <div className="lg:col-span-2 rounded-2xl border border-[#27272A] p-7 bg-[#141414]">
          <h3 className="font-display text-lg font-bold">Free vs Premium</h3>
          <div className="mt-4 space-y-3 text-sm">
            <Compare label="Mensagens diárias" free={`${plan?.free_daily_limit || 5}/dia`} premium="Ilimitadas" />
            <Compare label="Modelo de IA" free="GPT-5.2" premium="GPT-5.2" />
            <Compare label="Trilhas de aprendizado" free="Acesso completo" premium="Acesso completo" />
            <Compare label="Histórico de conversas" free="Sim" premium="Sim" />
            <Compare label="Comissão de indicação" free="Sim" premium="Sim" />
          </div>
        </div>
      </div>

      {/* Earn back via referral */}
      <div className="mt-10 rounded-2xl bg-[#141414] border border-[#27272A] p-8">
        <div className="flex items-start gap-3">
          <ShareNetwork size={28} weight="duotone" className="text-[#FF4500] mt-1" />
          <div>
            <h3 className="font-display text-xl font-bold">Indique e ganhe 15% recorrente</h3>
            <p className="text-sm text-[#A1A1AA] mt-1 max-w-2xl">
              Cada amigo que assinar com seu código te paga comissão recorrente todo mês enquanto ele
              for assinante. Indique 7 amigos e seu plano sai de graça.
            </p>
            <button
              onClick={() => navigate("/app/indicar")}
              className="mt-4 text-sm font-semibold text-[#FF4500] hover:underline flex items-center gap-1"
              data-testid="upgrade-go-referral-btn"
            >
              Ver meu programa de indicação →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Compare({ label, free, premium }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.2em] text-[#52525B] font-bold mb-1">{label}</div>
      <div className="flex justify-between gap-3 text-sm">
        <span className="text-[#A1A1AA]">{free}</span>
        <span className="text-[#FF4500] font-semibold">{premium}</span>
      </div>
    </div>
  );
}
