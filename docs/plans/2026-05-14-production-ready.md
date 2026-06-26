# Production-Ready Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Pingo de Luz de demo (localStorage) para produção com Supabase (Postgres + Storage + Auth), Google OAuth para clientes e Mercado Pago Checkout Pro.

**Architecture:** Supabase centraliza banco, storage e auth. Server Actions substituem localStorage no admin. Server Components fazem data fetching no storefront. Mercado Pago Checkout Pro com webhook atualiza status do pedido.

**Tech Stack:** Next.js 15 App Router, Supabase (`@supabase/ssr`), Mercado Pago Node SDK (`mercadopago`), Google OAuth via Supabase Auth.

**Working directory:** `/Users/espanhafacil/Documents/www/pingo-de-luz-v2` (main branch)

---

## Task 1: Instalar pacotes + configurar Supabase client

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `.env.local` (não commitado)

### Step 1: Instalar pacotes

```bash
npm install @supabase/ssr @supabase/supabase-js mercadopago
```

Expected: packages added to package.json, no errors.

### Step 2: Criar `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...anon...
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role...
MERCADOPAGO_ACCESS_TOKEN=TEST-...
MERCADOPAGO_WEBHOOK_SECRET=minha-chave-secreta
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Step 3: Criar `src/lib/supabase.ts`

```ts
import { createServerClient } from '@supabase/ssr';
import { createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Browser client — use in 'use client' components
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Server client — use in Server Components and Server Actions
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

// Service role client — use only in Server Actions and webhooks (never expose to client)
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}
```

### Step 4: Verificar build

```bash
npm run build 2>&1 | tail -5
```

Expected: clean build.

### Step 5: Commit

```bash
git add src/lib/supabase.ts package.json package-lock.json
git commit -m "feat: install Supabase + Mercado Pago, add supabase client"
```

---

## Task 2: Schema do banco de dados

**Files:** Executar SQL diretamente no Supabase Dashboard → SQL Editor

### Step 1: Criar tabelas

Acesse seu projeto no Supabase → **SQL Editor** → cole e execute:

```sql
-- Produtos gerenciados pelo admin
create table if not exists products (
  id text primary key,
  name text not null,
  name_parts text[] not null default '{}',
  col text,
  price text,
  tint text,
  label text,
  installments text,
  description text,
  sizes text[] default '{}',
  unavail text[] default '{}',
  stock jsonb default '{}',
  gallery_labels text[] default '{}',
  image_url text,
  gender text,
  collection_id text
);

-- Coleções gerenciadas pelo admin
create table if not exists collections (
  id text primary key,
  slug text unique,
  name text[] not null default '{}',
  eyebrow text,
  tint text,
  intro text,
  image_url text,
  count int default 0
);

-- Usuários (espelho do Supabase Auth)
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  avatar_url text
);

-- Endereços dos clientes
create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  label text default 'Casa',
  street text,
  complement text,
  neighborhood text,
  city text,
  state text,
  zip text,
  created_at timestamptz default now()
);

-- Pedidos
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  items jsonb not null default '[]',
  total numeric not null,
  status text not null default 'pendente',
  mp_payment_id text,
  mp_payment_method text,
  address jsonb,
  created_at timestamptz default now()
);
```

### Step 2: Configurar Row Level Security

```sql
-- Habilitar RLS
alter table products enable row level security;
alter table collections enable row level security;
alter table users enable row level security;
alter table addresses enable row level security;
alter table orders enable row level security;

-- Products e Collections: leitura pública
create policy "products_public_read" on products for select using (true);
create policy "collections_public_read" on collections for select using (true);

-- Users: cada um acessa só o próprio perfil
create policy "users_own" on users for all using (auth.uid() = id);

-- Addresses: cada um acessa só os próprios
create policy "addresses_own" on addresses for all using (auth.uid() = user_id);

-- Orders: cada um acessa só os próprios
create policy "orders_own" on orders for all using (auth.uid() = user_id);
```

### Step 3: Trigger para criar user na tabela após auth

