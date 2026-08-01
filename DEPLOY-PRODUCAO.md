# WAGNER.OS — Deploy de produção

## 1. Supabase

Execute integralmente no SQL Editor:

```text
supabase/migrations/202608010001_mensagens_contato.sql
```

A migração:

- cria `public.mensagens_contato`;
- ativa e força RLS;
- revoga privilégios de `public`, `anon` e `authenticated`;
- concede ao papel `anon` somente `INSERT` nas colunas públicas;
- não cria políticas `SELECT`, `UPDATE` ou `DELETE` públicas;
- usa `WITH CHECK` para validar cada nova linha.

## 2. Variáveis da Vercel

Configure em **Production**, **Preview** e **Development** conforme necessário:

```dotenv
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_PUBLISHABLE_KEY=<CONFIGURE_NA_VERCEL>
CONTACT_REQUIRE_SUPABASE=true

CONTACT_EMAIL_PROVIDER=brevo
BREVO_API_KEY=<CONFIGURE_NA_VERCEL>
BREVO_SENDER_NAME=WAGNER.OS
BREVO_SENDER_EMAIL=contato@seudominio.com
CONTACT_TO_EMAIL=wagnerpersoli@hotmail.com

CONTACT_RATE_LIMIT_MAX=5
CONTACT_MAX_BODY_BYTES=16384
CONTACT_PROVIDER_TIMEOUT_MS=9000
RATE_LIMIT_HASH_SALT=<CONFIGURE_NA_VERCEL>
ALLOWED_ORIGINS=https://wagnerpersoli.vercel.app
```

Nunca use prefixos públicos para `BREVO_API_KEY`, chaves secretas do Supabase ou tokens de rate limit.

## 3. Vercel

Configuração esperada:

```text
Framework Preset: Other
Install Command: npm ci
Build Command: npm run build
Output Directory: public
Node.js: 22.x
```

`vercel.json` é gerado por `scripts/build-security-config.js`; não edite o hash CSP manualmente.

## 4. Validação local

```powershell
cd "C:\Projetos\wagnerpersolifilho"
npm ci
$env:CHROME_BIN = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$env:VISUAL_AUDIT_DEBUG_PORT = "9332"
$env:NODE_OPTIONS = "--unhandled-rejections=strict --throw-deprecation"
npm run quality
```

## 5. Servidor local completo

```powershell
npm run build
node --env-file=.env.local scripts/dev-server.js
```

Abra `http://127.0.0.1:3000`.
