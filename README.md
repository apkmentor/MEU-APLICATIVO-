# MentorIA — Mentoria de Marketing Digital com IA

App estilo ChatGPT, em PT-BR, focado em **mentoria de marketing digital, afiliação, infoprodutos e criação de conteúdo**.
Stack: **FastAPI + MongoDB + React + GPT-5.2 (OpenAI) + Stripe**.

---

## 🧩 Funcionalidades

- Chat com mentor IA (GPT-5.2) em Português do Brasil
- 4 trilhas de aprendizado (Marketing, Afiliação, Infoprodutos, Conteúdo) — do básico ao avançado
- Prompts prontos vencedores
- Programa de indicação com **15% de comissão recorrente**
- Planos Premium (Mensal R$ 99,90 e Anual R$ 197) via Stripe Checkout
- Auth JWT (email/senha) com bcrypt

---

## 📁 Estrutura

```
.
├── backend/              # FastAPI + MongoDB
│   ├── server.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── Procfile
│   ├── railway.toml
│   └── runtime.txt
└── frontend/             # React 19 + Tailwind + Shadcn UI
    ├── src/
    ├── package.json
    ├── .env.example
    └── vercel.json
```

---

## 🛠️ Rodando localmente

### Pré-requisitos
- Node.js 18+ e Yarn
- Python 3.11+
- MongoDB local OU MongoDB Atlas

### 1. Backend
```bash
cd backend
cp .env.example .env
# preencha JWT_SECRET, MONGO_URL, OPENAI_API_KEY (ou EMERGENT_LLM_KEY) e STRIPE_API_KEY
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

### 2. Frontend
```bash
cd frontend
cp .env.example .env
# REACT_APP_BACKEND_URL=http://localhost:8001
yarn install
yarn start
```

---

## 🚀 Deploy em produção

### Backend → Railway (recomendado)
1. Crie um projeto novo em https://railway.app a partir do seu repo
2. **Service > Settings > Root Directory**: `backend`
3. **Variables**: cole todas as envs do `backend/.env.example`
4. Railway detecta automaticamente o `Procfile` / `railway.toml`
5. Copie a URL pública gerada (ex: `https://mentoria-backend.up.railway.app`)

Alternativa: Render, Fly.io ou qualquer host que rode Python + Uvicorn.

### MongoDB → Atlas (free tier)
1. Crie cluster grátis em https://www.mongodb.com/atlas
2. Crie database user + libere IP `0.0.0.0/0` (ou só o IP do Railway)
3. Cole a connection string em `MONGO_URL`

### Frontend → Vercel
1. Importe o repo em https://vercel.com
2. **Root Directory**: `frontend`
3. **Environment Variables**:
   - `REACT_APP_BACKEND_URL` = URL do Railway
4. Vercel detecta `vercel.json` e faz deploy automático a cada push

### CORS no backend
Após ter a URL da Vercel, atualize no Railway:
```
CORS_ORIGINS=https://seu-dominio.com,https://seu-app.vercel.app
```

### Webhook do Stripe (importante pra ativar Premium)
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://seu-backend.up.railway.app/api/webhook/stripe`
3. Eventos: `checkout.session.completed`

---

## 🔑 Trocar para suas próprias chaves

| Variável | Onde pegar |
|---|---|
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| `STRIPE_API_KEY` (live) | https://dashboard.stripe.com/apikeys |
| `JWT_SECRET` | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `MONGO_URL` | MongoDB Atlas (Connection String) |

> A `EMERGENT_LLM_KEY` só funciona enquanto você tiver créditos na plataforma Emergent.
> Em produção própria, use `OPENAI_API_KEY` direto.

---

## 🧪 Conta de teste local

Após subir o backend, ele cria automaticamente:

- **Email**: `teste@mentoria.com`
- **Senha**: `Teste@1234`

---

## 📝 Endpoints principais

| Método | Rota | Auth |
|---|---|---|
| POST | `/api/auth/register` | – |
| POST | `/api/auth/login` | – |
| GET  | `/api/auth/me` | Bearer |
| POST | `/api/chat/message` | Bearer (Premium) |
| GET  | `/api/chat/sessions` | Bearer |
| GET  | `/api/tracks` | – |
| GET  | `/api/subscription/plans` | – |
| POST | `/api/subscription/checkout` | Bearer |
| GET  | `/api/subscription/checkout/status/{id}` | Bearer |
| POST | `/api/webhook/stripe` | Stripe sig |
| GET  | `/api/referral/me` | Bearer |

---

## 📄 Licença

Código pessoal — use, modifique, lucre. ⚡
