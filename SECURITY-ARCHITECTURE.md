# Arquitetura de segurança

## Fluxo de contato

```text
Browser
  -> POST /api/contact
  -> validação de origem, Fetch Metadata e Content-Type
  -> limite de payload + honeypot + rate limit
  -> normalização NFC + remoção de controles + validação de tipos
  -> Supabase REST com publishable key e RLS INSERT-only
  -> Brevo server-side com API key privada
  -> resposta amigável mesmo em degradação parcial
```

## Controles principais

- Nenhuma chave Brevo é enviada ao navegador.
- Supabase usa `Prefer: return=minimal`, evitando dependência de política SELECT.
- SQL não é montado por concatenação; o payload é JSON estruturado para PostgREST.
- Conteúdo HTML do e-mail é escapado antes da interpolação.
- Assunto, nome, telefone e e-mail são convertidos para linha única.
- Timeouts usam `AbortController`.
- Respostas de API usam `Cache-Control: no-store`.
- CSP bloqueia scripts desconhecidos e handlers inline.
- `frame-ancestors 'none'` e `X-Frame-Options: DENY` bloqueiam clickjacking.
- HSTS, `nosniff`, COOP, CORP, Permissions Policy e Referrer Policy estão ativos.
