# Otimização de desempenho — WAGNER.OS v2.9.7

## Status

**APROVADO após validação automatizada e smoke test desktop/mobile.**

## Otimizações conservadoras

- Canvas global limitado a DPR 1,25 no desktop e 1 no mobile.
- Partículas do fundo reduzidas de até 90 para até 56, mantendo o mesmo efeito visual.
- Cálculos de conexão usam distância ao quadrado, evitando raiz quadrada em cada par.
- Canvas global opera em até 36 FPS e pausa completamente durante o scroll.
- Canvas elétrico do hero usa DPR adaptativo menor e limites conservadores de raios/faíscas.
- Canvas de movimento do hero para quando sai da viewport, quando a aba fica oculta e durante o scroll.
- Animações decorativas e blur do topo pausam apenas enquanto a viewport está em movimento.
- Eventos de scroll dos FABs, navegação e apresentação foram agrupados por `requestAnimationFrame`.
- Movimento por ponteiro do hero foi limitado a uma atualização por quadro.

## Funcionalidades preservadas

- Topo e navegação desktop/mobile.
- Todos os botões do hero.
- WhatsApp e voltar ao topo.
- Chat, abertura, fechamento, envio e API `/api/chat`.
- Modo apresentação desktop/mobile.
- Formulário e API `/api/contact`.
- Hero responsivo atual e todas as imagens.
- Emulador, dados oficiais e currículo.

## Segurança e integridade

- APIs, dados, imagem principal, CSS funcional base e emulador permaneceram byte a byte idênticos.
- `.git`, `.env.local` e `.vercel` foram removidos somente do pacote de entrega.
- `.env.example` foi preservado.
