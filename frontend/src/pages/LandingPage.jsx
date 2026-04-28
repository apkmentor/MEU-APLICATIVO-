import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Lightning, Megaphone, Books, VideoCamera, HandCoins,
  ChartLineUp, Sparkle, ArrowRight, ChatCircleDots,
} from "@phosphor-icons/react";
import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";

const FEATURES = [
  { icon: ChatCircleDots, title: "Mentor IA 24/7", text: "Tire suas dúvidas em segundos com um mentor que pensa em PT-BR e cobra resultado." },
  { icon: ChartLineUp, title: "Trilhas do básico ao avançado", text: "Marketing, afiliação, infoprodutos e conteúdo. Roteiro pronto pra te tirar do zero." },
  { icon: Sparkle, title: "Prompts vencedores", text: "Acesse prompts prontos pra criar campanhas, copies e funis em minutos." },
  { icon: HandCoins, title: "Programa de indicação", text: "Indique amigos, ajude eles a crescerem e ganhe junto. Crescimento em rede." },
];

const TRACK_PREVIEW = [
  { icon: Megaphone, title: "Marketing Digital", color: "#FF4500" },
  { icon: HandCoins, title: "Afiliação", color: "#10B981" },
  { icon: Books, title: "Infoprodutos", color: "#F59E0B" },
  { icon: VideoCamera, title: "Conteúdo", color: "#A78BFA" },
];

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [demoText, setDemoText] = useState("");

  const goStart = () => navigate(user ? "/app/chat" : "/register");

  const handleDemo = (e) => {
    e.preventDefault();
    if (demoText.trim()) {
      sessionStorage.setItem("mentoria_pending_prompt", demoText.trim());
    }
    navigate(user ? "/app/chat" : "/register");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-40 glass" data-testid="landing-nav">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            {user ? (
              <button
                data-testid="nav-app-btn"
                onClick={() => navigate("/app/chat")}
                className="bg-[#FF4500] text-white font-semibold rounded-full px-5 py-2 hover:bg-[#E03E00] transition-all text-sm"
              >
                Entrar no App
              </button>
            ) : (
              <>
                <Link to="/login" data-testid="nav-login-btn"
                  className="text-sm text-[#A1A1AA] hover:text-white transition-colors">
                  Entrar
                </Link>
                <Link to="/register" data-testid="nav-register-btn"
                  className="bg-[#FF4500] text-white font-semibold rounded-full px-5 py-2 hover:bg-[#E03E00] transition-all text-sm">
                  Começar grátis
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1762278805150-a1bf79216b9d?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/40 via-[#0A0A0A]/80 to-[#0A0A0A]" />
        <div className="absolute inset-0 bg-grid opacity-40" />

        <div className="relative max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-28">
          <div className="max-w-3xl animate-in">
            <div className="inline-flex items-center gap-2 border border-[#FF4500]/40 bg-[#FF4500]/10 rounded-full px-4 py-1.5 mb-6">
              <Lightning weight="fill" size={14} className="text-[#FF4500]" />
              <span className="text-xs uppercase tracking-[0.2em] text-[#FF4500] font-semibold">
                Mentoria de Marketing Digital com IA
              </span>
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.95]">
              Pare de adivinhar.<br />
              <span className="text-[#FF4500]">Comece a vender.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-[#A1A1AA] max-w-2xl leading-relaxed">
              MentorIA é o seu mentor pessoal de marketing digital, afiliação, infoprodutos
              e criação de conteúdo. Do básico ao avançado — em PT-BR, com respostas
              acionáveis que geram resultado de verdade.
            </p>

            <form
              onSubmit={handleDemo}
              className="mt-10 max-w-2xl flex items-center gap-2 bg-[#141414] border border-[#27272A] rounded-full p-1.5 pl-6 focus-within:border-[#FF4500] transition-colors"
              data-testid="hero-demo-form"
            >
              <input
                value={demoText}
                onChange={(e) => setDemoText(e.target.value)}
                placeholder="Pergunte algo: como começar como afiliado em 30 dias..."
                className="flex-1 bg-transparent text-white placeholder:text-[#52525B] outline-none text-sm md:text-base"
                data-testid="hero-demo-input"
              />
              <button
                type="submit"
                data-testid="hero-demo-submit"
                className="bg-[#FF4500] text-white font-bold rounded-full px-5 md:px-6 py-3 hover:bg-[#E03E00] hover:scale-[1.03] transition-all flex items-center gap-2 shadow-[0_0_24px_rgba(255,69,0,0.35)]"
              >
                Perguntar <ArrowRight size={16} weight="bold" />
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-[#A1A1AA]">
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> Sem cartão de crédito</span>
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> Conteúdo 100% PT-BR</span>
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> Trilhas do zero ao avançado</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tracks preview */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 -mt-10 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {TRACK_PREVIEW.map((t, i) => {
            const Icon = t.icon;
            return (
              <div
                key={t.title}
                className="glass rounded-2xl p-5 hover:border-[#FF4500]/40 transition-all hover:-translate-y-1 cursor-pointer group"
                onClick={goStart}
                data-testid={`track-preview-${i}`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                  style={{ background: `${t.color}15`, border: `1px solid ${t.color}40` }}
                >
                  <Icon size={22} weight="duotone" color={t.color} />
                </div>
                <div className="font-display font-bold text-base">{t.title}</div>
                <div className="text-xs text-[#A1A1AA] uppercase tracking-[0.2em] mt-1">Trilha</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-28">
        <div className="max-w-3xl mb-14">
          <div className="text-xs uppercase tracking-[0.3em] text-[#FF4500] font-bold mb-4">// Como funciona</div>
          <h2 className="font-display text-3xl md:text-5xl font-black tracking-tighter">
            Tudo que você precisa pra <span className="text-[#FF4500]">virar a chave</span> no digital.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="bg-[#141414] border border-[#27272A] rounded-2xl p-8 hover:border-[#FF4500]/40 transition-colors group"
                data-testid={`feature-${i}`}
              >
                <Icon size={36} weight="duotone" className="text-[#FF4500] mb-4" />
                <h3 className="font-display text-xl md:text-2xl font-bold mb-2">{f.title}</h3>
                <p className="text-[#A1A1AA] leading-relaxed">{f.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 pb-28">
        <div
          className="rounded-3xl p-10 md:p-16 border border-[#FF4500]/30 relative overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse at top left, rgba(255,69,0,0.18), transparent 60%), #141414",
          }}
        >
          <div className="relative z-10 max-w-2xl">
            <h2 className="font-display text-3xl md:text-5xl font-black tracking-tighter">
              Sua primeira venda <span className="text-[#FF4500]">esperando</span> você logar.
            </h2>
            <p className="mt-5 text-[#A1A1AA] text-lg">
              Crie sua conta grátis e ganhe acesso ao mentor IA, trilhas e prompts vencedores.
            </p>
            <button
              onClick={goStart}
              data-testid="cta-start-btn"
              className="mt-8 bg-[#FF4500] text-white font-bold rounded-full px-8 py-4 hover:bg-[#E03E00] hover:scale-[1.03] transition-all flex items-center gap-2 shadow-[0_0_30px_rgba(255,69,0,0.4)] glow-primary"
            >
              Começar agora — é grátis <ArrowRight size={18} weight="bold" />
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#27272A] py-8 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <div className="text-xs text-[#A1A1AA] uppercase tracking-[0.2em]">
            © 2026 MentorIA · Feito pra você ganhar dinheiro
          </div>
        </div>
      </footer>
    </div>
  );
}
