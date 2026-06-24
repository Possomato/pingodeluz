create table if not exists homepage_config (
  id text primary key,
  visible boolean not null default true,
  image_urls text[] not null default '{}',
  updated_at timestamptz not null default now()
);

insert into homepage_config (id) values
  ('meninas'), ('meninos'), ('queridos'), ('manifesto'),
  ('colecoes'), ('fases'), ('depoimentos'), ('instagram')
on conflict (id) do nothing;
