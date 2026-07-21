# WAGNER.OS — AI Systems Lab

Portfólio profissional de Wagner Persoli F. com interface Cyber Metal, modo apresentação, assistente Gemini e formulário de contato por e-mail.

**Produção principal:** https://wagnerpersolifilho.vercel.app
**Domínio autorizado:** https://wagnerpersoli.vercel.app

## Versão

`2.1.1` — auditoria, limpeza e endurecimento do release Cyber Metal v2.1.

## Stack

- Frontend: HTML5, CSS3 e JavaScript puro
- Backend: Vercel Serverless Functions em Node.js 22
- IA principal: `gemini-3.5-flash`
- Contingência: `gemini-3.1-flash-lite`
- E-mail: endpoint `/api/contact`
- Hospedagem: Vercel

## Interface Cyber Metal

- monograma WP vetorial com acabamento metálico e neon
- hero cinematográfico, plataforma luminosa e HUDs
- tipografia dimensional e painéis técnicos
- projetos, stack, terminal, assistente, contato e footer integrados
- fundo Canvas/JavaScript preservado
- responsividade para desktop, tablet e celular
- camada visual complementar em `public/css/cyber-v2.css`

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
│   │   └── cyber-v2.css
│   ├── emulador/
│   ├── img/wp-monogram.svg
│   ├── js/main.js
│   ├── index.html
│   └── og-image.jpg
├── tests/
│   ├── chat.test.js
│   └── contact.test.js
├── AUDITORIA.md
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

## Comportamentos preservados

- modo apresentação sem consumo de Gemini
- menu desktop e mobile
- chat real e fallback local
- formulário e confirmação visual
- emulador responsivo
- fundo animado
- botões, navegação e acessibilidade por teclado
