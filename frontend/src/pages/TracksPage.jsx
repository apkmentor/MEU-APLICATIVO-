import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Megaphone, Books, VideoCamera, HandCoins, ArrowRight, ArrowLeft, Sparkle,
} from "@phosphor-icons/react";
import api from "../lib/api";

const ICON_MAP = { Megaphone, Books, VideoCamera, HandCoins };
const LEVEL_COLORS = {
  "Básico": "#10B981",
  "Intermediário": "#F59E0B",
  "Avançado": "#EF4444",
};

export function TracksPage() {
  const [tracks, setTracks] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/tracks").then((r) => setTracks(r.data));
  }, []);

  return (
    <div className="px-6 md:px-12 py-10 max-w-6xl mx-auto" data-testid="tracks-page">
      <div className="text-xs uppercase tracking-[0.3em] text-[#FF4500] font-bold mb-3">
        // Trilhas de Aprendizado
      </div>
      <h1 className="font-display text-3xl md:text-5xl font-black tracking-tighter">
        Do <span className="text-[#FF4500]">básico ao avançado.</span>
      </h1>
      <p className="text-[#A1A1AA] mt-3 max-w-2xl">
        Trilhas estruturadas em 4 áreas. Cada lição abre uma conversa direta com o MentorIA.
      </p>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
        {tracks.map((t, i) => {
          const Icon = ICON_MAP[t.icon] || Megaphone;
          return (
            <div
              key={t.id}
              data-testid={`track-card-${t.id}`}
              onClick={() => navigate(`/app/trilhas/${t.id}`)}
              className="relative cursor-pointer rounded-2xl overflow-hidden border border-[#27272A] hover:border-[#FF4500]/50 transition-all group bg-[#141414] animate-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="aspect-[16/9] relative">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${t.image}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/60 to-transparent" />
                <div
                  className="absolute top-4 left-4 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: `${t.color}25`, border: `1px solid ${t.color}55`, backdropFilter: "blur(10px)" }}
                >
                  <Icon size={24} weight="duotone" color={t.color} />
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-display text-xl font-bold">{t.title}</h3>
                <p className="text-sm text-[#A1A1AA] mt-1">{t.subtitle}</p>
                <div className="flex items-center justify-between mt-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#52525B]">
                    {t.lessons.length} lições
                  </div>
                  <div className="flex items-center gap-1 text-sm text-[#FF4500] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    Abrir <ArrowRight size={14} weight="bold" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TrackDetailPage() {
  const { trackId } = useParams();
  const navigate = useNavigate();
  const [track, setTrack] = useState(null);

  useEffect(() => {
    api.get(`/tracks/${trackId}`).then((r) => setTrack(r.data)).catch(() => navigate("/app/trilhas"));
  }, [trackId, navigate]);

  const startLesson = async (lesson) => {
    sessionStorage.setItem("mentoria_pending_prompt", lesson.prompt);
    try {
      const { data } = await api.post("/chat/message", { content: lesson.prompt });
      sessionStorage.removeItem("mentoria_pending_prompt");
      navigate(`/app/chat/${data.session_id}`);
    } catch (e) {
      sessionStorage.removeItem("mentoria_pending_prompt");
      if (e.response?.status === 402) {
        navigate("/app/upgrade");
      } else {
        navigate("/app/chat");
      }
    }
  };

  if (!track) return <div className="p-12 text-[#A1A1AA]">Carregando trilha...</div>;
  const Icon = ICON_MAP[track.icon] || Megaphone;

  return (
    <div className="px-6 md:px-12 py-10 max-w-5xl mx-auto" data-testid="track-detail">
      <button
        onClick={() => navigate("/app/trilhas")}
        data-testid="back-to-tracks"
        className="flex items-center gap-2 text-sm text-[#A1A1AA] hover:text-white mb-6"
      >
        <ArrowLeft size={14} /> Todas as trilhas
      </button>

      <div className="flex items-start gap-5">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: `${track.color}20`, border: `1px solid ${track.color}55` }}
        >
          <Icon size={32} weight="duotone" color={track.color} />
        </div>
        <div>
          <h1 className="font-display text-3xl md:text-5xl font-black tracking-tighter">{track.title}</h1>
          <p className="text-[#A1A1AA] mt-2">{track.subtitle}</p>
        </div>
      </div>

      <div className="mt-10 space-y-3">
        {track.lessons.map((lesson, idx) => (
          <button
            key={idx}
            onClick={() => startLesson(lesson)}
            data-testid={`lesson-${idx}`}
            className="w-full text-left bg-[#141414] border border-[#27272A] rounded-xl p-5 hover:border-[#FF4500]/40 transition-all group flex items-start gap-5"
          >
            <div className="font-display text-3xl font-black text-[#27272A] group-hover:text-[#FF4500] transition-colors w-12 shrink-0">
              {String(idx + 1).padStart(2, "0")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span
                  className="text-[10px] uppercase tracking-[0.2em] font-bold px-2 py-0.5 rounded-full"
                  style={{ color: LEVEL_COLORS[lesson.level], background: `${LEVEL_COLORS[lesson.level]}15`, border: `1px solid ${LEVEL_COLORS[lesson.level]}40` }}
                >
                  {lesson.level}
                </span>
              </div>
              <h3 className="font-display text-lg md:text-xl font-bold">{lesson.title}</h3>
              <p className="text-sm text-[#A1A1AA] mt-1">{lesson.summary}</p>
            </div>
            <div className="hidden md:flex shrink-0 self-center w-10 h-10 rounded-full bg-[#FF4500]/0 group-hover:bg-[#FF4500] items-center justify-center transition-colors">
              <Sparkle size={16} weight="fill" className="text-[#FF4500] group-hover:text-white transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
