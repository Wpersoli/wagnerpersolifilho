# AUDITORIA — WAGNER.OS v2.9.6

## Escopo aplicado
- Substituição da imagem principal do topo pela nova arte limpa aprovada.
- Hero ajustado para preenchimento full-screen responsivo.
- Preservação de chat, modo apresentação, formulário por e-mail e links principais.
- Adição de overlay funcional visível para botões principais e redes no topo.
- Refino dos efeitos/raios para não poluir a nova arte.

## Segurança
- `.env.local` removido do pacote final por conter token sensível do Vercel.
- Diretórios `.git` e `.vercel` removidos do ZIP final.

## Validação esperada
Executar:

```powershell
npm ci
npm run validate
npm audit --audit-level=high
```

## Observações
- A responsividade mobile preserva o dock de ações já existente.
- Os controles visíveis do hero usam os mesmos destinos funcionais já existentes no projeto.
