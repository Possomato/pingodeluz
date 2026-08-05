-- ─────────────────────────────────────────────────────────────
-- Dinheiro passa a ser integer em centavos (ADR-2).
--
-- Antes, preço era a string "R$ 189" e havia três parsers divergentes
-- espalhados pelo código. Agora existe uma única representação no banco
-- e a formatação acontece só na borda da UI (src/lib/money.ts).
-- ─────────────────────────────────────────────────────────────

-- ─── Produtos ────────────────────────────────────────────────

alter table products add column if not exists price_centavos integer;

-- Converte os preços em texto que já existem: "R$ 189" → 18900,
-- "R$ 189,90" → 18990. Só toca em linhas ainda não convertidas.
update products
   set price_centavos = round(
         replace(regexp_replace(price, '[^0-9,]', '', 'g'), ',', '.')::numeric * 100
       )::integer
 where price_centavos is null
   and price is not null
   and regexp_replace(price, '[^0-9]', '', 'g') <> '';

update products set price_centavos = 0 where price_centavos is null;

alter table products alter column price_centavos set default 0;
alter table products alter column price_centavos set not null;

-- Produto pode ser despublicado sem perder histórico de pedidos.
alter table products add column if not exists active     boolean     not null default true;
alter table products add column if not exists created_at timestamptz not null default now();
alter table products add column if not exists updated_at timestamptz not null default now();

-- ─── Pedidos: totais decompostos, em centavos ────────────────

alter table orders add column if not exists subtotal_centavos integer not null default 0;
alter table orders add column if not exists freight_centavos  integer not null default 0;
alter table orders add column if not exists discount_centavos integer not null default 0;
alter table orders add column if not exists total_centavos    integer not null default 0;
alter table orders add column if not exists coupon_code       text;
alter table orders add column if not exists order_number      text;
alter table orders add column if not exists updated_at        timestamptz not null default now();

-- Pagamento descrito de forma independente de provedor (ADR-1):
-- nada aqui menciona Mercado Pago.
alter table orders add column if not exists payment_provider    text;
alter table orders add column if not exists payment_external_id text;
alter table orders add column if not exists payment_method      text;

-- Migra os dados das colunas antigas, específicas do Mercado Pago.
update orders
   set payment_provider    = coalesce(payment_provider, case when mp_payment_id is not null then 'mercadopago' end),
       payment_external_id = coalesce(payment_external_id, mp_payment_id),
       payment_method      = coalesce(payment_method, mp_payment_method)
 where mp_payment_id is not null or mp_payment_method is not null;

-- Converte o total numérico antigo (em reais) para centavos.
update orders
   set total_centavos = round(total * 100)::integer
 where total_centavos = 0 and total is not null;

update orders
   set subtotal_centavos = total_centavos
 where subtotal_centavos = 0 and total_centavos <> 0;

-- Número de pedido amigável: PDL-10001, PDL-10002, …
create sequence if not exists order_number_seq start 10001;

update orders
   set order_number = 'PDL-' || nextval('order_number_seq')
 where order_number is null;

create unique index if not exists orders_order_number_idx on orders (order_number);

-- Status válidos do pedido. `pendente` é o estado inicial.
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('pendente', 'pago', 'enviado', 'entregue', 'cancelado', 'recusado', 'reembolsado'));

-- Agora que `products.active` existe, a vitrine passa a esconder
-- produtos despublicados. O admin continua vendo tudo: lê pelo
-- service role, que ignora RLS.
drop policy if exists "public read" on products;
create policy "public read" on products for select using (active);