```sql
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

### Step 4: Criar bucket de imagens no Storage

No Supabase → **Storage** → **New bucket**:
- Name: `product-images`
- Public: ✅ sim

---

## Task 3: Seed dos dados estáticos para o Supabase

**Files:**
- Create: `src/scripts/seed.ts`

### Step 1: Criar script de seed

```ts
// src/scripts/seed.ts
import { createClient } from '@supabase/supabase-js';
import { HOME_PRODUCTS, COLLECTIONS } from '../lib/data';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seed() {
  // Seed collections
  const cols = Object.values(COLLECTIONS).map(c => ({
    id: c.id,
    slug: c.id,
    name: c.name,
    eyebrow: c.eyebrow,
    tint: c.tint,
    intro: c.intro,
    count: c.count,
    image_url: c.imageUrl ?? null,
  }));
  const { error: colErr } = await supabase.from('collections').upsert(cols);
  if (colErr) { console.error('collections:', colErr); return; }
  console.log(`✓ ${cols.length} collections seeded`);

  // Seed products
  const prods = HOME_PRODUCTS.map(p => ({
    id: p.id,
    name: p.name,
    name_parts: p.nameParts,
    col: p.col,
    price: p.price,
    tint: p.tint,
    label: p.label,
    installments: p.installments ?? null,
    description: p.desc ?? null,
    sizes: p.sizes ?? [],
    unavail: p.unavail ?? [],
    stock: p.stock ?? {},
    gallery_labels: p.galleryLabels ?? [],
    image_url: p.imageUrl ?? null,
    gender: p.gender ?? null,
    collection_id: p.col?.includes('Jardim') ? 'jardim' : p.col?.includes('Doce') ? 'doce' : null,
  }));
  const { error: prodErr } = await supabase.from('products').upsert(prods);
  if (prodErr) { console.error('products:', prodErr); return; }
  console.log(`✓ ${prods.length} products seeded`);
}

seed().then(() => process.exit(0));
```

### Step 2: Adicionar script ao package.json

No `package.json`, em `scripts`:
```json
"seed": "tsx src/scripts/seed.ts"
```

### Step 3: Rodar o seed

```bash
npm install -D tsx
npx tsx src/scripts/seed.ts
```

Expected:
```
✓ 2 collections seeded
✓ 5 products seeded
```

### Step 4: Verificar no Supabase Dashboard → Table Editor → products e collections

### Step 5: Commit

```bash
git add src/scripts/seed.ts package.json package-lock.json
git commit -m "feat: seed script for initial products and collections"
```

---

## Task 4: Middleware + auth callback

**Files:**
- Create: `middleware.ts`
- Create: `src/app/auth/callback/route.ts`

### Step 1: Criar `middleware.ts` na raiz do projeto

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const protectedPaths = ['/checkout', '/confirmacao'];
  if (!user && protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = '/perfil';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/checkout/:path*', '/confirmacao/:path*'],
};
```

### Step 2: Criar `src/app/auth/callback/route.ts`

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/perfil';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/perfil?error=auth`);
}
```

### Step 3: Configurar Google OAuth no Supabase

No Supabase Dashboard → **Authentication → Providers → Google**:
1. Habilite Google
2. Copie a **Callback URL** (ex: `https://xxx.supabase.co/auth/v1/callback`)
3. No [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs: cole a Callback URL do Supabase
4. Copie **Client ID** e **Client Secret** de volta para o Supabase

### Step 4: Verificar build

```bash
npm run build 2>&1 | tail -5
```

### Step 5: Commit

```bash
git add middleware.ts src/app/auth/callback/route.ts
git commit -m "feat: middleware auth guard + Google OAuth callback"
```

---

## Task 5: Login Google no /perfil

**Files:**
- Modify: `src/app/perfil/page.tsx`
- Modify: `src/context/UserContext.tsx` (remover mock, delegar ao Supabase)

### Step 1: Reescrever `src/app/perfil/page.tsx`

Leia o arquivo atual primeiro. A estrutura permanece igual (mesmas classes CSS, mesmo layout). Apenas troque a lógica de auth:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconChevronLeft, IconBag } from '@/components/Icons';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function PerfilPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cartCount } = useCart();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    const redirectTo = searchParams.get('redirect') ?? '/perfil';
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}`,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) return null;

  if (!user) {
    // Manter o JSX de login EXATAMENTE como está, só trocar o handler:
    // - Remover: const handleGoogle = () => { setLoading(true); setTimeout(() => { login(MOCK_USER); ... }
    // - Adicionar: onClick={handleGoogleLogin}
    // - Remover imports de UserContext e MOCK_USER
    return (
      <div className="pdl-app">
        <div className={`pdl-back-bar ${scrolled ? 'solid' : ''}`}>
          <button onClick={() => router.back()} aria-label="Voltar"><IconChevronLeft size={18} /></button>
          <span className="pdl-back-title">Entrar</span>
          <button onClick={() => router.push('/carrinho')} aria-label="Sacola" style={{ position: 'relative' }}>
            <IconBag size={16} />
            {cartCount > 0 && <span className="pdl-bag-count">{cartCount}</span>}
          </button>
        </div>
        <div className="pdl-login">
          <div className="pdl-login-logo">
            <span className="pdl-login-spark">Pingo</span>
            <em>de luz</em>
          </div>
          <h2 className="pdl-login-welcome">Bem-vinda <em>de volta.</em></h2>
          <div className="pdl-login-sub">
            Entre para ver seus pedidos, salvar endereços e acompanhar as peças favoritas.
          </div>
          <button className="pdl-google-btn" onClick={handleGoogleLogin}>
            <svg width="16" height="16" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  const name = user.user_metadata?.full_name ?? user.email ?? 'Cliente';
  const avatar = user.user_metadata?.avatar_url;

  // Manter o JSX do perfil logado, substituindo MOCK_USER por `user`
  // - nome: name
  // - avatar: avatar ?? null (mostrar inicial se sem foto)
  // - Remover seções de favoritos e preferências (não implementadas ainda)
  // - Seção de pedidos: placeholder "seus pedidos aparecerão aqui" por enquanto
  // - Seção de endereços: placeholder por enquanto (Task 9)
  // - Botão logout: onClick={handleLogout}
  return (
    <div className="pdl-app">
      {/* manter back-bar igual */}
      <div className="pdl-profile">
        <div className="pdl-profile-hero">
          {avatar
            ? <img src={avatar} alt={name} width={64} height={64} style={{ borderRadius: '50%' }} />
            : <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--cream-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{name[0]}</div>
          }
          <div style={{ marginTop: 12 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 20 }}>{name}</div>
            <div style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--muted)' }}>{user.email}</div>
          </div>
        </div>

        <div className="pdl-profile-section">
          <h3>Meus pedidos</h3>
          <div style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-soft)' }}>
            Seus pedidos aparecerão aqui.
          </div>
        </div>

        <div className="pdl-profile-section">
          <h3>Endereços</h3>
          <div style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-soft)' }}>
            Nenhum endereço salvo ainda.
          </div>
        </div>

        <div className="pdl-logout" onClick={handleLogout}>sair da conta</div>
      </div>
    </div>
  );
}
```

