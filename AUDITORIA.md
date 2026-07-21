# Auditoria do release 2.1.1

Data da auditoria: julho de 2026.

## Escopo

- sintaxe JavaScript do frontend, emulador e funções Serverless
- testes automatizados do chat e do formulário
- dependências e vulnerabilidades conhecidas
- estrutura HTML, IDs, âncoras, arquivos locais e nomes acessíveis
- CSS, responsividade e overflow horizontal
- chat, formulário, menu mobile e modo apresentação em navegador headless
- higiene do pacote e busca por credenciais

## Correções aplicadas

- remoção de `.git`, `.vercel`, `.env.local`, `node_modules` e metadados locais do pacote final
- exclusão dos ativos e do código legado da caveira, que não eram utilizados pela interface Cyber Metal
- correção de overflow horizontal no documento
- favicon alinhado ao monograma WP
- imagem Open Graph atualizada para a interface atual
- endpoint de contato com limite de payload e verificação de origem
- rota e configuração explícitas de `/api/contact` na Vercel
- testes automatizados do formulário adicionados
- `.gitignore` normalizado e sem regras duplicadas
- versão atualizada para `2.1.1`

## Resultado

- testes automatizados: 13 aprovados
- navegador desktop 1440 px: aprovado, sem overflow horizontal
- navegador tablet 1024 px: aprovado, sem overflow horizontal
- navegador mobile 390 px: aprovado, menu e modo apresentação operacionais
- chat e formulário com respostas simuladas: aprovados
- emulador: zoom, rotação e seletor de dispositivo aprovados
- vulnerabilidades npm em nível alto ou superior: 0
- referências locais ausentes: 0
- IDs HTML duplicados: 0
- erros de parsing CSS: 0
- credenciais incluídas no pacote final: 0

## Observação de segurança

O ZIP recebido para auditoria continha um arquivo `.env.local` com um token local da Vercel. Esse arquivo foi excluído integralmente do release. Tokens e arquivos de ambiente nunca devem ser enviados ou versionados.
