-- ─────────────────────────────────────────────────────────────
-- Perfil de usuário consolidado, papel de administrador e rastreio.
--
-- Contexto: o código escrevia numa tabela `profiles` que nunca existiu
-- no banco (as gravações falhavam em silêncio, engolidas por um
-- try/catch). O perfil real sempre foi `public.users`. Esta migration
-- assume `users` como a tabela de perfil e garante que ela seja
-- preenchida automaticamente.
-- ─────────────────────────────────────────────────────────────

alter table users add column if not exists created_at timestamptz not null default now();
alter table users add column if not exists updated_at timestamptz not null default now();

-- Quem pode entrar no painel. Verificado server-side por
-- requireAdmin() (src/lib/admin-auth.ts) — nunca no cliente.
alter table users add column if not exists is_admin boolean not null default false;

-- ─── Criação automática do perfil no cadastro ────────────────

-- Antes isto dependia de uma Server Action chamada no callback de auth,
-- que falhava calada. Um trigger não tem como ser esquecido.
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email      = excluded.email,
        name       = coalesce(public.users.name, excluded.name),
        avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function handle_new_auth_user();

-- Preenche quem já se cadastrou antes do trigger existir.
insert into public.users (id, email, name, avatar_url)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(u.email, '@', 1)
  ),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;

-- ─── Trava contra autopromoção ───────────────────────────────

-- A policy de UPDATE deixa o usuário editar o próprio perfil (nome,
-- avatar). Sem esta trava, ele poderia incluir `is_admin = true` no
-- mesmo update e virar administrador. Só o service role promove.
create or replace function prevent_admin_self_promotion()
returns trigger
language plpgsql
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and auth.uid() is not null then
    raise exception 'PERMISSAO_NEGADA: is_admin não pode ser alterado pelo próprio usuário';
  end if;
  return new;
end;
$$;

drop trigger if exists users_block_self_promotion on users;
create trigger users_block_self_promotion
  before update on users
  for each row execute function prevent_admin_self_promotion();

-- Depois de aplicar, promova o dono da loja (rode como service role,
-- pelo SQL editor do Supabase):
--
--   update users set is_admin = true
--    where email = 'dono@exemplo.com';
--
-- Sem isso ninguém consegue acessar /admin.

-- ─── Entrega ─────────────────────────────────────────────────

alter table orders add column if not exists tracking_code text;

-- Sinaliza pedidos pagos cujo estoque não pôde ser baixado (a corrida
-- rara descrita no ADR-3). Aparecem destacados no admin.
alter table orders add column if not exists needs_attention  boolean not null default false;
alter table orders add column if not exists attention_reason text;
