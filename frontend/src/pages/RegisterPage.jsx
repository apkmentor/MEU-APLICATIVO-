import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowRight, Envelope, Lock, User, Gift } from "@phosphor-icons/react";
import { useAuth } from "../context/AuthContext";
import { formatApiErrorDetail } from "../lib/api";
import Logo from "../components/Logo";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ref = params.get("ref");
    if (ref) setReferredBy(ref.toUpperCase());
  }, [params]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await register({ name, email, password, referred_by: referredBy.trim() || null });
      navigate("/app/upgrade", { replace: true });
    } catch (e) {
      setErr(formatApiErrorDetail(e.response?.data?.detail) || "Falha ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-6 relative overflow-hidden py-10">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#FF4500]/15 blur-[120px]" />

      <div className="w-full max-w-md relative z-10 animate-in">
        <div className="flex justify-center mb-8">
          <Link to="/"><Logo size="lg" /></Link>
        </div>

        <div className="bg-[#141414] border border-[#27272A] rounded-2xl p-8">
          <h1 className="font-display text-3xl font-black tracking-tight">Crie sua conta</h1>
          <p className="text-[#A1A1AA] mt-2 text-sm">Cadastre-se em segundos e escolha seu plano para liberar o chat.</p>

          <form onSubmit={submit} className="mt-7 space-y-4" data-testid="register-form">
            <Field icon={User} label="Nome" testid="register-name-input" value={name} onChange={setName} placeholder="Seu nome" />
            <Field icon={Envelope} type="email" label="Email" testid="register-email-input" value={email} onChange={setEmail} placeholder="voce@email.com" />
            <Field icon={Lock} type="password" label="Senha (mín. 6 caracteres)" testid="register-password-input" value={password} onChange={setPassword} placeholder="••••••••" min={6} />
            <Field icon={Gift} label="Código de indicação (opcional)" testid="register-referral-input" value={referredBy} onChange={(v) => setReferredBy(v.toUpperCase())} placeholder="Cole o código aqui" required={false} />

            {err && (
              <div data-testid="register-error" className="text-sm text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg px-3 py-2">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid="register-submit-btn"
              className="w-full bg-[#FF4500] text-white font-bold rounded-xl px-6 py-3.5 hover:bg-[#E03E00] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "Criando..." : <>Criar conta <ArrowRight size={16} weight="bold" /></>}
            </button>
          </form>

          <div className="mt-6 text-sm text-[#A1A1AA] text-center">
            Já tem conta?{" "}
            <Link to="/login" data-testid="goto-login" className="text-[#FF4500] font-semibold hover:underline">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, type = "text", label, testid, value, onChange, placeholder, required = true, min }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-[0.2em] text-[#A1A1AA] font-semibold">{label}</label>
      <div className="mt-2 flex items-center gap-2 bg-[#0A0A0A] border border-[#27272A] rounded-xl px-4 py-3 focus-within:border-[#FF4500] transition-colors">
        <Icon size={18} className="text-[#52525B]" />
        <input
          type={type}
          required={required}
          minLength={min}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm"
          data-testid={testid}
        />
      </div>
    </div>
  );
}