**Remover** imports de `UserContext` e `MOCK_USER`/`MOCK_ORDERS`/`MOCK_ADDRESSES` do arquivo.

### Step 2: Verificar build

```bash
npm run build 2>&1 | tail -5
```

### Step 3: Testar localmente

```bash
npm run dev
```

Abra `http://localhost:3000/perfil` → clicar "Entrar com Google" deve redirecionar para Google e voltar logado.

### Step 4: Commit

```bash
git add src/app/perfil/page.tsx
git commit -m "feat: Google OAuth login for customers via Supabase Auth"
```

---

## Task 6: Storefront lê do Supabase

**Files:**
- Modify: `src/lib/data.ts`
- Modify: `src/app/colecao/[id]/page.tsx`
- Modify: `src/app/genero/[id]/page.tsx`
- Modify: `src/app/produto/[id]/page.tsx`

### Step 1: Adicionar funções async ao `src/lib/data.ts`

Manter tudo que existe (interfaces, constantes estáticas, funções síncronas como fallback). Adicionar no final do arquivo:

```ts
// ─── Supabase async fetchers ────────────────────────────────
// Mapeamento de snake_case do banco para camelCase do front
function rowToProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    name: row.name as string,
    nameParts: (row.name_parts as [string, string]) ?? [row.name as string, ''],
    col: row.col as string,
    price: row.price as string,
    tint: row.tint as string,
    label: row.label as string,
    installments: row.installments as string | undefined,
    desc: row.description as string | undefined,
    sizes: row.sizes as string[] | undefined,
    unavail: row.unavail as string[] | undefined,
    stock: row.stock as Record<string, number> | undefined,
    galleryLabels: row.gallery_labels as string[] | undefined,
    imageUrl: row.image_url as string | undefined,
    gender: row.gender as 'meninas' | 'meninos' | 'unissex' | undefined,
  };
}

function rowToCollection(row: Record<string, unknown>, products: Product[]): Collection {
  const colProducts = products.filter(p => p.col === (row.name as string[]).join(' '));
  return {
    id: row.id as string,
    name: row.name as [string, string],
    eyebrow: row.eyebrow as string,
    tint: row.tint as string,
    intro: row.intro as string,
    count: row.count as number ?? colProducts.length,
    products: colProducts,
    imageUrl: row.image_url as string | undefined,
  };
}

export async function fetchCatalog(): Promise<Product[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/products?select=*`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return HOME_PRODUCTS;
    const rows = await res.json();
    return rows.map(rowToProduct);
  } catch {
    return HOME_PRODUCTS;
  }
}

export async function fetchCollections(): Promise<Record<string, Collection>> {
  try {
    const [colRes, prodRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/collections?select=*`, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        next: { revalidate: 60 },
      }),
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/products?select=*`, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        next: { revalidate: 60 },
      }),
    ]);
    if (!colRes.ok || !prodRes.ok) return COLLECTIONS;
    const colRows = await colRes.json();
    const prodRows = await prodRes.json();
    const products = prodRows.map(rowToProduct);
    const result: Record<string, Collection> = {};
    for (const row of colRows) {
      result[row.id] = rowToCollection(row, products);
    }
    return result;
  } catch {
    return COLLECTIONS;
  }
}

export async function fetchProductById(id: string): Promise<Product> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/products?id=eq.${id}&select=*`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return getProductById(id);
    const rows = await res.json();
    if (!rows.length) return getProductById(id);
    return rowToProduct(rows[0]);
  } catch {
    return getProductById(id);
  }
}
```

