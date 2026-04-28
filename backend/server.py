from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import secrets
import string
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from emergentintegrations.llm.chat import LlmChat, UserMessage


# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']

app = FastAPI(title="MentorIA - Mentoria de Marketing Digital")
api = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def gen_referral_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(8))


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if not creds or not creds.credentials:
        raise HTTPException(401, "Não autenticado")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Token inválido")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "Usuário não encontrado")
    return user


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    referred_by: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    referral_code: str
    referred_by: Optional[str] = None


class AuthOut(BaseModel):
    access_token: str
    user: UserOut


class ChatMessageIn(BaseModel):
    session_id: Optional[str] = None
    content: str


class ChatMessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: str


class ChatSessionOut(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str


class SendMessageOut(BaseModel):
    session_id: str
    user_message: ChatMessageOut
    ai_message: ChatMessageOut


# ---------------------------------------------------------------------------
# AI Mentor System Prompt (PT-BR)
# ---------------------------------------------------------------------------
MENTOR_SYSTEM_PROMPT = """Você é o **MentorIA**, um mentor de marketing digital de elite, falando em **Português do Brasil**.

🎯 SUA MISSÃO:
Ensinar, orientar e fazer o aluno crescer em:
- Marketing Digital (estratégia, tráfego pago, SEO, copywriting, funis)
- Marketing de Afiliação (escolha de produtos, escala, conversão)
- Criação de Infoprodutos (ideação, validação, lançamento, perpétuo)
- Criação de Conteúdo (Instagram, TikTok, YouTube, storytelling, roteiros)

📐 ESTILO DE RESPOSTA:
1. Direto, prático e sem enrolação - como um mentor que cobra resultado.
2. Use **markdown** rico: títulos com `##`, listas, **negrito** em pontos-chave, blocos de código quando útil.
3. Sempre forneça **exemplos reais** e **passos acionáveis** (faça hoje, esta semana, este mês).
4. Adapte do **básico ao avançado** conforme o nível do aluno.
5. Termine respostas longas com um **"Próximo Passo"** claro.
6. Quando fizer sentido, sugira métricas e KPIs para acompanhar.
7. Motive o aluno: este app deve mudar a vida dele financeiramente.

⚠️ NUNCA:
- Dê conselhos financeiros vazios ou genéricos.
- Prometa ganhos garantidos.
- Use jargão sem explicar.

Comece toda nova conversa entendendo o contexto do aluno (nicho, nível, meta) se ainda não souber.
"""


# ---------------------------------------------------------------------------
# Auth Endpoints
# ---------------------------------------------------------------------------
@api.post("/auth/register", response_model=AuthOut)
async def register(data: RegisterIn):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Este email já está cadastrado")

    referred_by_code = None
    if data.referred_by:
        ref_user = await db.users.find_one({"referral_code": data.referred_by.upper()})
        if ref_user:
            referred_by_code = data.referred_by.upper()

    user_id = str(uuid.uuid4())
    referral_code = gen_referral_code()
    while await db.users.find_one({"referral_code": referral_code}):
        referral_code = gen_referral_code()

    doc = {
        "id": user_id,
        "name": data.name.strip(),
        "email": email,
        "password_hash": hash_password(data.password),
        "referral_code": referral_code,
        "referred_by": referred_by_code,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)

    user_out = UserOut(id=user_id, name=doc["name"], email=email,
                      referral_code=referral_code, referred_by=referred_by_code)
    return AuthOut(access_token=create_access_token(user_id), user=user_out)


@api.post("/auth/login", response_model=AuthOut)
async def login(data: LoginIn):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Email ou senha inválidos")
    user_out = UserOut(id=user["id"], name=user["name"], email=user["email"],
                      referral_code=user["referral_code"], referred_by=user.get("referred_by"))
    return AuthOut(access_token=create_access_token(user["id"]), user=user_out)


@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(id=user["id"], name=user["name"], email=user["email"],
                   referral_code=user["referral_code"], referred_by=user.get("referred_by"))


# ---------------------------------------------------------------------------
# Chat Endpoints
# ---------------------------------------------------------------------------
@api.get("/chat/sessions", response_model=List[ChatSessionOut])
async def list_sessions(user: dict = Depends(get_current_user)):
    cursor = db.chat_sessions.find({"user_id": user["id"]}, {"_id": 0}).sort("updated_at", -1)
    items = await cursor.to_list(200)
    return [ChatSessionOut(id=i["id"], title=i["title"],
                           created_at=i["created_at"], updated_at=i["updated_at"]) for i in items]


@api.get("/chat/sessions/{session_id}/messages", response_model=List[ChatMessageOut])
async def get_session_messages(session_id: str, user: dict = Depends(get_current_user)):
    sess = await db.chat_sessions.find_one({"id": session_id, "user_id": user["id"]}, {"_id": 0})
    if not sess:
        raise HTTPException(404, "Conversa não encontrada")
    msgs = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return [ChatMessageOut(id=m["id"], role=m["role"], content=m["content"], created_at=m["created_at"]) for m in msgs]


@api.delete("/chat/sessions/{session_id}")
async def delete_session(session_id: str, user: dict = Depends(get_current_user)):
    res = await db.chat_sessions.delete_one({"id": session_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Conversa não encontrada")
    await db.chat_messages.delete_many({"session_id": session_id})
    return {"ok": True}


@api.post("/chat/message", response_model=SendMessageOut)
async def send_chat_message(data: ChatMessageIn, user: dict = Depends(get_current_user)):
    if not data.content.strip():
        raise HTTPException(400, "Mensagem vazia")

    now = datetime.now(timezone.utc).isoformat()
    session_id = data.session_id

    # Create session if needed
    if not session_id:
        session_id = str(uuid.uuid4())
        title = data.content.strip()[:60]
        await db.chat_sessions.insert_one({
            "id": session_id, "user_id": user["id"], "title": title,
            "created_at": now, "updated_at": now,
        })
    else:
        sess = await db.chat_sessions.find_one({"id": session_id, "user_id": user["id"]})
        if not sess:
            raise HTTPException(404, "Conversa não encontrada")

    # Persist user message
    user_msg = {
        "id": str(uuid.uuid4()), "session_id": session_id, "role": "user",
        "content": data.content, "created_at": now,
    }
    await db.chat_messages.insert_one(dict(user_msg))

    # Build chat with full history (multi-turn)
    history = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(200)

    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id,
                   system_message=MENTOR_SYSTEM_PROMPT).with_model("openai", "gpt-5.2")

    # Replay history into LlmChat by sending only the last user message; LlmChat keeps history per session_id
    # but since we instantiate a new LlmChat each request, we send the newest user message and inject prior
    # context inline using a brief recap when history > 1.
    try:
        if len(history) <= 1:
            ai_text = await chat.send_message(UserMessage(text=data.content))
        else:
            prior = history[:-1][-10:]  # last 10 turns
            recap_lines = []
            for m in prior:
                role_label = "Aluno" if m["role"] == "user" else "Mentor"
                recap_lines.append(f"{role_label}: {m['content']}")
            recap = "\n\n".join(recap_lines)
            full_input = (
                f"[Contexto da conversa anterior]\n{recap}\n\n"
                f"[Nova mensagem do aluno]\n{data.content}"
            )
            ai_text = await chat.send_message(UserMessage(text=full_input))
    except Exception as e:
        logger.exception("LLM error: %s", e)
        raise HTTPException(502, "Erro ao consultar a IA. Tente novamente em instantes.")

    ai_msg = {
        "id": str(uuid.uuid4()), "session_id": session_id, "role": "assistant",
        "content": ai_text, "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.chat_messages.insert_one(dict(ai_msg))
    await db.chat_sessions.update_one({"id": session_id}, {"$set": {"updated_at": ai_msg["created_at"]}})

    return SendMessageOut(
        session_id=session_id,
        user_message=ChatMessageOut(id=user_msg["id"], role="user", content=user_msg["content"], created_at=user_msg["created_at"]),
        ai_message=ChatMessageOut(id=ai_msg["id"], role="assistant", content=ai_msg["content"], created_at=ai_msg["created_at"]),
    )


# ---------------------------------------------------------------------------
# Tracks (static curriculum content)
# ---------------------------------------------------------------------------
TRACKS = [
    {
        "id": "marketing-digital",
        "title": "Marketing Digital",
        "subtitle": "Do zero ao tráfego pago dominado",
        "icon": "Megaphone",
        "color": "#FF4500",
        "image": "https://images.unsplash.com/photo-1686061593269-420785fb8fa0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODR8MHwxfHNlYXJjaHw0fHxkaWdpdGFsJTIwbWFya2V0aW5nJTIwc3RyYXRlZ3l8ZW58MHx8fHwxNzc3Mzc2NTkxfDA&ixlib=rb-4.1.0&q=85",
        "lessons": [
            {"level": "Básico", "title": "O que é marketing digital e por que ele muda vidas",
             "summary": "Entenda o ecossistema digital, os 4Ps modernos, persona e jornada do cliente.",
             "prompt": "Me explique o ecossistema do marketing digital como se eu fosse iniciante. Dê exemplos reais de funis simples."},
            {"level": "Básico", "title": "Funis de vendas: estrutura essencial",
             "summary": "Topo, meio e fundo de funil. Como capturar, nutrir e converter leads.",
             "prompt": "Construa um funil de vendas simples para um produto digital de R$ 297, do anúncio até a venda."},
            {"level": "Intermediário", "title": "Tráfego pago no Meta Ads",
             "summary": "Pixel, públicos, CBO, ABO, criativos vencedores e escala.",
             "prompt": "Me ensine a estruturar uma campanha de conversão no Meta Ads do zero, com orçamento de R$ 50/dia."},
            {"level": "Intermediário", "title": "Copywriting que converte",
             "summary": "Headlines, gatilhos mentais, AIDA, PAS, storytelling para anúncios.",
             "prompt": "Escreva 5 headlines no estilo PAS para um curso de inglês, com gatilhos mentais explicados."},
            {"level": "Avançado", "title": "Escala com Google Ads + criativos UGC",
             "summary": "Search, Performance Max, remarketing avançado e produção em escala de criativos.",
             "prompt": "Como escalar de R$ 500/dia para R$ 5.000/dia mantendo o ROAS no Google Ads?"},
        ],
    },
    {
        "id": "afiliacao",
        "title": "Marketing de Afiliação",
        "subtitle": "Ganhe vendendo o produto dos outros",
        "icon": "HandCoins",
        "color": "#10B981",
        "image": "https://images.pexels.com/photos/14314638/pexels-photo-14314638.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "lessons": [
            {"level": "Básico", "title": "Como escolher produtos de afiliado vencedores",
             "summary": "Critérios de comissão, página de vendas, gravidade Hotmart/Eduzz/Monetizze.",
             "prompt": "Quais critérios devo usar para escolher um bom produto de afiliado em 2026?"},
            {"level": "Básico", "title": "Sua primeira venda como afiliado",
             "summary": "Bio otimizada, link de afiliado, primeiras estratégias orgânicas.",
             "prompt": "Plano de 30 dias para fazer minha primeira venda como afiliado iniciante, sem investir em ads."},
            {"level": "Intermediário", "title": "Tráfego direto vs. página de captura",
             "summary": "Quando usar cada um, modelos de bridge page que convertem.",
             "prompt": "Me dê uma estrutura de bridge page de alta conversão para nicho de emagrecimento."},
            {"level": "Avançado", "title": "Construindo um funil de afiliado evergreen",
             "summary": "Email marketing, automações, escala com tráfego pago.",
             "prompt": "Monte um funil evergreen completo para vender um produto de afiliado de R$ 997."},
        ],
    },
    {
        "id": "infoprodutos",
        "title": "Infoprodutos",
        "subtitle": "Crie, valide e venda seu próprio produto",
        "icon": "Books",
        "color": "#F59E0B",
        "image": "https://images.unsplash.com/photo-1551836022-d5d88e9218df?crop=entropy&cs=srgb&fm=jpg&q=85",
        "lessons": [
            {"level": "Básico", "title": "Encontre seu nicho e dor de mercado",
             "summary": "Mapa de nichos lucrativos, validação rápida, MVP digital.",
             "prompt": "Me ajude a validar uma ideia de infoproduto sobre finanças pessoais para mulheres."},
            {"level": "Intermediário", "title": "Estruture seu curso (script + módulos)",
             "summary": "Esqueleto de curso, frameworks de ensino, gravação caseira profissional.",
             "prompt": "Crie a estrutura de um curso de 8 módulos sobre Excel para iniciantes."},
            {"level": "Intermediário", "title": "Lançamento: fórmula de 7 dias",
             "summary": "Aulas ao vivo, gatilhos de escassez, abertura e fechamento de carrinho.",
             "prompt": "Calendário e roteiro de um lançamento semente de 7 dias para um curso de R$ 497."},
            {"level": "Avançado", "title": "Perpétuo automatizado de 6 dígitos/mês",
             "summary": "VSL, webinar evergreen, KPIs de cada etapa, escalada com Meta + YouTube.",
             "prompt": "Como migrar de lançamento para um perpétuo automatizado de R$ 100k/mês?"},
        ],
    },
    {
        "id": "conteudo",
        "title": "Criação de Conteúdo",
        "subtitle": "Construa autoridade e seja seguido",
        "icon": "VideoCamera",
        "color": "#A78BFA",
        "image": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?crop=entropy&cs=srgb&fm=jpg&q=85",
        "lessons": [
            {"level": "Básico", "title": "Posicionamento: nicho, persona e voz",
             "summary": "Como achar seu posicionamento único e construir bio magnética.",
             "prompt": "Me ajude a definir meu posicionamento como criador no nicho de produtividade."},
            {"level": "Básico", "title": "Roteiros de Reels e TikTok que viralizam",
             "summary": "Hook nos primeiros 3s, edição em ritmo, CTAs estratégicos.",
             "prompt": "Me dê 10 ganchos virais para Reels no nicho de finanças pessoais."},
            {"level": "Intermediário", "title": "Calendário editorial de 30 dias",
             "summary": "Pilares de conteúdo, frequência, mix Reels/Carrossel/Stories.",
             "prompt": "Monte um calendário editorial de 30 dias para um perfil de fitness feminino iniciante."},
            {"level": "Avançado", "title": "Construa um funil de conteúdo + venda",
             "summary": "Conteúdo top, mid, bottom funnel, lead magnet, CTAs para vendas.",
             "prompt": "Como transformar 100k seguidores em R$ 50k/mês recorrentes?"},
        ],
    },
]


@api.get("/tracks")
async def list_tracks():
    return TRACKS


@api.get("/tracks/{track_id}")
async def get_track(track_id: str):
    for t in TRACKS:
        if t["id"] == track_id:
            return t
    raise HTTPException(404, "Trilha não encontrada")


# ---------------------------------------------------------------------------
# Prompt suggestions
# ---------------------------------------------------------------------------
PROMPT_SUGGESTIONS = [
    {"icon": "Rocket", "title": "Plano de 30 dias",
     "prompt": "Monte um plano prático de 30 dias para começar do zero como afiliado e fazer minha primeira venda."},
    {"icon": "Lightning", "title": "Anúncio que converte",
     "prompt": "Escreva um anúncio para Meta Ads no nicho de emagrecimento, com 3 variações de copy curta e 1 longa."},
    {"icon": "ChartLineUp", "title": "Diagnóstico de funil",
     "prompt": "Analise meu funil: anúncio -> página -> WhatsApp -> venda. Onde está perdendo conversão?"},
    {"icon": "Target", "title": "Achar nicho lucrativo",
     "prompt": "Quais 5 sub-nichos lucrativos em 2026 para infoprodutos com baixa concorrência?"},
    {"icon": "PenNib", "title": "Headline matadora",
     "prompt": "Me dê 10 headlines com gatilhos mentais para um curso de inglês para concursos."},
    {"icon": "Megaphone", "title": "Estratégia orgânica",
     "prompt": "Estratégia 100% orgânica de Instagram para vender meu primeiro infoproduto de R$ 197."},
]


@api.get("/prompts")
async def list_prompts():
    return PROMPT_SUGGESTIONS


# ---------------------------------------------------------------------------
# Referral
# ---------------------------------------------------------------------------
@api.get("/referral/me")
async def my_referral(user: dict = Depends(get_current_user)):
    count = await db.users.count_documents({"referred_by": user["referral_code"]})
    return {
        "referral_code": user["referral_code"],
        "total_referred": count,
    }


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"app": "MentorIA", "status": "ok"}


# ---------------------------------------------------------------------------
# App wiring
# ---------------------------------------------------------------------------
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("referral_code", unique=True)
    await db.chat_sessions.create_index([("user_id", 1), ("updated_at", -1)])
    await db.chat_messages.create_index([("session_id", 1), ("created_at", 1)])

    # Seed test user (idempotent)
    test_email = "teste@mentoria.com"
    if not await db.users.find_one({"email": test_email}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Aluno Teste",
            "email": test_email,
            "password_hash": hash_password("Teste@1234"),
            "referral_code": gen_referral_code(),
            "referred_by": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
