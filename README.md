# WAGNER.OS — AI Systems Lab

Portfólio profissional de Wagner Persoli F. com interface Cyber Metal, modo apresentação, assistente Gemini, emulador responsivo e formulário de contato por e-mail.

**Produção principal:** https://wagnerpersolifilho.vercel.app

**Domínio autorizado:** https://wagnerpersoli.vercel.app

## Versão

`2.2.0` — refinamento visual Cyber Metal, reorganização dos painéis e auditoria funcional completa sem regressão dos recursos existentes.

## Stack

- Frontend: HTML5, CSS3 e JavaScript puro
- Backend: Vercel Serverless Functions em Node.js 22
- IA principal: `gemini-3.5-flash`
- Contingência: `gemini-3.1-flash-lite`
- E-mail: endpoint `/api/contact`
- Hospedagem: Vercel

## Interface Cyber Metal 2.2

- monograma WP vetorial com acabamento metálico, neon e plataforma luminosa
- hero cinematográfico com composição mais próxima da identidade visual aprovada
- header técnico com acesso rápido ao terminal
- quatro cards de projetos e quatro módulos consolidados de stack
- terminal e painel Wagner AI integrados em um dashboard operacional
- contato em três painéis: canais, formulário e identidade
- footer técnico, HUD e imagem Open Graph atualizados
- responsividade validada em desktop, tablet e celular
- camadas visuais em `public/css/main.css`, `public/css/cyber-v2.css` e `public/css/cyber-v3.css`

## Funcionalidades preservadas

- chat real com Gemini e fallback local
- modo apresentação em desktop, tablet e celular
- formulário com envio por e-mail e confirmação visual
- menu desktop e drawer mobile
- botões, links externos e navegação por âncoras
- emulador responsivo com dispositivos, rotação, zoom e resolução personalizada
- boot cinematográfico, Canvas, terminal digitado, HUD e animações
- acessibilidade básica por teclado, nomes acessíveis e estados ARIA

## Chat

O endpoint `/api/chat` combina uma base profissional oficial com respostas gerais do modelo. A implementação inclui retry, modelo secundário, circuit breaker, rate limit, sanitização, respostas locais de data/hora de São Paulo e fallback profissional.

## Formulário de contato

O endpoint `/api/contact` usa validação no frontend e backend, honeypot, rate limit, limite de payload, sanitização HTML, proteção de origem e envio pelo provider configurado no ambiente.

## Estrutura

```text
wagnerpersolifilho/
├── api/
│   ├── chat.js
│   └── contact.js
├── data/
│   ├── cv.txt
│   ├── knowledge-data.js
│   └── knowledge.json
├── public/
│   ├── css/
│   │   ├── main.css
│   │   ├── cyber-v2.css
│   │   └── cyber-v3.css
│   ├── emulador/
│   ├── img/wp-monogram.svg
│   ├── js/main.js
│   ├── index.html
│   └── og-image.jpg
├── tests/
│   ├── chat.test.js
│   └── contact.test.js
├── AUDITORIA.md
├── CHECKSUMS.sha256
├── .env.example
├── package.json
├── package-lock.json
└── vercel.json
```

## Validação local

```powershell
npm ci
npm run validate
npm audit --audit-level=high
vercel dev
```

Abra `http://localhost:3000`.

## Variáveis de ambiente

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite
GEMINI_PRIMARY_COOLDOWN_MS=120000
CHAT_RATE_LIMIT_MAX=8

RESEND_API_KEY=
CONTACT_TO_EMAIL=wagnerpersoli@hotmail.com
CONTACT_FROM_EMAIL=WAGNER.OS <onboarding@resend.dev>
CONTACT_RATE_LIMIT_MAX=5
CONTACT_MAX_BODY_BYTES=16384
```

Marque `GEMINI_API_KEY` e `RESEND_API_KEY` como sensíveis. Nunca compacte `.env.local`, `.vercel`, `.git`, `node_modules` ou credenciais.
