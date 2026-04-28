import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { ArrowRight, Envelope, Lock } from "@phosphor-icons/react";
import { useAuth } from "../context/AuthContext";
import { formatApiErrorDetail } from "../lib/api";
import Logo from "../components/Logo";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      const redirect = location.state?.from || "/app/chat";
      navigate(redirect, { replace: true });
    } catch (e) {
      setErr(formatApiErrorDetail(e.response?.data?.detail) || "Falha ao entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#FF4500]/15 blur-[120px]" />

      <div className="w-full max-w-md relative z-10 animate-in">
        <div className="flex justify-center mb-8">
          <Link to="/"><Logo size="lg" /></Link>
        </div>

        <div className="bg-[#141414] border border-[#27272A] rounded-2xl p-8">
          <h1 className="font-display text-3xl font-black tracking-tight">Bem-vindo de volta</h1>
          <p className="text-[#A1A1AA] mt-2 text-sm">Entre pra continuar sua mentoria.</p>

          <form onSubmit={submit} className="mt-7 space-y-4" data-testid="login-form">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-[#A1A1AA] font-semibold">Email</label>
              <div className="mt-2 flex items-center gap-2 bg-[#0A0A0A] border border-[#27272A] rounded-xl px-4 py-3 focus-within:border-[#FF4500] transition-colors">
                <Envelope size={18} className="text-[#52525B]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  className="flex-1 bg-transparent outline-none text-sm"
                  data-testid="login-email-input"
                />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-[#A1A1AA] font-semibold">Senha</label>
              <div className="mt-2 flex items-center gap-2 bg-[#0A0A0A] border border-[#27272A] rounded-xl px-4 py-3 focus-within:border-[#FF4500] transition-colors">
                <Lock size={18} className="text-[#52525B]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent outline-none text-sm"
                  data-testid="login-password-input"
                />
              </div>
            </div>

            {err && (
              <div data-testid="login-error" className="text-sm text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg px-3 py-2">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit-btn"
              className="w-full bg-[#FF4500] text-white font-bold rounded-xl px-6 py-3.5 hover:bg-[#E03E00] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "Entrando..." : <>Entrar <ArrowRight size={16} weight="bold" /></>}
            </button>
          </form>

          <div className="mt-6 text-sm text-[#A1A1AA] text-center">
            Ainda não tem conta?{" "}
            <Link to="/register" data-testid="goto-register" className="text-[#FF4500] font-semibold hover:underline">
              Criar conta
            </Link>
          </div>
        </div>

        <div className="mt-6 text-xs text-[#52525B] text-center">
          Conta de teste: <span className="text-[#A1A1AA]">teste@mentoria.com</span> /{" "}
          <span className="text-[#A1A1AA]">Teste@1234</span>
        </div>
      </div>
    </div>
  );
}
