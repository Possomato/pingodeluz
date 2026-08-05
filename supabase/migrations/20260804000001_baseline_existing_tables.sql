-- ─────────────────────────────────────────────────────────────
-- Baseline: tabelas que já existiam em produção antes de o schema
-- passar a ser versionado. Os tipos abaixo foram extraídos do banco
-- real (introspecção via PostgREST), não inferidos do código.
--
-- Tudo é idempotente (`if not exists`), então rodar contra o banco
-- atual não altera nada — a migration existe para permitir recriar o
-- ambiente do zero (local, staging, CI).
--
-- Nota histórica: o código chamava uma tabela `profiles` que nunca
-- existiu no banco; o perfil real sempre foi `public.users`. As
-- gravações em `profiles` falhavam em silêncio. Ver migration
-- 20260804000006, que consolida `users` como a tabela de perfil.
-- ─────────────────────────────────────────────────────────────

-- ─── Catálogo ────────────────────────────────────────────────

create table if not exists products (
  id             text primary key,
  name           text not null,
  name_parts     text[]  not null default '{}',
  col            text,
  price          text,
  tint           text,
  label          text    not null default '',
  installments   text,
  description    text,
  sizes          text[]  not null default '{}',
  unavail        text[]  not null default '{}',
  stock          jsonb   not null default '{}',
  gallery_labels text[]  not null default '{}',
  image_url      text,
  image_urls     jsonb   not null default '[]',
  gender         text,
  collection_id  text,
  product_type   text,
  size_table_id  text
);

create table if not exists collections (
  id        text primary key,
  slug      text,
  name      text[] not null default '{}',
  eyebrow   text,
  tint      text,
  intro     text,
  image_url text,
  count     integer not null default 0
);

-- ─── Conta do cliente ────────────────────────────────────────

-- Espelho de auth.users com os campos que a aplicação exibe.
-- Populada pelo trigger definido na migration 20260804000006.
create table if not exists users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  name       text,
  avatar_url text
);

create table if not exists addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  label        text not null default '',
  zip          text not null default '',
  street       text not null default '',
  number       text not null default '',
  complement   text,
  neighborhood text not null default '',
  city         text not null default '',
  state        text not null default '',
  created_at   timestamptz not null default now()
);

create index if not exists addresses_user_id_idx on addresses (user_id);

create table if not exists favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists favorites_user_product_idx
  on favorites (user_id, product_id);

-- ─── Pedidos ─────────────────────────────────────────────────

create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete set null,
  items             jsonb not null default '[]',
  total             numeric,
  status            text not null default 'pendente',
  address           jsonb not null default '{}',
  mp_payment_id     text,
  mp_payment_method text,
  created_at        timestamptz not null default now()
);

create index if not exists orders_user_id_idx on orders (user_id);

-- ─── Vitrine e configuração ──────────────────────────────────

create table if not exists homepage_config (
  id         text primary key,
  visible    boolean not null default true,
  image_urls text[]  not null default '{}',
  updated_at timestamptz not null default now()
);

insert into homepage_config (id) values
  ('meninas'), ('meninos'), ('queridos'), ('manifesto'),
  ('colecoes'), ('fases'), ('depoimentos'), ('instagram')
on conflict (id) do nothing;

create table if not exists size_tables (
  id      text primary key,
  name    text not null,
  columns jsonb not null default '[]',
  rows    jsonb not null default '[]'
);

create table if not exists payment_config (
  id              text primary key default 'default',
  max_parcelas    integer not null default 3,
  parcela_minima  numeric not null default 50,
  juros           text    not null default 'sem'
);

insert into payment_config (id) values ('default') on conflict (id) do nothing;