### Step 2: Converter `src/app/colecao/[id]/page.tsx` para Server Component

O componente atual é `'use client'` por causa de `useState` (filter, scrolled) e `useRouter`. A estratégia: criar um Server Component wrapper que busca dados, e manter a interatividade num Client Component.

Crie um novo arquivo `src/components/ColecaoClient.tsx` com TODO o JSX atual da página (com os useState, useEffect, router etc.), recebendo `c` e `filters` como props:

```tsx
// src/components/ColecaoClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PdlDrawer from '@/components/PdlDrawer';
import PdlFooter from '@/components/PdlFooter';
import PdlImg from '@/components/PdlImg';
import { IconChevronLeft, IconSearch, IconBag, IconChevronDown } from '@/components/Icons';
import { useCart } from '@/context/CartContext';
import type { Collection } from '@/lib/data';

interface Props {
  c: Collection;
  filters: string[];
}

export default function ColecaoClient({ c, filters }: Props) {
  const router = useRouter();
  const { cartCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [filter, setFilter] = useState('todas');

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 280);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // ... todo o JSX atual de ColecaoPage, usando c e filters como props
  // Manter EXATAMENTE o mesmo HTML/JSX, apenas substituindo as referências a
  // collections[id] por c, e filters por filters
  return (
    <div className="pdl-app">
      {/* ... colar todo o JSX atual aqui ... */}
    </div>
  );
}
```

Então `src/app/colecao/[id]/page.tsx` vira Server Component:

```tsx
// src/app/colecao/[id]/page.tsx
import ColecaoClient from '@/components/ColecaoClient';
import { fetchCollections } from '@/lib/data';

export default async function ColecaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collections = await fetchCollections();
  const c = collections[id] ?? collections.jardim;
  const filters = ['todas', '0–2 anos', '3–6 anos', '7–12 anos', 'vestidos', 'conjuntos', 'sob encomenda'];
  return <ColecaoClient c={c} filters={filters} />;
}
```

**Nota:** O `'use client'` na linha 1 é REMOVIDO de `colecao/[id]/page.tsx`. Todos os imports de hooks (useState, useEffect, useRouter, useParams) também são removidos de `page.tsx` — ficam apenas em `ColecaoClient.tsx`.

### Step 3: Aplicar mesmo padrão em `src/app/genero/[id]/page.tsx`

Criar `src/components/GeneroClient.tsx` com o JSX atual, recebendo `g`, `products`, `colChips` como props.

`src/app/genero/[id]/page.tsx` vira:

```tsx
import GeneroClient from '@/components/GeneroClient';
import { fetchCollections } from '@/lib/data';
import { GENDER_DATA } from '@/lib/data';

export default async function GeneroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collections = await fetchCollections();
  const g = GENDER_DATA[id] ?? GENDER_DATA.meninas;
  const products = g.collections.flatMap(cid => {
    const c = collections[cid];
    if (!c) return [];
    return c.products.map(p => ({ ...p, colName: c.name.join(' '), colId: cid }));
  });
  const colChips = g.collections.map(cid => collections[cid]?.name.join(' ') ?? '');
  return <GeneroClient g={g} products={products} colChips={colChips} collections={collections} />;
}
```

### Step 4: Converter `src/app/produto/[id]/page.tsx`

Mover JSX para `src/components/ProdutoClient.tsx`, page.tsx vira:

```tsx
import ProdutoClient from '@/components/ProdutoClient';
import { fetchProductById } from '@/lib/data';

export default async function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await fetchProductById(id);
  return <ProdutoClient p={p} id={id} />;
}
```

### Step 5: Verificar build

```bash
npm run build 2>&1 | tail -10
```

Expected: 0 TypeScript errors.

### Step 6: Commit

```bash
git add src/lib/data.ts src/app/colecao src/app/genero src/app/produto src/components/
git commit -m "feat: storefront reads products and collections from Supabase"
```

---

## Task 7: Admin grava no Supabase

**Files:**
- Create: `src/app/actions/admin.ts`
- Modify: `src/context/AdminContext.tsx`

### Step 1: Criar `src/app/actions/admin.ts`

