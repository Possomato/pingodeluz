-- Configuração global de pagamentos
create table if not exists payment_config (
  id text primary key default 'default',
  max_parcelas integer not null default 3,
  parcela_minima numeric not null default 50,
  juros text not null default 'sem'
);

-- Linha padrão
insert into payment_config (id, max_parcelas, parcela_minima, juros)
values ('default', 3, 50, 'sem')
on conflict (id) do nothing;
