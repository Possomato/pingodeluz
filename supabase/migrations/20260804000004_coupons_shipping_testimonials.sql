-- ─────────────────────────────────────────────────────────────
-- Cupons, frete configurável, depoimentos editáveis, idempotência de
-- webhook e auditoria de estoque.
-- ─────────────────────────────────────────────────────────────

-- ─── Cupons ──────────────────────────────────────────────────

create table if not exists coupons (
  code                  text primary key,          -- sempre em MAIÚSCULAS
  kind                  text not null check (kind in ('percent', 'fixed')),
  value                 integer not null,          -- percent: 10 = 10% | fixed: centavos
  min_subtotal_centavos integer not null default 0,
  max_uses              integer,                   -- null = ilimitado
  used_count            integer not null default 0,
  expires_at            timestamptz,
  active                boolean not null default true,
  created_at            timestamptz not null default now()
);

-- Sem policy pública: cupons só são lidos e validados no servidor,
-- para que ninguém consiga listar os códigos existentes.
alter table coupons enable row level security;

-- Incremento atômico de uso, respeitando o limite. Retorna false se o
-- cupom estourou o limite entre a validação e a criação do pedido.
create or replace function consume_coupon(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated integer;
begin
  update coupons
     set used_count = used_count + 1
   where code = upper(p_code)
     and active
     and (expires_at is null or expires_at > now())
     and (max_uses is null or used_count < max_uses);

  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

-- ─── Frete ───────────────────────────────────────────────────

create table if not exists shipping_config (
  id                   text primary key default 'default',
  flat_centavos        integer not null default 2400,
  free_above_centavos  integer not null default 25000,
  pix_discount_percent integer not null default 5
);

insert into shipping_config (id) values ('default') on conflict (id) do nothing;

alter table shipping_config enable row level security;
drop policy if exists "public read" on shipping_config;
create policy "public read" on shipping_config for select using (true);

-- ─── Depoimentos ─────────────────────────────────────────────

create table if not exists testimonials (
  id      uuid primary key default gen_random_uuid(),
  quote   text not null,
  author  text not null,
  role    text not null default '',
  sort    integer not null default 0,
  visible boolean not null default true
);

alter table testimonials enable row level security;
drop policy if exists "public read" on testimonials;
create policy "public read" on testimonials for select using (visible);

-- Semeia os depoimentos que estavam hardcoded em src/lib/data.ts.
insert into testimonials (quote, author, role, sort)
select * from (values
  ('A Manu vive nas roupas da Pingo. O tecido é macio de um jeito que parece carinho — e ela mesma escolhe o que vai vestir.', 'Marina Vasques', 'mãe da Manuela, 4', 1),
  ('Comprei o primeiro macacão do Theo na coleção Doce Aventura. Hoje guardo ele numa caixa — vai virar herança do irmão.', 'Beatriz Andrade', 'mãe do Theo, 2', 2),
  ('O cuidado com o acabamento se nota. As peças sobrevivem a três crianças sem perder a graça.', 'Luiza Caetano', 'mãe da Aurora, Liz e Cora', 3)
) as seed(quote, author, role, sort)
where not exists (select 1 from testimonials);

-- ─── Idempotência de webhook ─────────────────────────────────

-- Chave é "provider:eventId:status", então reentregas do mesmo evento
-- são descartadas mas uma mudança real de status é processada.
create table if not exists payment_events (
  id           text primary key,
  provider     text not null,
  order_id     uuid,
  payload      jsonb not null,
  processed_at timestamptz not null default now()
);

alter table payment_events enable row level security;

-- ─── Auditoria de estoque ────────────────────────────────────

create table if not exists stock_movements (
  id         uuid primary key default gen_random_uuid(),
  product_id text not null,
  size       text not null,
  delta      integer not null,   -- negativo = saída (venda)
  reason     text not null check (reason in ('sale', 'restock', 'adjustment', 'cancel')),
  order_id   uuid,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_product_idx on stock_movements (product_id, created_at desc);

alter table stock_movements enable row level security;