```ts
'use server';

import { createServiceClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import type { Product, Collection } from '@/lib/data';

function productToRow(p: Product) {
  return {
    id: p.id,
    name: p.name,
    name_parts: p.nameParts,
    col: p.col,
    price: p.price,
    tint: p.tint,
    label: p.label ?? '',
    installments: p.installments ?? null,
    description: p.desc ?? null,
    sizes: p.sizes ?? [],
    unavail: p.unavail ?? [],
    stock: p.stock ?? {},
    gallery_labels: p.galleryLabels ?? [],
    image_url: p.imageUrl ?? null,
    gender: p.gender ?? null,
  };
}

export async function upsertProductAction(p: Product) {
  const supabase = createServiceClient();
  const { error } = await supabase.from('products').upsert(productToRow(p));
  if (error) throw new Error(error.message);
  revalidatePath('/');
  revalidatePath(`/produto/${p.id}`);
}

export async function deleteProductAction(id: string) {
  const supabase = createServiceClient();
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function upsertCollectionAction(id: string, patch: Partial<Collection>) {
  const supabase = createServiceClient();
  const { error } = await supabase.from('collections').upsert({
    id,
    slug: id,
    name: patch.name,
    eyebrow: patch.eyebrow,
    tint: patch.tint,
    intro: patch.intro,
    image_url: patch.imageUrl ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/');
  revalidatePath(`/colecao/${id}`);
}
```

### Step 2: Atualizar `src/context/AdminContext.tsx`

Substituir as chamadas a `persist()` pelas Server Actions. O `useEffect` de carregamento inicial também muda para buscar do Supabase:

```tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Collection, HOME_PRODUCTS, COLLECTIONS, fetchCatalog, fetchCollections } from '@/lib/data';
import { upsertProductAction, deleteProductAction, upsertCollectionAction } from '@/app/actions/admin';

const ADMIN_PASSWORD = 'pingo2024';
const AUTH_KEY = 'pdl_admin_auth';

// ... manter interface igual ...

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [products, setProducts] = useState<Product[]>(HOME_PRODUCTS);
  const [collections, setCollections] = useState<Record<string, Collection>>(COLLECTIONS);

  useEffect(() => {
    setIsAuthenticated(localStorage.getItem(AUTH_KEY) === 'true');
    // Carregar do Supabase em vez de localStorage
    fetchCatalog().then(setProducts);
    fetchCollections().then(setCollections);
  }, []);

  const login = (password: string) => {
    if (password !== ADMIN_PASSWORD) return false;
    localStorage.setItem(AUTH_KEY, 'true');
    setIsAuthenticated(true);
    return true;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
  };

  const addProduct = async (p: Omit<Product, 'id'>) => {
    const id = 'adm-' + Date.now();
    const newProduct = { ...p, id } as Product;
    setProducts(prev => [...prev, newProduct]);
    await upsertProductAction(newProduct);
  };

  const updateProduct = async (id: string, patch: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
    const updated = products.find(p => p.id === id);
    if (updated) await upsertProductAction({ ...updated, ...patch });
  };

  const deleteProduct = async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    await deleteProductAction(id);
  };

  const updateCollection = async (id: string, patch: Partial<Collection>) => {
    setCollections(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    await upsertCollectionAction(id, { ...collections[id], ...patch });
  };

  return (
    <AdminContext.Provider value={{ isAuthenticated, login, logout, products, collections, addProduct, updateProduct, deleteProduct, updateCollection }}>
      {children}
    </AdminContext.Provider>
  );
}
```

**Nota:** As funções `addProduct`, `updateProduct`, `deleteProduct`, `updateCollection` ficam `async` na implementação mas a interface do context pode manter como `void` — basta não `await` no callsite já que os erros são silenciosos na UI (pode melhorar depois).

### Step 3: Atualizar a interface do AdminContext se necessário

Se o TypeScript reclamar das funções async, ajuste a interface:
```ts
addProduct: (p: Omit<Product, 'id'>) => void;  // OK — async void é tratável
```

### Step 4: Verificar build

```bash
npm run build 2>&1 | tail -5
```

### Step 5: Commit

```bash
git add src/app/actions/admin.ts src/context/AdminContext.tsx
git commit -m "feat: admin persists products and collections to Supabase"
```

---

## Task 8: Upload de imagem no admin (Supabase Storage)

**Files:**
- Create: `src/app/actions/upload.ts`
- Modify: `src/app/admin/produtos/[id]/page.tsx`

### Step 1: Criar `src/app/actions/upload.ts`

```ts
'use server';

import { createServiceClient } from '@/lib/supabase';

export async function uploadImageAction(formData: FormData): Promise<string> {
  const file = formData.get('file') as File;
  if (!file) throw new Error('No file');

  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `products/${Date.now()}.${ext}`;

  const supabase = createServiceClient();
  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}
```

### Step 2: Adicionar input de arquivo no formulário de produto

Em `src/app/admin/produtos/[id]/page.tsx`, no `ProductForm`, substituir o campo de texto `imageUrl` por um input de arquivo + preview:

Encontre o campo atual:
```tsx
<div className="adm-form-field">
  <label>URL da imagem</label>
  <input type="url" value={form.imageUrl ?? ''} onChange={e => set('imageUrl', e.target.value)} placeholder="https://..." />
</div>
```

