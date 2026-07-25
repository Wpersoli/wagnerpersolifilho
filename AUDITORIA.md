# AUDITORIA — WAGNER.OS v2.9.7

## Correções aprovadas

- Substituída a arte antiga 1369 × 498 pela imagem fornecida em 2048 × 1152.
- Desktop: hero em largura e altura totais da viewport, sem distorção (`cover`).
- Mobile: imagem completa e proporcional em 16:9, sem recorte (`contain`).
- A seção do hero agora escapa corretamente do `max-width: 1500px` aplicado ao `main`.
- Header restaurado como barra fixa flexível de uma linha; a declaração-base estava neutralizada por comentário CSS legado malformado.
- Dock mobile reposicionado abaixo da imagem, sem ficar recortado pelo hero.
- `package.json` recebeu scripts reais de sintaxe, testes e validação.

## Segurança do pacote

- `.env.local` não integra o ZIP final, pois contém credencial local.
- `.git` e `.vercel` não integram o ZIP final.

## Validação executada

```bash
npm ci
npm run validate
```

Também foram verificadas as geometrias do hero em 1920×1080, 1440×900, 430×932 e 390×844.
