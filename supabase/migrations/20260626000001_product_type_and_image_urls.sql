alter table products add column if not exists product_type text;
alter table products add column if not exists image_urls jsonb not null default '[]';