Substitua por:
```tsx
<div className="adm-form-field">
  <label>Imagem do produto</label>
  {form.imageUrl && (
    <img src={form.imageUrl} alt="preview" width={120} height={160} style={{ objectFit: 'cover', borderRadius: 4, marginBottom: 8, display: 'block' }} />
  )}
  <input
    type="file"
    accept="image/*"
    onChange={async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      try {
        const { uploadImageAction } = await import('@/app/actions/upload');
        const url = await uploadImageAction(fd);
        set('imageUrl', url);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }}
  />
  {form.imageUrl && (
    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, wordBreak: 'break-all' }}>{form.imageUrl}</div>
  )}
</div>
```

### Step 3: Verificar build

```bash
npm run build 2>&1 | tail -5
```

### Step 4: Commit

```bash
git add src/app/actions/upload.ts "src/app/admin/produtos/[id]/page.tsx"
git commit -m "feat: admin image upload to Supabase Storage"
```

---

## Task 9: Endereços do cliente no /perfil

**Files:**
- Create: `src/app/actions/addresses.ts`
- Modify: `src/app/perfil/page.tsx`

### Step 1: Criar `src/app/actions/addresses.ts`

```ts
'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export interface Address {
  id: string;
  label: string;
  street: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
}

export async function getAddressesAction(): Promise<Address[]> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at');
  return (data ?? []) as Address[];
}

export async function saveAddressAction(address: Omit<Address, 'id'> & { id?: string }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (address.id) {
    await supabase.from('addresses').update({ ...address }).eq('id', address.id).eq('user_id', user.id);
  } else {
    await supabase.from('addresses').insert({ ...address, user_id: user.id });
  }
  revalidatePath('/perfil');
}

export async function deleteAddressAction(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  await supabase.from('addresses').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/perfil');
}
```

### Step 2: Adicionar seção de endereços real ao `/perfil`

Em `src/app/perfil/page.tsx`, substituir o placeholder de endereços por:
- useEffect que carrega endereços via `getAddressesAction()`
- Lista de endereços com botão "remover"
- Formulário inline de adicionar endereço (campos: label, cep, street, complement, neighborhood, city, state)
- Botão "salvar" chama `saveAddressAction()`

```tsx
// Adicionar no topo do componente:
const [addresses, setAddresses] = useState<Address[]>([]);
const [newAddr, setNewAddr] = useState<Omit<Address,'id'> | null>(null);

// No useEffect após confirmar user:
useEffect(() => {
  if (!user) return;
  getAddressesAction().then(setAddresses);
}, [user]);

// Seção de endereços no JSX:
<div className="pdl-profile-section">
  <h3>Endereços</h3>
  {addresses.map(a => (
    <div key={a.id} style={{ marginBottom: 12, padding: '12px 14px', background: 'var(--cream-warm)', borderRadius: 6 }}>
      <div style={{ fontWeight: 600, fontSize: 12 }}>{a.label}</div>
      <div style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
        {a.street}{a.complement ? `, ${a.complement}` : ''}<br />
        {a.neighborhood} · {a.city}/{a.state} · {a.zip}
      </div>
      <button onClick={async () => { await deleteAddressAction(a.id); setAddresses(prev => prev.filter(x => x.id !== a.id)); }}
        style={{ marginTop: 6, fontSize: 11, color: 'var(--terra)', background: 'none', textDecoration: 'underline' }}>
        remover
      </button>
    </div>
  ))}
  {!newAddr && (
    <button onClick={() => setNewAddr({ label: 'Casa', street: '', complement: '', neighborhood: '', city: '', state: '', zip: '' })}
      style={{ marginTop: 8, fontSize: 13, fontFamily: 'var(--editorial)', fontStyle: 'italic', color: 'var(--terra)', textDecoration: 'underline' }}>
      + adicionar endereço
    </button>
  )}
  {newAddr && (
    <div style={{ marginTop: 12 }}>
      {/* inputs para cada campo de newAddr */}
      {(['label','zip','street','complement','neighborhood','city','state'] as const).map(field => (
        <div key={field} className="pdl-input" style={{ marginBottom: 8 }}>
          <label>{field}</label>
          <input value={(newAddr as Record<string,string>)[field] ?? ''} onChange={e => setNewAddr(prev => ({ ...prev!, [field]: e.target.value }))} />
        </div>
      ))}
      <button onClick={async () => {
        await saveAddressAction(newAddr);
        const updated = await getAddressesAction();
        setAddresses(updated);
        setNewAddr(null);
      }} style={{ padding: '10px 16px', background: 'var(--ink)', color: 'var(--cream-warm)', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
        salvar endereço
      </button>
    </div>
  )}
</div>
```

### Step 3: Verificar build

```bash
npm run build 2>&1 | tail -5
```

### Step 4: Commit

```bash
git add src/app/actions/addresses.ts src/app/perfil/page.tsx
git commit -m "feat: customer addresses saved to Supabase"
```

---

## Task 10: Checkout com Mercado Pago

**Files:**
- Create: `src/app/actions/checkout.ts`
- Modify: `src/app/checkout/page.tsx`

### Step 1: Criar `src/app/actions/checkout.ts`

