# Organização do projeto WAGNER.OS

## Estrutura mantida

- `public/`: arquivos servidos pelo site. Trate como produção; não remova assets sem confirmar referências no HTML, CSS, JavaScript e configuração da Vercel.
- `api/`: funções serverless e módulos compartilhados de validação, HTTP e rate limit.
- `data/`: base de conhecimento utilizada pelo assistente.
- `src/styles/`: fontes de estilos mantidas pelo projeto; confirme o fluxo de build antes de alterar ou remover arquivos.
- `scripts/`: build, lint, validações, testes e empacotamento de release.
- `tests/`: testes automatizados.
- `supabase/migrations/`: migrações de banco; manter versionadas.
- `archive/legacy-public-assets/`: ativos antigos preservados para recuperação. Não apagar em uma limpeza automática.
- `.github/workflows/`: automação de qualidade e CI.

## Regras de limpeza

1. Não apagar arquivos apenas pelo nome, extensão ou data.
2. Antes de remover um asset, pesquisar referências em HTML/CSS/JS, configuração da Vercel e scripts de build.
3. Depois de qualquer mudança, executar `npm ci`, `npm run validate` e, quando houver navegador disponível, `npm run test:e2e` e `npm run test:visual`.
4. Regenerar `CHECKSUMS.sha256` por `npm run checksums` quando arquivos cobertos forem alterados.
5. Manter credenciais fora do Git; `.env.example` deve conter somente nomes e valores ilustrativos.
6. Manter arquivos de histórico até confirmar que não são exigidos pela auditoria ou recuperação.

## Itens que exigem confirmação antes de remoção

- `ALTERACOES-*.txt`: históricos de release e alterações, atualmente rastreados e listados em `CHECKSUMS.sha256`.
- `public/img/hero-w-energy.webp`: manter enquanto houver referência no projeto; o arquivo homônimo da raiz foi removido da branch de limpeza porque não era referenciado pelo site e tinha conteúdo/assinatura incompatível com a extensão `.webp`.
- `archive/legacy-public-assets/`: material de recuperação deliberadamente preservado.

Este documento descreve a organização e o processo seguro de manutenção; não substitui os testes de build e release.
