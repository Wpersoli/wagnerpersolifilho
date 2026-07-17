# WAGNER.OS — AI Systems Lab

Portfólio profissional de Wagner Persoli F., com frontend estático, modo apresentação responsivo e assistente Gemini integrado por função Serverless.

**Produção principal:** https://wagnerpersolifilho.vercel.app

**Domínio autorizado:** https://wagnerpersoli.vercel.app

## Stack

- Frontend: HTML5, CSS3 e JavaScript puro
- Backend: Vercel Serverless Functions em Node.js 22
- IA principal: `gemini-3.5-flash`
- Contingência: `gemini-3.1-flash-lite`
- Hospedagem: Vercel
- Repositório: `Wpersoli/wagnerpersolifilho`

## Chat v3.0

O endpoint `/api/chat` opera em três modos:

1. **Perfil profissional:** responde sobre Wagner exclusivamente com base nos arquivos oficiais em `data/`.
2. **Perguntas gerais:** usa o conhecimento geral do modelo e adapta profundidade e criatividade ao tipo de pergunta.
3. **Contexto de runtime:** responde data e hora de São Paulo diretamente pelo servidor, sem consumir a API Gemini.

Controles implementados:

- Prompt estruturado com separação entre fatos do perfil e conhecimento geral
- Prioridade para `knowledge.json`, com `cv.txt` como contexto complementar
- Proibição explícita de inventar fatos pessoais, motivo de desligamento ou dados não documentados
- Temperatura adaptativa: baixa para perfil/fatos e maior para criação de conteúdo
- Retry exponencial com jitter para erros transitórios
- Modelo secundário antes do fallback local
- Circuit breaker temporário quando o modelo principal apresenta sobrecarga
- Fallback local contextual para perguntas profissionais
- Rate limit best-effort por IP
- CORS restrito aos domínios do projeto
- Histórico e tamanho de mensagens limitados no frontend e no backend
- Renderização segura de parágrafos, listas, negrito e código inline
- Cabeçalhos de diagnóstico `X-Wagner-Chat-Source` e `X-Wagner-Chat-Model`

O assistente não possui navegação web. Para notícias, preços, clima, cotações ou outros dados ao vivo, ele deve informar que não consegue verificar em tempo real. Data e hora de São Paulo são fornecidas pelo próprio servidor.

## Contato criativo por formulário

A seção `#contact` agora possui um formulário visual neon que envia a mensagem sem tirar o visitante do site.

- Frontend: `public/index.html`, `public/css/main.css` e `public/js/main.js`
- Backend: `api/contact.js`
- Provider de e-mail: Resend via REST API
- Segurança: honeypot, validação de campos, rate limit best-effort e resposta JSON controlada

Quando `RESEND_API_KEY` estiver configurada na Vercel, o formulário envia o contato diretamente para o e-mail definido em `CONTACT_TO_EMAIL`.

## Estrutura versionada

```text
wagnerpersolifilho/
├── api/chat.js
├── api/contact.js
├── data/
│   ├── cv.txt
│   ├── knowledge-data.js
│   └── knowledge.json
├── public/
│   ├── css/main.css
│   ├── emulador/
│   ├── img/
│   ├── js/main.js
│   ├── index.html
│   └── og-image.jpg
├── tests/chat.test.js
├── .env.example
├── .gitattributes
├── .gitignore
├── package.json
├── package-lock.json
├── vercel.json
└── README.md
```

## Validação local

```powershell
npm install
npm run validate
npm audit --audit-level=high
```

`npm run validate` executa a verificação sintática e sete testes automatizados do chat, incluindo base factual, prompt, horário de São Paulo, fallback, failover e circuit breaker.

O projeto não possui etapa de compilação. A Vercel publica `public/` e executa `api/chat.js` e `api/contact.js` como funções Serverless.

## Variáveis de ambiente

Obrigatória:

```env
GEMINI_API_KEY=
```

Opcionais:

```env
GEMINI_MODEL=gemini-3.5-flash
GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite
GEMINI_PRIMARY_COOLDOWN_MS=120000
CHAT_RATE_LIMIT_MAX=8

RESEND_API_KEY=
CONTACT_TO_EMAIL=wagnerpersoli@hotmail.com
CONTACT_FROM_EMAIL=WAGNER.OS <onboarding@resend.dev>
CONTACT_RATE_LIMIT_MAX=5
```

Na Vercel, marque como sensíveis pelo menos `GEMINI_API_KEY` e `RESEND_API_KEY`. Mudanças nas variáveis da Vercel exigem um novo deployment para entrarem em vigor.

Para testes locais, uma chave pode ficar em `.env.local`, mas esse arquivo é local, está ignorado pelo Git e nunca deve ser compactado ou enviado.

## Arquivos que permanecem locais

- `.env.local` e qualquer `.env` com credenciais reais
- `.vercel/`
- `node_modules/`
- ZIPs, backups, logs e relatórios de auditoria

## Comportamentos preservados

- O modo apresentação usa respostas locais simuladas e não consome Gemini.
- O modo apresentação funciona em desktop, tablet e celular.
- O menu mobile fecha pelo botão, menu, links e tecla `Escape`.
- O visual, navegação e emulador não dependem da disponibilidade da API Gemini.