```ts
'use server';

import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase';
import MercadoPagoConfig, { Preference } from 'mercadopago';

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

interface CartItem {
  id: string;
  name: string;
  price: string;
  qty: number;
  size: string;
  tint: string;
  col: string;
}

function parsePrice(price: string): number {
  return Number(price.replace(/[^0-9,]/g, '').replace(',', '.'));
}

export async function createOrderAction(
  items: CartItem[],
  address: Record<string, string>
): Promise<{ initPoint: string; orderId: string }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const subtotal = items.reduce((s, i) => s + parsePrice(i.price) * i.qty, 0);
  const freight = subtotal >= 250 ? 0 : 24;
  const total = subtotal + freight;

  // Criar pedido no Supabase
  const service = createServiceClient();
  const { data: order, error } = await service
    .from('orders')
    .insert({
      user_id: user.id,
      items,
      total,
      status: 'pendente',
      address,
    })
    .select('id')
    .single();

  if (error || !order) throw new Error(error?.message ?? 'Failed to create order');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  // Criar preferência no Mercado Pago
  const preference = new Preference(mp);
  const response = await preference.create({
    body: {
      items: items.map(item => ({
        id: item.id,
        title: `${item.name} (tam. ${item.size})`,
        quantity: item.qty,
        unit_price: parsePrice(item.price),
        currency_id: 'BRL',
      })),
      back_urls: {
        success: `${siteUrl}/confirmacao?order_id=${order.id}`,
        failure: `${siteUrl}/checkout?error=payment`,
        pending: `${siteUrl}/confirmacao?order_id=${order.id}&pending=true`,
      },
      auto_return: 'approved',
      notification_url: `${siteUrl}/api/webhooks/mercadopago`,
      external_reference: order.id,
      payer: { email: user.email ?? '' },
    },
  });

  if (!response.init_point) throw new Error('No init_point from Mercado Pago');
  return { initPoint: response.init_point, orderId: order.id };
}
```

### Step 2: Atualizar `src/app/checkout/page.tsx`

Adicionar verificação de sessão e trocar `placeOrder` pela Server Action:

```tsx
// Adicionar no topo do componente (dentro do useEffect existente ou num novo):
useEffect(() => {
  // Verificar sessão — middleware já protege, mas garante client-side também
  import('@/lib/supabase').then(({ createClient }) => {
    createClient().auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/perfil?redirect=/checkout');
    });
  });
}, []);

// Substituir placeOrder por:
const placeOrder = async () => {
  setPlacing(true);
  try {
    const { createOrderAction } = await import('@/app/actions/checkout');
    const { initPoint } = await createOrderAction(
      cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, size: i.size, tint: i.tint, col: i.col })),
      { name: shipping.name, email: shipping.email, zip: shipping.cep, street: shipping.address, complement: shipping.complement, neighborhood: shipping.neighborhood, city: shipping.city, state: shipping.state }
    );
    clearCart();
    window.location.href = initPoint; // redireciona para MP
  } catch (err) {
    console.error(err);
    setPlacing(false);
  }
};

// Adicionar state: const [placing, setPlacing] = useState(false);
// No botão finalizar: disabled={placing} + texto "processando..." quando placing
```

### Step 3: Verificar build

```bash
npm run build 2>&1 | tail -5
```

### Step 4: Commit

```bash
git add src/app/actions/checkout.ts src/app/checkout/page.tsx
git commit -m "feat: checkout creates order in Supabase and redirects to Mercado Pago"
```

---

## Task 11: Página de confirmação com dados reais

**Files:**
- Modify: `src/app/confirmacao/page.tsx`

### Step 1: Reescrever `src/app/confirmacao/page.tsx`

A página atual lê tudo de query params. Agora lê do Supabase pelo `order_id`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkle } from '@/components/Icons';
import { formatPrice } from '@/lib/data';
import { createClient } from '@/lib/supabase';
import { Suspense } from 'react';

interface Order {
  id: string;
  total: number;
  status: string;
  mp_payment_method: string | null;
  created_at: string;
  items: Array<{ name: string; price: string; qty: number; size: string }>;
  address: Record<string, string>;
}

function ConfirmacaoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const isPending = searchParams.get('pending') === 'true';
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) { router.replace('/'); return; }
    const supabase = createClient();
    supabase.from('orders').select('*').eq('id', orderId).single()
      .then(({ data }) => { setOrder(data); setLoading(false); });
  }, [orderId]);

  if (loading) return <div className="pdl-app" />;
  if (!order) return <div className="pdl-app"><div style={{ padding: 40 }}>Pedido não encontrado.</div></div>;

  const paymentLabel =
    order.mp_payment_method?.includes('pix') ? 'Pix' :
    order.mp_payment_method?.includes('credit') ? 'Cartão de crédito' :
    order.mp_payment_method ?? (isPending ? 'Aguardando pagamento' : 'Pagamento confirmado');

  return (
    <div className="pdl-app">
      <div className="pdl-confirm">
        <div className="pdl-confirm-spark"><Sparkle size={28} color="currentColor" /></div>
        <h2>{isPending ? 'Pedido <em>recebido!</em>' : 'Pedido <em>confirmado!</em>'}</h2>
        <div className="num">nº {order.id.slice(0, 8).toUpperCase()}</div>
        <p>
          Obrigada, {order.address?.name?.split(' ')[0] ?? 'cliente'}. Você receberá atualizações em{' '}
          <strong>{order.address?.email}</strong>.
        </p>
        <div className="pdl-confirm-summary">
          <div className="lbl">total</div>
          <div className="val">{formatPrice(order.total)}</div>
          <div className="lbl">pagamento</div>
          <div className="val">{paymentLabel}</div>
          <div className="lbl">itens</div>
          <div className="val">{order.items.map(i => `${i.name} (tam. ${i.size})`).join(', ')}</div>
          <div className="lbl">status</div>
          <div className="val">{order.status}</div>
        </div>
        <button onClick={() => router.push('/')} style={{ marginTop: 32, padding: '12px 24px', background: 'var(--ink)', color: 'var(--cream-warm)', borderRadius: 999, fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 12 }}>
          continuar explorando
        </button>
      </div>
    </div>
  );
}

export default function ConfirmacaoPage() {
  return <Suspense><ConfirmacaoContent /></Suspense>;
}
```

### Step 2: Verificar build

```bash
npm run build 2>&1 | tail -5
```

### Step 3: Commit

```bash
git add src/app/confirmacao/page.tsx
git commit -m "feat: confirmation page reads real order from Supabase"
```

---

## Task 12: Webhook do Mercado Pago

**Files:**
- Create: `src/app/api/webhooks/mercadopago/route.ts`

### Step 1: Criar `src/app/api/webhooks/mercadopago/route.ts`

```ts
import { createServiceClient } from '@/lib/supabase';
import MercadoPagoConfig, { Payment } from 'mercadopago';
import { createHmac } from 'crypto';

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

function validateSignature(request: Request, body: string): boolean {
  const xSignature = request.headers.get('x-signature') ?? '';
  const xRequestId = request.headers.get('x-request-id') ?? '';
  const url = new URL(request.url);
  const dataId = url.searchParams.get('data.id') ?? '';

  const ts = xSignature.split(',').find(p => p.startsWith('ts='))?.replace('ts=', '') ?? '';
  const v1 = xSignature.split(',').find(p => p.startsWith('v1='))?.replace('v1=', '') ?? '';

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET!)
    .update(manifest)
    .digest('hex');

  return expected === v1;
}

export async function POST(request: Request) {
  const body = await request.text();

  if (!validateSignature(request, body)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const data = JSON.parse(body);

  if (data.type === 'payment' && data.data?.id) {
    try {
      const payment = new Payment(mp);
      const paymentData = await payment.get({ id: data.data.id });

      const status =
        paymentData.status === 'approved' ? 'pago' :
        paymentData.status === 'rejected' ? 'recusado' :
        'pendente';

      const supabase = createServiceClient();
      await supabase
        .from('orders')
        .update({
          status,
          mp_payment_id: String(paymentData.id),
          mp_payment_method: paymentData.payment_method_id ?? null,
        })
        .eq('id', paymentData.external_reference);
    } catch (err) {
      console.error('Webhook error:', err);
      return new Response('Error processing payment', { status: 500 });
    }
  }

  return new Response('ok', { status: 200 });
}
```

### Step 2: Verificar build final

```bash
npm run build 2>&1 | grep -E "Route|error|Error|✓|✗" | head -30
```

Expected: todos os 15+ routes listados, 0 erros.

### Step 3: Commit final

```bash
git add src/app/api/webhooks/mercadopago/route.ts
git commit -m "feat: Mercado Pago webhook updates order status"
```

---

## Done

Verificação final antes de deploy:

```bash
npm run build && npm run dev
```

Checklist:
- [ ] `/perfil` → botão Google redireciona para login e volta logado
- [ ] Admin salva produto → aparece no storefront (não mais localStorage)
- [ ] Admin faz upload de imagem → URL do Supabase Storage aparece no produto
- [ ] `/checkout` sem login → redireciona para `/perfil`
- [ ] Checkout com login → redireciona para MP
- [ ] Após pagar → `/confirmacao` mostra dados reais do pedido
- [ ] `/perfil` logado → mostra endereços e pedidos

**Variáveis de ambiente na Vercel:**
Settings → Environment Variables → adicionar todas do `.env.local` com `NEXT_PUBLIC_SITE_URL=https://seu-dominio.vercel.app`

**Webhook MP em produção:**
MP Developer Dashboard → registrar `https://seu-dominio.vercel.app/api/webhooks/mercadopago` para eventos de `payment`.
