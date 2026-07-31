# WAGNER.OS v3.1.0

Portfólio estático/serverless com chat Gemini, contato Brevo com compatibilidade opcional para Resend, modo apresentação, currículo online, acessibilidade e perfil conservador de performance.

## Requisitos

- Node.js 22.x
- npm 10+
- Chromium/Chrome apenas para o teste E2E

## Uso local

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Abra `http://127.0.0.1:3000`. O comando usa o servidor local do projeto e não chama `vercel dev` recursivamente.

## Qualidade e release

```powershell
npm run validate
npm run test:e2e
npm run package:release
```

`validate` recompila CSS e headers, verifica sintaxe, executa testes e bloqueia secrets ou assets inválidos. `test:e2e` valida em navegador o scroll do mouse, chat, apresentação, WhatsApp, currículo, topo e menu mobile.

## Produção

Configure os secrets no painel da Vercel, nunca no repositório:

- `GEMINI_API_KEY`
- `CONTACT_EMAIL_PROVIDER=brevo`
- `BREVO_API_KEY`
- `BREVO_SENDER_NAME`
- `BREVO_SENDER_EMAIL`
- `CONTACT_TO_EMAIL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RATE_LIMIT_HASH_SALT`

Deploy pela branch de produção ou, de forma manual:

```powershell
npx vercel@latest --prod
```

## Recuperação

Antes de publicar, crie uma tag e um bundle Git:

```powershell
$tag = "restore-pre-v3-$(Get-Date -Format yyyyMMdd-HHmm)"
git tag -a $tag -m "Ponto de recuperação antes da v3"
git push origin $tag
git bundle create "..\wagner-backup.bundle" --all
```

Consulte `AUDITORIA-APROVADA-10.md` para o escopo objetivo da aprovação.
