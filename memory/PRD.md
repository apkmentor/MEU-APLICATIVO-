# MentorIA - Mentoria de Marketing Digital com IA

## Problema Original
> Você consegue criar um aplicativo como o chat gpt só que focado em uma Mentoria de Marketing digital onde vai tirar todas as dúvidas da pessoa em geral sobre marketing, afiliação, criação de inforprodutos e até mesmo criação de conteúdo sobre marketing... que ensina do básico ao avançado de forma simplificada e que gere resultado.

## User Personas
- **Iniciante no Digital**: nunca vendeu online, quer começar como afiliado ou criador.
- **Afiliado em Crescimento**: já vende, quer escalar com tráfego pago.
- **Produtor Digital**: quer lançar/escalar infoprodutos.
- **Criador de Conteúdo**: foco em audiência + monetização.

## Stack
- **Backend**: FastAPI + MongoDB (motor) + JWT (PyJWT) + bcrypt + emergentintegrations (GPT-5.2)
- **Frontend**: React 19 + react-router-dom 7 + axios + react-markdown + @phosphor-icons/react + Shadcn UI + Tailwind
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key (universal key)

## Implementado (Feb 2026)
### Backend
- `POST /api/auth/register` (com referred_by opcional)
- `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/chat/message` — multi-turn com GPT-5.2 + system prompt de mentor PT-BR
- `GET /api/chat/sessions`, `GET /api/chat/sessions/{id}/messages`, `DELETE /api/chat/sessions/{id}`
- `GET /api/tracks` (4 trilhas: Marketing Digital, Afiliação, Infoprodutos, Conteúdo)
- `GET /api/tracks/{id}` (lições com prompt pronto por nível: Básico/Intermediário/Avançado)
- `GET /api/prompts` (6 prompts vencedores)
- `GET /api/referral/me` (código + total indicados)
- Seed automático: `teste@mentoria.com` / `Teste@1234`

### Frontend
- Landing page (hero ousado, preview de trilhas, features, CTA)
- Login / Registro (com `?ref=CODIGO` auto-preenchendo)
- Layout autenticado com sidebar (Chat / Trilhas / Indicar)
- Chat estilo ChatGPT: histórico lateral, prompts prontos, render markdown, multi-turn
- Trilhas: bento grid + página de detalhe que abre conversa por lição
- Indicação: link compartilhável, copy clipboard com fallback, share WhatsApp, stats

## Test Status
- Backend: **21/21 testes pytest passando** (100%)
- Frontend: **100% dos fluxos funcionais** (Playwright)
- AI Chat: GPT-5.2 respondendo em PT-BR, multi-turn validado.

## P1 (Próxima fase)
- Streaming de resposta da IA (typing em tempo real)
- Salvar progresso por lição em cada trilha (% concluído)
- Upload de imagens / PDFs no chat (análise de criativos)
- Email de boas-vindas + reset de senha (Resend / SendGrid)
- Plano premium com Stripe (mais sessões, modelos avançados)
- Dashboard de analytics da rede de indicados (níveis 1, 2, 3)

## P2
- Comunidade interna (fórum / desafios semanais)
- Trilhas com vídeo (upload via object storage)
- App mobile (PWA → React Native)
- Resumo automático de conversas longas
- Sistema de gamificação (XP, badges, streak)

## Credenciais de Teste
Ver `/app/memory/test_credentials.md`
