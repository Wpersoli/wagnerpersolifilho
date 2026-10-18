-- WAGNER.OS — mensagens de contato com privilégio mínimo.
-- Execute no SQL Editor do Supabase. O papel anon pode somente INSERT.
begin;

create table if not exists public.mensagens_contato (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null check (char_length(btrim(nome)) between 2 and 80),
  email text not null check (
    char_length(email) between 3 and 254
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and email !~ E'[\r\n]'
  ),
  telefone text check (telefone is null or char_length(telefone) <= 40),
  assunto text not null check (char_length(btrim(assunto)) between 3 and 120),
  mensagem text not null check (char_length(btrim(mensagem)) between 12 and 2000),
  origem text not null default 'portfolio' check (origem in ('portfolio', 'blog', 'curriculo')),
  request_id text not null unique check (request_id ~ '^[A-Za-z0-9._:-]{8,100}$'),
  status text not null default 'new' check (status in ('new', 'notified', 'replied', 'spam', 'closed')),
  honeypot text not null default '' check (honeypot = '')
);

comment on table public.mensagens_contato is
  'Mensagens recebidas pelo portfólio. Acesso público restrito exclusivamente a INSERT.';

create index if not exists mensagens_contato_created_at_idx
  on public.mensagens_contato (created_at desc);
create index if not exists mensagens_contato_status_idx
  on public.mensagens_contato (status, created_at desc);

alter table public.mensagens_contato enable row level security;
alter table public.mensagens_contato force row level security;

revoke all on table public.mensagens_contato from public, anon, authenticated;

grant insert (
  nome,
  email,
  telefone,
  assunto,
  mensagem,
  origem,
  request_id
) on table public.mensagens_contato to anon;

drop policy if exists anon_insert_only_contact_messages on public.mensagens_contato;
create policy anon_insert_only_contact_messages
on public.mensagens_contato
for insert
to anon
with check (
  status = 'new'
  and honeypot = ''
  and char_length(btrim(nome)) between 2 and 80
  and char_length(email) between 3 and 254
  and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  and email !~ E'[\r\n]'
  and char_length(btrim(assunto)) between 3 and 120
  and char_length(btrim(mensagem)) between 12 and 2000
  and origem in ('portfolio', 'blog', 'curriculo')
  and request_id ~ '^[A-Za-z0-9._:-]{8,100}$'
);

-- Não existem políticas SELECT, UPDATE ou DELETE para anon/authenticated.
commit;
