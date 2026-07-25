# Auditoria - currículo online e PDF

Base utilizada: `WAGNER-OS-v2.9.7-OTIMIZADO-FLUIDO-APROVADO.zip`.

## Inclusões

- `public/curriculo.html`: visualização online responsiva, com ações para voltar ao portfólio, imprimir e baixar o PDF.
- `public/docs/curriculo-wagner-persoli-filho.pdf`: PDF oficial fornecido, preservado sem alteração.
- `tests/curriculo.test.js`: teste de regressão para página, rotas e assinatura do PDF.

## Integração

- menu desktop e menu mobile apontam para a visualização online;
- botões de currículo do hero mantêm download direto do PDF;
- link semântico do hero abre a página online;
- nenhum JavaScript funcional, API, CSS do portfólio ou mídia do hero foi modificado.

## Validação

- PDF: 5 páginas A4, não criptografado e renderizado sem falhas;
- checksum do PDF incluído idêntico ao arquivo fornecido;
- HTML analisado sem ausência de `html`, `head` ou `body`;
- links locais da página validados;
- 19/19 testes aprovados;
- chat, WhatsApp, modo apresentação, topo, menu e botões críticos preservados.
