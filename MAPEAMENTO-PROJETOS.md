# Mapeamento dos pacotes auditados — WAGNER.OS v2.9.7

## Base final

- `WAGNER-OS-v2.9.7-atual-funcionalidades-validadas-limpo (1).zip`
- Mantidos: hero e imagem mais atuais, APIs, dados, testes, layout e conteúdo da versão 2.9.7.

## Referência funcional

- `wagnerpersolifilho (5).zip`
- A pasta Git interna permitiu recuperar a versão íntegra e estável de `public/css/main.css` do commit `cd5ffab`, anterior à corrupção de comentários CSS.
- `public/js/main.js`, `api/chat.js`, `api/contact.js` e os demais scripts funcionais já eram idênticos aos da base atual e não foram rebaixados.

## Pacotes complementares conferidos

- `wagnerpersolifilho (6).zip`: mesma família funcional do pacote 5, contendo arquivos sensíveis e históricos que não devem integrar a entrega.
- `wagnerpersolifilho (7).zip`: contém a evolução do hero responsivo, mas também histórico Git e arquivos locais.
- `WAGNER-OS-v2.9.7-hero-responsivo-aprovado.zip`: utilizado para confirmar as regras mais recentes do hero.
- Pacotes intermediários “funcionalidades restauradas” e “funcionalidades validadas”: conferidos para evitar regressão de APIs, testes e conteúdo.

## Causa encontrada

O arquivo `public/css/main.css` da base atual estava textual e sintaticamente corrompido em comentários de seção. O bloco `:root` deixou de ser interpretado pelo navegador, eliminando variáveis como `--sab` e `--sat`. Como consequência, regras com `bottom: calc(... + var(--sab))` ficavam inválidas e os elementos fixos eram posicionados no fim do documento, fora da tela:

- botão do chat;
- painel do chat;
- WhatsApp e voltar ao topo;
- componentes auxiliares do modo apresentação e LGPD.

A correção restaura o CSS íntegro da referência funcional e mantém o hero 2.9.7 carregado por último, sem retrocesso visual.
