-- ─────────────────────────────────────────────────────────────
-- Fecha o acesso público às funções de escrita.
--
-- O Supabase expõe toda função do schema `public` em /rest/v1/rpc/*.
-- Por padrão `anon` e `authenticated` têm EXECUTE em funções novas, e as
-- funções abaixo são `security definer` (ignoram RLS). Resultado: com a
-- chave anon — que é pública, vai no navegador — qualquer visitante
-- podia alterar estoque, gastar cupons e queimar números de pedido.
--
-- Todas são chamadas apenas pelo servidor, com o service role.
-- ─────────────────────────────────────────────────────────────

revoke execute on function decrement_stock(jsonb, uuid)         from public, anon, authenticated;
revoke execute on function restore_stock(jsonb, uuid)           from public, anon, authenticated;
revoke execute on function adjust_stock(text, text, integer)    from public, anon, authenticated;
revoke execute on function consume_coupon(text)                 from public, anon, authenticated;
revoke execute on function next_order_number()                  from public, anon, authenticated;

grant execute on function decrement_stock(jsonb, uuid)         to service_role;
grant execute on function restore_stock(jsonb, uuid)           to service_role;
grant execute on function adjust_stock(text, text, integer)    to service_role;
grant execute on function consume_coupon(text)                 to service_role;
grant execute on function next_order_number()                  to service_role;

-- Funções criadas daqui em diante nascem fechadas; quem precisar de
-- acesso público libera explicitamente com `grant execute`.
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;
