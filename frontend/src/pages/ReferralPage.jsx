import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, ShareNetwork, Users, Gift, WhatsappLogo, CheckCircle, Coins, Crown } from "@phosphor-icons/react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function ReferralPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    referral_code: "",
    total_referred: 0,
    commission_rate: 0.15,
    total_earned: 0,
    pending: 0,
    paid: 0,
    currency: "brl",
    commissions: [],
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get("/referral/me").then((r) => setStats(r.data));
  }, []);

  const link = `${window.location.origin}/register?ref=${stats.referral_code}`;
  const fmt = (v) => `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;
  const ratePct = `${Math.round((stats.commission_rate || 0.15) * 100)}%`;

  const copy = async (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
    } catch {
      // ignore clipboard rejection (e.g. permission denied in iframe)
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(
      `Tô usando o MentorIA — uma mentoria de marketing digital com IA que tá me ajudando muito. ` +
      `Cria sua conta com meu código ${stats.referral_code} e bora crescer juntos: ${link}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  // unused-var safeguards
  void ShareNetwork;
  void Crown;

  return (
    <div className="px-6 md:px-12 py-10 max-w-5xl mx-auto" data-testid="referral-page">
      <div className="text-xs uppercase tracking-[0.3em] text-[#FF4500] font-bold mb-3">
        // Programa de Indicação
      </div>
      <h1 className="font-display text-3xl md:text-5xl font-black tracking-tighter">
        Indique. Cresça. <span className="text-[#FF4500]">Em rede.</span>
      </h1>
      <p className="text-[#A1A1AA] mt-3 max-w-2xl">
        Compartilhe seu código com amigos e ajude eles a crescerem no digital. Quanto mais
        gente vencendo com a gente, mais forte fica a sua rede.
      </p>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          icon={Gift}
          label="Seu código"
          value={stats.referral_code || "—"}
          accent="#FF4500"
          testid="stat-code"
        />
        <StatCard
          icon={Users}
          label="Indicados"
          value={stats.total_referred}
          accent="#10B981"
          testid="stat-count"
        />
        <StatCard
          icon={ShareNetwork}
          label="Status"
          value={stats.total_referred === 0 ? "Comece já" : "Crescendo"}
          accent="#A78BFA"
          testid="stat-status"
        />
      </div>

      {/* Link card */}
      <div className="mt-8 bg-[#141414] border border-[#27272A] rounded-2xl p-6 md:p-8">
        <h2 className="font-display text-xl font-bold">Seu link de indicação</h2>
        <p className="text-sm text-[#A1A1AA] mt-1">Quem se cadastrar por esse link entra como seu indicado.</p>

        <div className="mt-5 flex items-stretch gap-2 bg-[#0A0A0A] border border-[#27272A] rounded-xl p-2 pl-4">
          <div className="flex-1 min-w-0 self-center text-sm text-[#E4E4E7] truncate" data-testid="referral-link">
            {link}
          </div>
          <button
            onClick={() => copy(link)}
            data-testid="copy-link-btn"
            className="bg-[#FF4500] text-white font-bold rounded-lg px-4 py-2.5 hover:bg-[#E03E00] transition-all flex items-center gap-2 text-sm"
          >
            {copied ? <CheckCircle size={16} weight="fill" /> : <Copy size={16} weight="bold" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => copy(stats.referral_code)}
            data-testid="copy-code-btn"
            className="text-sm border border-[#27272A] hover:border-[#FF4500]/40 rounded-full px-4 py-2 flex items-center gap-2 text-[#E4E4E7] hover:text-white transition-colors"
          >
            <Copy size={14} /> Copiar só o código
          </button>
          <button
            onClick={shareWhatsApp}
            data-testid="share-whatsapp-btn"
            className="text-sm bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] hover:bg-[#10B981]/25 rounded-full px-4 py-2 flex items-center gap-2 transition-colors"
          >
            <WhatsappLogo size={14} weight="fill" /> Compartilhar no WhatsApp
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { n: "01", title: "Compartilhe seu link", text: "Envie pra amigos, redes sociais ou seu nicho." },
          { n: "02", title: "Eles assinam o Premium", text: "Quem assina pelo seu link te paga comissão automática." },
          { n: "03", title: `Você ganha ${ratePct} todo mês`, text: "Comissão recorrente enquanto seu indicado for assinante." },
        ].map((s) => (
          <div key={s.n} className="bg-[#141414] border border-[#27272A] rounded-2xl p-6">
            <div className="font-display text-3xl font-black text-[#FF4500]">{s.n}</div>
            <h3 className="font-display text-lg font-bold mt-2">{s.title}</h3>
            <p className="text-sm text-[#A1A1AA] mt-1">{s.text}</p>
          </div>
        ))}
      </div>

      {/* Commission history */}
      <div className="mt-10">
        <h2 className="font-display text-xl font-bold mb-4">Histórico de comissões</h2>
        {stats.commissions && stats.commissions.length > 0 ? (
          <div className="bg-[#141414] border border-[#27272A] rounded-2xl overflow-hidden" data-testid="commissions-list">
            <div className="grid grid-cols-12 px-5 py-3 border-b border-[#27272A] text-xs uppercase tracking-[0.2em] text-[#52525B] font-bold">
              <div className="col-span-5">Indicado</div>
              <div className="col-span-3">Data</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Valor</div>
            </div>
            {stats.commissions.map((c) => (
              <div key={c.id} className="grid grid-cols-12 px-5 py-3 border-b border-[#27272A] text-sm last:border-0">
                <div className="col-span-5 truncate">
                  <div className="font-semibold">{c.payer_name || c.payer_email}</div>
                  <div className="text-xs text-[#52525B] truncate">{c.payer_email}</div>
                </div>
                <div className="col-span-3 text-[#A1A1AA] self-center">
                  {new Date(c.created_at).toLocaleDateString("pt-BR")}
                </div>
                <div className="col-span-2 self-center">
                  <span className={`text-[10px] uppercase tracking-[0.2em] font-bold px-2 py-1 rounded-full ${
                    c.status === "paid_out"
                      ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/40"
                      : "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/40"
                  }`}>
                    {c.status === "paid_out" ? "Pago" : "A receber"}
                  </span>
                </div>
                <div className="col-span-2 text-right self-center font-bold text-[#FF4500]">
                  {fmt(c.amount)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#141414] border border-[#27272A] rounded-2xl p-8 text-center" data-testid="no-commissions">
            <Coins size={32} weight="duotone" className="text-[#52525B] mx-auto mb-3" />
            <div className="text-[#A1A1AA] text-sm">
              Sem comissões ainda. Compartilhe seu link e comece a ganhar.
            </div>
            <button
              onClick={() => navigate("/app/upgrade")}
              data-testid="referral-upgrade-cta"
              className="mt-4 text-[#FF4500] hover:underline text-sm font-semibold"
            >
              Ver plano Premium →
            </button>
          </div>
        )}
      </div>

      <div className="mt-10 text-xs text-[#52525B]">
        Logado como <span className="text-[#A1A1AA]">{user?.email}</span>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent, testid }) {
  return (
    <div
      className="bg-[#141414] border border-[#27272A] rounded-2xl p-6 hover:border-[#FF4500]/30 transition-colors"
      data-testid={testid}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: `${accent}15`, border: `1px solid ${accent}40` }}
      >
        <Icon size={20} weight="duotone" color={accent} />
      </div>
      <div className="text-xs uppercase tracking-[0.2em] text-[#A1A1AA] font-bold">{label}</div>
      <div className="font-display text-2xl md:text-3xl font-black tracking-tight mt-1">
        {value}
      </div>
    </div>
  );
}
