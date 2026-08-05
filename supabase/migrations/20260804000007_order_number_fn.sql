-- ─────────────────────────────────────────────────────────────
-- Número de pedido e índices de consulta.
-- ─────────────────────────────────────────────────────────────

-- A sequência garante unicidade sem race condition entre dois pedidos
-- simultâneos; gerar no servidor de aplicação exigiria travar a tabela.
create or replace function next_order_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'PDL-' || nextval('order_number_seq');
$$;

-- Listagem do admin: filtro por status ordenado por data.
create index if not exists orders_status_created_idx
  on orders (status, created_at desc);

create index if not exists orders_created_idx
  on orders (created_at desc);

-- Busca de pedido por identificador do provedor, usada pelo webhook.
create index if not exists orders_payment_external_idx
  on orders (payment_external_id);
