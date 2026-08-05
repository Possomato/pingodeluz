-- ─────────────────────────────────────────────────────────────
-- Conteúdo editorial do produto que estava fixo no componente.
--
-- A página de produto afirmava, para TODA peça, que era "100% musselina
-- de algodão orgânico certificado GOTS" e feita pela "Cooperativa Flor
-- de Lis, Pirapora — MG". Texto de demonstração escrito como fato sobre
-- o produto. Agora é campo por produto; vazio esconde a seção.
-- ─────────────────────────────────────────────────────────────

alter table products add column if not exists composition  text;
alter table products add column if not exists made_by      text;
alter table products add column if not exists care_info    text;

-- Texto de envio e trocas é o mesmo para a loja inteira.
alter table shipping_config add column if not exists shipping_info text
  default 'Envio em até 3 dias úteis. Trocas em até 30 dias.';

update shipping_config
   set shipping_info = 'Envio em até 3 dias úteis. Trocas em até 30 dias.'
 where shipping_info is null;
