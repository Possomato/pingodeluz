# Production-Ready Design — Pingo de Luz

**Date:** 2026-05-14
**Scope:** Replace demo localStorage with Supabase (Postgres + Storage + Auth), add Google login for customers, integrate Mercado Pago Checkout Pro.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 App Router |
| Banco de dados | Supabase Postgres |
| Storage (imagens) | Supabase Storage |
| Auth (clientes) | Supabase Auth + Google OAuth |
| Pagamento | Mercado Pago Checkout Pro |
| Deploy | Vercel |

Admin mantém senha hardcoded (`pingo2024`) — sem mudança.

---

## Banco de dados (Supabase Postgres)

```sql
-- Produtos gerenciados pelo admin
products (
  id          text primary key,
  name        text,
  price       text,
  sizes       text[],
  tint        text,
  collection_id text references collections(id),
  image_url   text,
  gallery_labels text[],
  unavail     text[],
  stock       jsonb,
  gender      text,
  desc        text,
  installments text,
  col         text,
  label       text,
  name_parts  text[]
)

-- Coleções gerenciadas pelo admin
collections (
  id          text primary key,
  slug        text unique,
  name        text[],
  eyebrow     text,
  tint        text,
  intro       text,
  image_url   text,
  count       int
)

-- Usuários (criados automaticamente pelo Supabase Auth)
users (
  id          uuid primary key references auth.users(id),
  email       text,
  name        text,
  avatar_url  text
)

-- Endereços dos clientes
addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id),
  label       text,           -- "Casa", "Trabalho"
  street      text,
  city        text,
  state       text,
  zip         text
)

-- Pedidos
orders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references users(id),
  items             jsonb,    -- snapshot dos produtos no momento da compra
  total             numeric,
  status            text,     -- 'pendente' | 'pago' | 'recusado' | 'cancelado'
  mp_payment_id     text,
  mp_payment_method text,
  address           jsonb,    -- snapshot do endereço no momento da compra
  created_at        timestamptz default now()
)
```

### Row Level Security (RLS)

- `products`, `collections`: leitura pública; escrita apenas via service key (admin)
- `addresses`, `orders`: usuário só lê/escreve os próprios registros
- `users`: usuário só lê/escreve o próprio perfil

---

## Auth — Supabase + Google OAuth

**Fluxo:**
1. Cliente clica "Entrar com Google" em `/perfil`
2. Redireciona para Google → volta para `/auth/callback`
3. `src/app/auth/callback/route.ts` troca o code por sessão
4. Supabase gerencia cookies de sessão via `@supabase/ssr`
5. `/perfil` detecta sessão → exibe nome, foto, pedidos e endereços

**Sessão:** cookie JWT gerenciado pelo `@supabase/ssr`. Server Components leem a sessão no servidor.

---

## Imagens — Supabase Storage

**Fluxo no admin:**
1. Admin seleciona foto no formulário
2. Upload direto para bucket `product-images` via Server Action
3. Supabase retorna URL pública do CDN
4. URL salva no campo `image_url` da tabela `products` ou `collections`
5. Storefront usa `<Image src={image_url}>` — carrega do CDN do Supabase

---

## Checkout — Mercado Pago Checkout Pro

**Fluxo:**
1. Cliente chega em `/checkout` — redireciona para `/perfil` se não logado
2. Preenche/confirma endereço (pré-preenchido com último endereço salvo)
3. Clica "Finalizar pedido" → Server Action:
   - Cria pedido no Supabase com `status: 'pendente'`
   - Cria preferência no MP com itens, valor, `back_urls` e `notification_url`
   - Retorna `init_point` (URL do checkout MP)
4. Cliente é redirecionado para o checkout do MP
5. Após pagar, MP redireciona para `/confirmacao?order_id=xxx`
6. Em paralelo, MP envia webhook POST para `/api/webhooks/mercadopago`
7. Webhook valida assinatura HMAC-SHA256 → atualiza pedido:
   - `status: 'pago'` (ou `'recusado'`)
   - `mp_payment_id`, `mp_payment_method`
8. `/confirmacao` busca o pedido pelo `order_id` e exibe os detalhes

---

## Middleware

`middleware.ts` protege as rotas que exigem sessão:

```ts
// Rotas protegidas: /checkout, /confirmacao
// Se sem sessão → redirect para /perfil?redirect=/checkout
```

---

## Arquivos que mudam

| Arquivo | Mudança |
|---|---|
| `src/lib/supabase.ts` | Novo — cliente Supabase (server + browser) |
| `src/lib/data.ts` | Funções leem do Supabase em vez de estáticos |
| `src/context/AdminContext.tsx` | Server Actions substituem localStorage |
| `src/app/auth/callback/route.ts` | Novo — callback OAuth Google |
| `src/app/api/webhooks/mercadopago/route.ts` | Novo — webhook de pagamento |
| `src/app/actions/` | Novo — Server Actions (products, orders, addresses) |
| `src/app/perfil/page.tsx` | Login Google + pedidos + endereços reais |
| `src/app/checkout/page.tsx` | Exige sessão, cria pedido + redireciona para MP |
| `src/app/confirmacao/page.tsx` | Mostra pedido real do Supabase |
| `src/app/admin/produtos/[id]/page.tsx` | Upload de imagem para Supabase Storage |
| `middleware.ts` | Novo — protege `/checkout` e `/confirmacao` |

## Pacotes novos

```bash
npm install @supabase/ssr @supabase/supabase-js mercadopago
```

---

## Variáveis de ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=https://pingo-de-luz.vercel.app
```
