-- ─────────────────────────────────────────────────────────────
-- Row Level Security em todas as tabelas.
--
-- Regra geral:
--   • Catálogo e configuração de vitrine → leitura pública, escrita
--     apenas via service role (que ignora RLS).
--   • Dados do cliente (favoritos, endereços, perfil) → o dono lê e escreve.
--   • Pedidos → o dono apenas LÊ. Escrita só pelo servidor.
--
-- O service role ignora RLS, então as Server Actions de admin seguem
-- funcionando. A fronteira de segurança real dessas actions é o
-- `requireAdmin()` (src/lib/admin-auth.ts) — RLS aqui é a última linha
-- de defesa, não a primeira (ADR-5).
-- ─────────────────────────────────────────────────────────────

-- ─── Catálogo: leitura pública ───────────────────────────────

alter table products        enable row level security;
alter table collections     enable row level security;
alter table size_tables     enable row level security;
alter table homepage_config enable row level security;
alter table payment_config  enable row level security;

drop policy if exists "public read" on products;
drop policy if exists "public read" on collections;
drop policy if exists "public read" on size_tables;
drop policy if exists "public read" on homepage_config;
drop policy if exists "public read" on payment_config;

-- A coluna `active` só nasce na migration seguinte; lá esta policy é
-- reescrita para esconder produtos despublicados da vitrine.
create policy "public read" on products        for select using (true);
create policy "public read" on collections     for select using (true);
create policy "public read" on size_tables     for select using (true);
create policy "public read" on homepage_config for select using (true);
create policy "public read" on payment_config  for select using (true);

-- ─── Dados do cliente: o dono lê e escreve ───────────────────

alter table users enable row level security;

drop policy if exists "own profile read" on users;
drop policy if exists "own profile update" on users;

create policy "own profile read" on users
  for select using (auth.uid() = id);

-- Sem `is_admin` na lista de colunas atualizáveis: a coluna existe, e
-- deixar o UPDATE aberto permitiria a alguém se autopromover. A trava
-- fica no trigger `users_block_self_promotion` (migration 000006).
create policy "own profile update" on users
  for update using (auth.uid() = id) with check (auth.uid() = id);

alter table favorites enable row level security;

drop policy if exists "own favorites" on favorites;
create policy "own favorites" on favorites
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table addresses enable row level security;

drop policy if exists "own addresses" on addresses;
create policy "own addresses" on addresses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Pedidos: o dono só lê ───────────────────────────────────

alter table orders enable row level security;

drop policy if exists "own orders read" on orders;
create policy "own orders read" on orders
  for select using (auth.uid() = user_id);
