-- Tabelas de tamanho configuráveis
create table if not exists size_tables (
  id text primary key,
  name text not null,
  columns jsonb not null default '[]',
  rows jsonb not null default '[]'
);

-- Coluna de referência em products
alter table products
  add column if not exists size_table_id text references size_tables(id);
