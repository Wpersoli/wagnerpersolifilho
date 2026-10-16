# Projeto recuperado — setembro de 2026

Este pacote reúne o código-fonte completo localizado no backup de agosto de
2026 com os arquivos públicos recuperados da implantação ativa
`wagnerpersoli.vercel.app` e a revisão responsiva mais recente da seção
Competências Técnicas.

## Resultado da comparação

- Recuperados do backup: histórico Git, APIs `chat` e `contact`, testes,
  scripts, configuração da Vercel, migração Supabase e fontes CSS históricas.
- Atualizados pela implantação ativa: `public/index.html`, `public/css/app.css`,
  `public/js/main.js` e as imagens principais do hero.
- Preservados por existirem apenas no backup: emulador, imagens de projetos,
  cliente de chat, imagem OG e demais arquivos internos.
- Aplicada a revisão de competências: grade de 3 colunas no desktop, 2 no
  tablet e 1 no celular.
- O CSS publicado atual foi salvo em `src/styles/current-production.css` e é
  reproduzido pelo comando de build, evitando que uma compilação reverta a
  aparência recuperada.

## Configuração local

O arquivo `.env.local` foi deliberadamente excluído do novo ZIP para evitar a
duplicação de credenciais. Use `.env.example` como modelo ou recupere as
variáveis do projeto vinculado na Vercel.

```powershell
npm install
vercel link
vercel env pull .env.local
npm run validate
npm run dev
```

Não publique diretamente em produção sem antes criar e validar um Preview.

