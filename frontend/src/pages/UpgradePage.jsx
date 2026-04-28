import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Crown, Lightning, ChatCircleDots, BookOpen, ShareNetwork, CheckCircle,
  ArrowLeft, Sparkle, Spinner, XCircle, Trophy,
} from "@phosphor-icons/react";
import api, { formatApiErrorDetail } from "../lib/api";

const BENEFITS = [
  { icon: ChatCircleDots, title: "Chat ilimitado com a MentorIA", text: "Pergunte o quanto quiser. Sem limite de mensagens." },
  { icon: Lightning, title: "Modelo GPT-5.2 da OpenAI", text: "Acesso ao melhor modelo de IA do mercado, em PT-BR." },
  { icon: BookOpen, title: "Trilhas completas (do básico ao avançado)", text: "Marketing, afiliação, infoprodutos e conteúdo." },
  { icon: ShareNetwork, title: "15% de comissão recorrente", text: "Indique amigos. Ganhe 15% sobre cada assinatura mensal/anual." },
];

export default function UpgradePage() {
  const [plans, setPlans] = useState([]);
  const [sub, setSub] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("annual");
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [polling, setPolling] = useState(false);
  const [pollResult, setPollResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/subscription/plans").then((r) => setPlans(r.data.plans));
    api.get("/subscription/me").then((r) => setSub(r.data));
  }, []);

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
          api.get("/subscription/me").then((r) => setSub(r.data));
          return;
        }
        if (data.status === "expired") {
          setPolling(false);
          setPollResult("expired");
          return;
        }
        if (attempts >= 8) {
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
    const next = new URLSearchParams(params);
    next.delete("session_id");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCheckout = async (plan_id) => {
    setErrorMsg("");
    setLoadingCheckout(true);
    try {
      const { data } = await api.post("/subscription/checkout", {
        origin_url: window.location.origin,
        plan_id,
      });
      window.location.href = data.url;
    } catch (e) {
      setErrorMsg(formatApiErrorDetail(e.response?.data?.detail) || "Falha ao iniciar checkout.");
      setLoadingCheckout(false);
    }
  };

  const fmt = (v) => `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;
  const isPremium = sub?.plan === "premium";
  const canceled = params.get("canceled") === "1";

  const monthly = plans.find((p) => p.id === "monthly");
  const annual = plans.find((p) => p.id === "annual");
  const annualMonthlyEquiv = annual ? annual.amount / 12 : 0;
  const annualSavings = monthly && annual ? (monthly.amount * 12 - annual.amount).toFixed(2).replace(".", ",") : "0,00";

  return (
    <div className="px-6 md:px-12 py-10 max-w-6xl mx-auto" data-testid="upgrade-page">
      <button
        onClick={() => navigate("/app/chat")}
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
          <div className="text-xs uppercase tracking-[0.3em] text-[#FF4500] font-bold mb-1">// Planos Premium</div>
          <h1 className="font-display text-3xl md:text-5xl font-black tracking-tighter">
            Acesso <span className="text-[#FF4500]">ilimitado.</span>
          </h1>
          <p className="text-[#A1A1AA] mt-2 max-w-2xl">
            Escolha seu plano e libere o chat com a MentorIA + todas as trilhas.
          </p>
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
          <div className="text-sm text-[#E4E4E7] flex-1">
            <strong className="text-[#10B981]">Pagamento confirmado!</strong> Seu plano Premium está ativo.
          </div>
          <button
            onClick={() => navigate("/app/chat")}
            className="text-sm bg-[#10B981] text-white font-bold rounded-full px-4 py-2 hover:bg-[#0e9c70] transition-colors"
            data-testid="upgrade-go-chat-btn"
          >
            Ir pro chat →
          </button>
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

      {isPremium && (
        <div className="mt-6 bg-[#10B981]/10 border border-[#10B981]/40 rounded-xl p-5 flex items-center gap-3" data-testid="already-premium">
          <CheckCircle size={22} weight="fill" className="text-[#10B981]" />
          <div className="text-sm flex-1">
            <strong className="text-[#10B981]">Plano {sub.active_plan_id === "annual" ? "Anual" : "Mensal"} ativo.</strong>
            <span className="text-[#A1A1AA]">
              {" "}Válido até{" "}
              {sub.premium_until ? new Date(sub.premium_until).toLocaleDateString("pt-BR") : "—"}.
            </span>
          </div>
          <button
            onClick={() => navigate("/app/chat")}
            className="text-sm bg-[#FF4500] text-white font-bold rounded-full px-5 py-2 hover:bg-[#E03E00] transition-colors"
            data-testid="go-to-chat-btn"
          >
            Ir pro chat
          </button>
        </div>
      )}

      {/* Plan cards */}
      {!isPremium && (
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Monthly */}
          {monthly && (
            <PlanCard
              plan={monthly}
              selected={selectedPlan === "monthly"}
              onSelect={() => setSelectedPlan("monthly")}
              onSubscribe={() => startCheckout("monthly")}
              loading={loadingCheckout}
              testid="plan-monthly"
              priceLabel={fmt(monthly.amount)}
              periodLabel={`/${monthly.billing_period}`}
              equivalencyText={null}
            />
          )}
          {/* Annual */}
          {annual && (
            <PlanCard
              plan={annual}
              selected={selectedPlan === "annual"}
              onSelect={() => setSelectedPlan("annual")}
              onSubscribe={() => startCheckout("annual")}
              loading={loadingCheckout}
              highlight
              badge={annual.savings_label}
              testid="plan-annual"
              priceLabel={fmt(annual.amount)}
              periodLabel={`/${annual.billing_period}`}
              equivalencyText={`Equivalente a R$ ${annualMonthlyEquiv.toFixed(2).replace(".", ",")} / mês · economia de R$ ${annualSavings} no ano`}
            />
          )}
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 text-sm text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg px-3 py-2" data-testid="upgrade-error">
          {errorMsg}
        </div>
      )}

      {/* Benefits */}
      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold">O que vem incluso</h2>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={i} className="bg-[#141414] border border-[#27272A] rounded-2xl p-5 flex items-start gap-4" data-testid={`benefit-${i}`}>
                <div className="w-10 h-10 shrink-0 rounded-lg bg-[#FF4500]/15 border border-[#FF4500]/30 flex items-center justify-center">
                  <Icon size={20} weight="duotone" className="text-[#FF4500]" />
                </div>
                <div>
                  <div className="font-display font-bold">{b.title}</div>
                  <div className="text-sm text-[#A1A1AA] mt-1">{b.text}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Earn back via referral */}
      <div className="mt-10 rounded-2xl bg-[#141414] border border-[#27272A] p-8">
        <div className="flex items-start gap-3">
          <Trophy size={28} weight="duotone" className="text-[#FF4500] mt-1" />
          <div>
            <h3 className="font-display text-xl font-bold">Sua assinatura pode pagar a si mesma</h3>
            <p className="text-sm text-[#A1A1AA] mt-1 max-w-2xl">
              Indique amigos e ganhe <strong className="text-[#FF4500]">15% de comissão recorrente</strong> sobre cada assinatura
              que vier do seu link. Indique 7 amigos no plano mensal e seu plano sai de graça.
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

      <div className="mt-8 text-[10px] text-[#52525B] uppercase tracking-[0.2em] text-center">
        Pagamento processado por Stripe · Modo teste
      </div>
    </div>
  );
}

function PlanCard({ plan, selected, onSelect, onSubscribe, loading, highlight, badge, testid, priceLabel, periodLabel, equivalencyText }) {
  return (
    <div
      onClick={onSelect}
      data-testid={testid}
      className={`rounded-2xl p-7 border-2 transition-all cursor-pointer relative overflow-hidden ${
        selected
          ? "border-[#FF4500] bg-[#FF4500]/[0.04] shadow-[0_0_40px_rgba(255,69,0,0.15)]"
          : "border-[#27272A] bg-[#141414] hover:border-[#FF4500]/40"
      }`}
      style={
        highlight
          ? { background: "radial-gradient(ellipse at top right, rgba(255,69,0,0.18), transparent 60%), #141414" }
          : {}
      }
    >
      {badge && (
        <div className="absolute top-4 right-4 text-[10px] uppercase tracking-[0.2em] font-bold bg-[#FF4500] text-white px-2.5 py-1 rounded-full">
          {badge}
        </div>
      )}
      <div className="flex items-center gap-2 mb-2">
        <Crown size={18} weight="duotone" className={selected ? "text-[#FF4500]" : "text-[#A1A1AA]"} />
        <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA]">
          {plan.label}
        </div>
      </div>
      <div className="font-display text-3xl md:text-4xl font-black tracking-tighter">
        {plan.name}
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-display text-5xl font-black tracking-tighter">{priceLabel}</span>
        <span className="text-[#A1A1AA] text-sm">{periodLabel}</span>
      </div>
      {equivalencyText && (
        <div className="text-xs text-[#10B981] mt-1 flex items-center gap-1.5">
          <Sparkle size={12} weight="fill" /> {equivalencyText}
        </div>
      )}
      <p className="text-sm text-[#A1A1AA] mt-3 leading-relaxed">{plan.description}</p>

      <button
        onClick={(e) => { e.stopPropagation(); onSubscribe(); }}
        disabled={loading}
        data-testid={`${testid}-subscribe-btn`}
        className={`mt-6 w-full font-bold rounded-xl px-6 py-3.5 hover:scale-[1.01] transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
          highlight
            ? "bg-[#FF4500] text-white hover:bg-[#E03E00] shadow-[0_0_24px_rgba(255,69,0,0.35)]"
            : "bg-white text-[#0A0A0A] hover:bg-[#E4E4E7]"
        }`}
      >
        {loading ? (
          <><Spinner size={16} className="animate-spin" /> Abrindo checkout...</>
        ) : (
          <>Assinar {plan.label} →</>
        )}
      </button>
    </div>
  );
}
