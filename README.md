# WAGNER.OS v3.3.0
## Release v3.3.0

- Topo alinhado à referência 1916×906, com monograma prismático fornecido integrado ao banner.
- Header full-width e botões/boxes uniformizados em glass ciano-violeta.
- Partículas Canvas sobre o conteúdo sem capturar cliques e com prioridade cedida ao chat e à apresentação.
- Espaços vazios corrigidos mantendo SVGs decorativos fora do fluxo.
- Conteúdo, ordem, IDs, chat, modo apresentação, scroll, currículo, WhatsApp, Brevo e APIs preservados.
- Gate visual em 1916×906 e E2E em desktop, tablet e mobile.


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

## Experiência visual v3.2

A camada visual mantém o conteúdo e a estrutura existentes e adiciona, sem dependências externas:

- partículas Canvas sobre a camada principal, com `pointer-events: none`;
- reação sutil ao cursor e trilha luminosa;
- scroll reveal com máscara, blur e stagger;
- parallax leve nas imagens e 3D tilt preservado nos cards;
- marquee duplo de skills;
- loading cinematográfico refinado;
- dark mode premium, noise e glassmorphism alinhados à referência visual.

As partículas reduzem carga durante scroll, desaparecem com chat/apresentação e são removidas em `prefers-reduced-motion`, impressão e ambientes sem Canvas.

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
