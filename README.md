# WAGNER.OS — AI Systems Lab

Portfólio profissional de Wagner Persoli F., com frontend estático, modo apresentação responsivo e assistente AI integrado por função Serverless.

**Produção:** https://wagnerpersolifilho.vercel.app

## Stack

- Frontend: HTML5, CSS3 e JavaScript puro
- Backend: Vercel Serverless Function em Node.js 22
- IA: Gemini 3.5 Flash, contingência Gemini 3.1 Flash-Lite e fallback local
- Hospedagem: Vercel
- Repositório: `Wpersoli/wagnerpersolifilho`

## Estrutura versionada

```text
wagnerpersolifilho/
├── api/chat.js
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
npm run check
npm audit --audit-level=high
```

O projeto não possui etapa de compilação. A Vercel publica `public/` e executa `api/chat.js` como função Serverless.

## Variável de ambiente

Configure `GEMINI_API_KEY` exclusivamente no painel da Vercel. Os modelos padrão são `gemini-3.5-flash` e `gemini-3.1-flash-lite`; `GEMINI_MODEL` e `GEMINI_FALLBACK_MODEL` são opcionais e permitem trocar os modelos sem editar o código.

Para testes locais, uma chave pode ficar em `.env.local`, mas esse arquivo é local, está ignorado pelo Git e nunca deve ser compactado ou enviado.

## Arquivos que permanecem locais

- `.env.local` e qualquer `.env` com credenciais reais
- `.vercel/`
- `node_modules/`
- `.git/` de instalações antigas
- ZIPs, backups, logs e relatórios de auditoria

## Comportamentos críticos

- O chat normal utiliza `/api/chat`, repete falhas transitórias e usa um modelo secundário antes do fallback local.
- O modo apresentação usa respostas locais simuladas e não consome Gemini.
- O modo apresentação funciona em desktop, tablet e celular.
- O menu mobile fecha pelo botão, menu, links e tecla `Escape`.
- O domínio oficial é `wagnerpersolifilho.vercel.app`.
