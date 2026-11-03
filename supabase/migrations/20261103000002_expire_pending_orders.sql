-- ─────────────────────────────────────────────────────────────
-- Expiração de pedidos pendentes.
--
-- O cupom é consumido na criação do pedido (checkout.ts), então um
-- carrinho abandonado no Mercado Pago "gasta" um uso do cupom para
-- sempre. Esta função cancela pedidos que ficaram pendentes além do
-- prazo e devolve o uso do cupom, na mesma transação.
--
-- Prazo padrão de 5 dias: o boleto do Mercado Pago vence em até 3 dias
-- úteis e ainda precisa de folga para a compensação. Se um pagamento
-- chegar depois, o webhook ainda leva o pedido de `cancelado` para `pago`.
-- ─────────────────────────────────────────────────────────────

create or replace function expire_pending_orders(p_max_age interval default interval '5 days')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired integer := 0;
  o       record;
begin
  for o in
    select id, coupon_code
      from orders
     where status = 'pendente'
       and created_at < now() - p_max_age
       for update skip locked
  loop
    update orders
       set status = 'cancelado',
           updated_at = now()
     where id = o.id;

    if o.coupon_code is not null then
      update coupons
         set used_count = greatest(used_count - 1, 0)
       where code = upper(o.coupon_code);
    end if;

    expired := expired + 1;
  end loop;

  return expired;
end;
$$;

revoke execute on function expire_pending_orders(interval) from public, anon, authenticated;
grant  execute on function expire_pending_orders(interval) to service_role;
