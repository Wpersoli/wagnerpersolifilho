# WAGNER.OS — Relatório de auditoria

## Escopo aprovado

- Hero e header preservados segundo a referência 1919 × 1001.
- Layout sem overflow horizontal validado de 320 a 2560 pixels.
- CTAs centralizados e redes sociais sem colisão com o chat.
- Imagem principal fixa, sem deslocamento por cursor.
- WebP principal convertido de forma binária real (`RIFF` / `WEBP`).
- Dimensões intrínsecas verificadas: 4086 × 1913.
- Fallback JPEG referenciado no CSS.
- Chat com cliente carregado de forma assíncrona sob demanda.
- Chat, apresentação, WhatsApp, currículo e menu mobile preservados.
- Formulário com validação estrita no navegador e no servidor.
- Persistência Supabase com RLS INSERT-only.
- Brevo com escaping HTML, timeout, rate limit e degradação controlada.
- CSP sem `unsafe-inline` em `script-src` e com hash do JSON-LD.
- Cache separado entre navegador e Vercel CDN.
- Artefatos `.env.local`, `.git`, `.vercel`, `node_modules` e `artifacts` excluídos da release.

## Gates executados

```text
npm ci
npm run build
npm run lint
npm run check
npm test
npm run release:check
npm run test:e2e
npm run test:visual
```

Resultados:

```text
42 testes unitários/contratuais aprovados
35 arquivos JavaScript com sintaxe validada
3 arquivos JSON validados
E2E 320–2560 px aprovado
CLS dentro do orçamento automatizado (<= 0,02 em emulação)
Referência visual 1919 × 1001 aprovada
WebP e fallback validados
CSP, RLS, Supabase e Brevo validados por contrato
0 vulnerabilidades npm reportadas
```

## Limite de garantia

A auditoria fornece evidência reprodutível por testes automatizados e emulação. Não constitui prova formal de ausência absoluta de defeitos, nem torna qualquer sistema conectado à internet matematicamente inviolável. O pipeline foi configurado para bloquear regressões conhecidas e falhar de forma segura.

- GitHub Actions em três jobs isolados: validação/segurança, E2E e auditoria visual.
- Auditoria visual sem Promise dependente de timers do renderer após o scroll.
- E2E da roda do mouse com até quatro tentativas nativas determinísticas antes de reprovar.
