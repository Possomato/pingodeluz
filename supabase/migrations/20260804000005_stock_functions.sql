-- ─────────────────────────────────────────────────────────────
-- Movimentação de estoque atômica.
--
-- `products.stock` é um jsonb no formato {"2": 4, "4": 0} — tamanho →
-- quantidade. O decremento precisa ser atômico porque dois pagamentos
-- aprovados ao mesmo tempo poderiam vender a mesma última peça; o
-- `for update` serializa o acesso por linha de produto.
-- ─────────────────────────────────────────────────────────────

-- Baixa de estoque na aprovação do pagamento (ADR-3).
-- `items` é [{"id": "...", "size": "2", "qty": 1}, ...].
-- Lança ESTOQUE_INSUFICIENTE e desfaz tudo se qualquer item não couber.
create or replace function decrement_stock(items jsonb, p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item        jsonb;
  current_qty integer;
  wanted      integer;
begin
  for item in select * from jsonb_array_elements(items)
  loop
    wanted := (item ->> 'qty')::integer;

    select coalesce((stock ->> (item ->> 'size'))::integer, 0)
      into current_qty
      from products
     where id = item ->> 'id'
       for update;

    if not found then
      raise exception 'PRODUTO_INEXISTENTE:%', item ->> 'id';
    end if;

    if current_qty < wanted then
      raise exception 'ESTOQUE_INSUFICIENTE:%:%', item ->> 'id', item ->> 'size';
    end if;

    update products
       set stock = jsonb_set(
             coalesce(stock, '{}'::jsonb),
             array[item ->> 'size'],
             to_jsonb(current_qty - wanted)
           ),
           updated_at = now()
     where id = item ->> 'id';

    insert into stock_movements (product_id, size, delta, reason, order_id)
    values (item ->> 'id', item ->> 'size', -wanted, 'sale', p_order_id);
  end loop;
end;
$$;

-- Reposição ao cancelar ou reembolsar um pedido que já baixou estoque.
create or replace function restore_stock(items jsonb, p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item        jsonb;
  current_qty integer;
  amount      integer;
begin
  for item in select * from jsonb_array_elements(items)
  loop
    amount := (item ->> 'qty')::integer;

    select coalesce((stock ->> (item ->> 'size'))::integer, 0)
      into current_qty
      from products
     where id = item ->> 'id'
       for update;

    if not found then
      continue;  -- produto excluído depois da venda: nada a repor
    end if;

    update products
       set stock = jsonb_set(
             coalesce(stock, '{}'::jsonb),
             array[item ->> 'size'],
             to_jsonb(current_qty + amount)
           ),
           updated_at = now()
     where id = item ->> 'id';

    insert into stock_movements (product_id, size, delta, reason, order_id)
    values (item ->> 'id', item ->> 'size', amount, 'cancel', p_order_id);
  end loop;
end;
$$;

-- Ajuste manual feito pelo admin, com trilha de auditoria.
create or replace function adjust_stock(p_product_id text, p_size text, p_qty integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_qty integer;
begin
  select coalesce((stock ->> p_size)::integer, 0)
    into current_qty
    from products
   where id = p_product_id
     for update;

  if not found then
    raise exception 'PRODUTO_INEXISTENTE:%', p_product_id;
  end if;

  update products
     set stock = jsonb_set(coalesce(stock, '{}'::jsonb), array[p_size], to_jsonb(p_qty)),
         updated_at = now()
   where id = p_product_id;

  if p_qty <> current_qty then
    insert into stock_movements (product_id, size, delta, reason)
    values (p_product_id, p_size, p_qty - current_qty, 'adjustment');
  end if;
end;
$$;
