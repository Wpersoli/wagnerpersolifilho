# WAGNER.OS — AI Systems Lab

Portfólio profissional de Wagner Persoli F. com identidade **Cyber Metal**, assistente Gemini, modo apresentação, emulador responsivo e formulário de contato por e-mail.

**Produção:** `https://wagnerpersolifilho.vercel.app`

## Versão

`2.9.7` — **Hero responsivo aprovado**.

Esta evolução concentra o trabalho no topo do site e mantém os fluxos funcionais existentes.

## Evoluções do hero

- cena principal em largura total, conectada às bordas da viewport;
- command rail superior estendido até as bordas;
- monograma WP recortado em uma camada independente e transparente;
- camada de brilho neon separada do monograma principal;
- contornos SVG energizados com fluxo contínuo;
- raios Canvas guiados por pontos do monograma;
- ramificações, flashes e partículas de impacto;
- parallax independente entre cena, monograma e painel textual;
- modos `ENERGY // AUTO` e `ENERGY // MAX` com atalho `E`;
- qualidade adaptativa conforme largura e capacidade do dispositivo;
- pausa automática quando o hero sai da tela ou a aba fica oculta;
- suporte a `prefers-reduced-motion`.

## Funcionalidades preservadas

- chat Gemini, modelo secundário, circuit breaker e fallback local;
- modo apresentação em desktop e mobile;
- formulário com envio por e-mail e validações do endpoint;
- botões, links, redes sociais, WhatsApp e download do currículo;
- menu desktop e mobile;
- emulador responsivo;
- boot cinematográfico, terminal e HUD.

## Como rodar

```powershell
cd C:\Projetos\wagnerpersolifilho
npm ci
npm run validate
npm audit --audit-level=high
npx vercel@latest dev
```

Abra `http://localhost:3000`.


Atualização 2.9.4: refinado o topo/hero para manter proporção mais estável em desktop e mobile, sem alterar chat, modo apresentação, formulário e demais interações.


## Refinamento cirúrgico do topo — 2.9.4

- header somente com WAGNER.OS e subtítulo;
- cenário tecnológico expandido até as bordas sem ampliar o conteúdo central;
- painel translúcido da área tipográfica removido;
- rótulo decorativo ENERGY MOTION // LIVE removido;
- scripts e funcionalidades críticas preservados sem alteração.


## Correção 2.9.7 — hero responsivo

- nova arte `hero-fidelity-master.webp` em 2048 × 1152;
- desktop com preenchimento total da viewport por `object-fit: cover`;
- mobile com proporção integral 16:9 por `object-fit: contain`, sem cortes laterais;
- seção do hero liberada do `max-width` do `main`;
- header restaurado em uma única linha e largura total;
- scripts de validação do `package.json` corrigidos.
