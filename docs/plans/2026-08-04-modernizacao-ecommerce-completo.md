# Modernização Completa do E-commerce — Plano de Implementação

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans para implementar este plano tarefa por tarefa.
> **IMPORTANTE:** Este projeto usa Next.js 16.2.6 com breaking changes. Antes de escrever código de qualquer área, leia o guia correspondente em `node_modules/next/dist/docs/`. Convenções que JÁ mudaram e afetam este plano: `middleware.ts` → `proxy.ts` (deprecado na v16), `<Image priority>` → `preload`, Cache Components / `use cache` / `revalidateTag` / `updateTag`.

**Goal:** Transformar o MVP em um e-commerce de produção completo — cliente e admin — removendo todos os artefatos de demonstração, corrigindo falhas de segurança, e integrando pagamentos via Mercado Pago através de uma camada desacoplada e substituível.

**Architecture:** Next.js 16 (App Router, Server Components + Server Actions) + Supabase (Postgres com RLS, Auth, Storage). Camada de pagamento por trás de uma interface `PaymentGateway` (ports & adapters) com adaptador Mercado Pago. Toda escrita passa por Server Actions autenticadas; leitura pública via clients Supabase com RLS. Preservar 100% o design system existente (classes `pdl-*`, tints, tipografia editorial).

**Tech Stack:** Next.js 16.2.6, React 19, TypeScript, Tailwind 4, Supabase (`@supabase/ssr`), SDK `mercadopago` v2, Playwright (e2e), tsx (scripts).

---

## Diagnóstico (estado atual)

### Falhas de segurança (bloqueantes para produção)
| # | Falha | Onde |
|---|-------|------|
| S1 | Senha admin hardcoded no bundle do cliente + auth via localStorage | `src/context/AdminContext.tsx:7` |
| S2 | Server actions de admin usam service role **sem verificar autenticação** — qualquer visitante pode criar/alterar/excluir produtos, coleções, config | `src/app/actions/admin.ts`, `src/app/actions/upload.ts` |
| S3 | Checkout confia no **preço enviado pelo cliente** — manipulação de preço trivial | `src/app/actions/checkout.ts:33,61` |
| S4 | Webhook MP sem idempotência (reprocessamento pode sobrescrever status) e sem registro de eventos | `src/app/api/webhooks/mercadopago/route.ts` |
| S5 | Página de confirmação lê `orders` direto do browser com anon key — depende de RLS que não está versionada/garantida | `src/app/confirmacao/page.tsx` |
| S6 | Sem validação de estoque no checkout; estoque nunca é decrementado | `src/app/actions/checkout.ts` |

### Artefatos de MVP a remover
- `INITIAL_CART` com 2 produtos mockados (`src/context/CartContext.tsx:27-30`); carrinho não persiste.
- Dados de entrega pré-preenchidos ("Marina Vasques", endereço fake) no checkout (`src/app/checkout/page.tsx:15-20`); campos de cartão coletados na UI mas nunca usados (fluxo real é redirect MP).
- `MOCK_USER` (`src/context/UserContext.tsx`), `MOCK_ORDERS`, `MOCK_ADDRESSES` (`src/lib/data.ts:217-227`).
- `HOME_PRODUCTS`, `COLLECTIONS`, `GENDER_DATA` hardcoded como fallback silencioso de todos os fetchers (`src/lib/data.ts`) + `getCatalog()`/`getCollections()` lendo localStorage.
- `HeartButtonExample.tsx` (componente de exemplo), `console.log` de debug em `addresses.ts` e nos commits recentes de favoritos.
- `TESTIMONIALS` hardcoded (mover para banco, editável no admin).
- Desconto Pix de 5% e frete (grátis ≥ R$250, senão R$24) hardcoded no client **e** duplicados na action.
- `setup-db.js` e `create-profiles-table.sql` na raiz (consolidar em migrations), README boilerplate do create-next-app.

### Duplicações / dívida técnica
- **Dois módulos Supabase**: `src/lib/auth.ts` e `src/lib/supabase.ts` criam os mesmos clients. Consolidar em um.
- **`proxy.ts` (raiz) + `src/middleware.ts`** coexistem com lógica sobreposta. Na v16 `middleware` é deprecado; como o projeto usa `src/`, o arquivo correto é `src/proxy.ts` (o `proxy.ts` na raiz provavelmente nem é carregado). Consolidar.
- Fetchers em `data.ts` chamam a REST API do Supabase manualmente com fetch + anon key em headers, em vez do client.
- Preço como string `"R$ 189"` parseado com regex em 3 lugares diferentes (`parsePrice` ×2 com semânticas diferentes!). Migrar para **centavos (integer)**.
- Migrations não cobrem `products`, `collections`, `orders`, `favorites`, `addresses`, `profiles` — schema drift.

### Funcionalidades ausentes
Admin: pedidos, clientes, cupons, estoque, frete, depoimentos, dashboard. Cliente: histórico real de pedidos, cupom no checkout, seleção de endereço salvo no checkout, e-mails transacionais. Plataforma: RLS completa, SEO (metadata dinâmica, sitemap, JSON-LD), páginas institucionais (trocas, privacidade), testes.

---

## Convenções globais do plano

- **Dinheiro:** sempre `integer` em centavos no banco e no código. Helper único `formatCentavos(n)` → `"R$ 189,90"`.
- **Escrita no banco:** só via Server Actions. Actions públicas usam client com RLS; actions admin exigem `requireAdmin()` antes de qualquer service role.
- **Leitura pública:** Server Components + client Supabase anon (RLS de leitura pública em catálogo).
- **Commits:** um por tarefa, mensagem convencional (`feat:`, `fix:`, `refactor:`, `chore:`).
- **Testes:** Playwright para fluxos críticos; testes unitários com `node --test` via tsx para lógica pura (preço, cupom, frete, gateway). Escrever teste antes da implementação onde indicado.
- **Trabalhar direto na `main`** (convenção deste projeto — não usar worktrees).
- **Visual:** nenhuma tarefa altera o design system. Novas telas admin reutilizam `AdminLayout` e padrões existentes.

---

# FASE 0 — Fundação e limpeza

### Task 0.1: Baseline de schema em migrations

**Files:**
- Create: `supabase/migrations/20260804000001_baseline_existing_tables.sql`
- Delete: `setup-db.js`, `create-profiles-table.sql`

**Steps:**
1. No dashboard do Supabase (ou via `supabase db dump`), extrair o DDL real das tabelas já existentes: `products`, `collections`, `orders`, `favorites`, `addresses`, `profiles`.
2. Escrever a migration baseline com `create table if not exists` para todas elas, refletindo o estado atual (não o desejado — mudanças vêm nas próximas migrations).
3. Incluir as policies RLS existentes de `profiles` (copiar de `create-profiles-table.sql`).
4. Excluir `setup-db.js` e `create-profiles-table.sql`.
5. Commit: `chore: baseline schema em migrations e remoção de scripts avulsos`

### Task 0.2: RLS completa

**Files:**
- Create: `supabase/migrations/20260804000002_rls_policies.sql`

**Conteúdo da migration (ajustar nomes de colunas ao baseline):**

```sql
-- Catálogo: leitura pública, escrita nenhuma (só service role)
alter table products enable row level security;
alter table collections enable row level security;
alter table size_tables enable row level security;
alter table homepage_config enable row level security;
alter table payment_config enable row level security;
create policy "public read" on products for select using (true);
create policy "public read" on collections for select using (true);
create policy "public read" on size_tables for select using (true);
create policy "public read" on homepage_config for select using (true);
create policy "public read" on payment_config for select using (true);

-- Dados do cliente: dono lê/escreve o que é seu
alter table favorites enable row level security;
create policy "own favorites" on favorites for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table addresses enable row level security;
create policy "own addresses" on addresses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Pedidos: dono só lê; escrita só via service role (server)
alter table orders enable row level security;
create policy "own orders read" on orders for select using (auth.uid() = user_id);
```

**Steps:**
1. Aplicar migration no Supabase.
2. Verificar manualmente: com anon key, `select` em `orders` sem sessão deve retornar vazio; `select` em `products` deve funcionar.
3. Commit: `feat: RLS em todas as tabelas`

### Task 0.3: Consolidar clients Supabase

**Files:**
- Modify: `src/lib/supabase.ts` (fica como módulo único)
- Delete: `src/lib/auth.ts`
- Modify: todos os imports de `@/lib/auth` → `@/lib/supabase` (`src/app/actions/auth-user.ts`, `src/middleware.ts`, e onde mais o grep apontar)

**Steps:**
1. `grep -rn "lib/auth" src/` e migrar cada import. Mover `getCurrentUser` e `signOutUser` para `supabase.ts`.
2. `npm run build` para confirmar que nada quebrou.
3. Commit: `refactor: módulo Supabase único`

### Task 0.4: Consolidar proxy (convenção Next 16)

**Files:**
- Create: `src/proxy.ts`
- Delete: `proxy.ts` (raiz), `src/middleware.ts`
- Docs: ler `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`

**Steps:**
1. Criar `src/proxy.ts` unificando as duas lógicas: refresh de sessão Supabase (padrão `@supabase/ssr` com `getAll`/`setAll` + `NextResponse.next({ request })`) e proteção de `/checkout` e `/confirmacao` (redirect para `/perfil?redirect=...` se sem usuário). Usar `export async function proxy(request: NextRequest)`.
2. Matcher: `['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|webp)).*)']`.
3. Excluir os dois arquivos antigos.
4. `npm run dev` e verificar: navegar em `/checkout` deslogado redireciona; login continua funcionando.
5. Commit: `refactor: middleware+proxy consolidados em src/proxy.ts (convenção Next 16)`

### Task 0.5: Remover artefatos de exemplo e debug

**Files:**
- Delete: `src/components/HeartButtonExample.tsx`
- Modify: `src/app/actions/addresses.ts` (remover todos os `console.log('[SERVER] ...')`)
- Modify: `src/components/HeartButton.tsx` e onde houver `console.log` de debug (ver commits `f259489`, `b9bb099` — `grep -rn "console.log" src/`)
- Modify: `README.md` — reescrever: o que é o projeto, setup (env vars necessárias, migrations, seed), scripts, deploy.

**Steps:**
1. Excluir/limpar cada item; manter `console.error` em catch de erros reais.
2. `npm run build`.
3. Commit: `chore: remove componentes de exemplo, logs de debug e README boilerplate`

---

# FASE 1 — Modelo de dados definitivo

### Task 1.1: Migration — preço em centavos, estoque, novos campos

**Files:**
- Create: `supabase/migrations/20260804000003_price_centavos_and_stock.sql`

```sql
-- Preço em centavos (integer). Converte "R$ 189" / "R$ 189,90" existentes.
alter table products add column if not exists price_centavos integer;
update products set price_centavos = (
  replace(regexp_replace(price, '[^0-9,]', '', 'g'), ',', '.')::numeric * 100
)::integer where price_centavos is null and price is not null;
alter table products alter column price_centavos set not null;
alter table products alter column price_centavos set default 0;

-- Produto ativo/inativo (soft delete / rascunho)
alter table products add column if not exists active boolean not null default true;
alter table products add column if not exists created_at timestamptz not null default now();

-- Pedidos: total em centavos + numeração amigável + colunas de pagamento desacopladas
alter table orders add column if not exists subtotal_centavos integer;
alter table orders add column if not exists freight_centavos integer;
alter table orders add column if not exists discount_centavos integer not null default 0;
alter table orders add column if not exists total_centavos integer;
alter table orders add column if not exists coupon_code text;
alter table orders add column if not exists order_number text unique;
alter table orders add column if not exists payment_provider text;          -- 'mercadopago'
alter table orders add column if not exists payment_external_id text;       -- id no provedor
alter table orders add column if not exists payment_method text;            -- pix, credit_card…
alter table orders add column if not exists created_at timestamptz not null default now();
alter table orders add column if not exists updated_at timestamptz not null default now();

-- Sequência para número de pedido PDL-XXXXX
create sequence if not exists order_number_seq start 10001;
```

**Steps:**
1. Aplicar; conferir no dashboard que `price_centavos` foi populado corretamente para todos os produtos.
2. Commit: `feat(db): preços em centavos, campos de pedido e produto`

### Task 1.2: Migration — cupons, movimentos de estoque, config de frete, depoimentos, eventos de webhook

**Files:**
- Create: `supabase/migrations/20260804000004_coupons_shipping_testimonials.sql`

```sql
create table if not exists coupons (
  code text primary key,                      -- sempre uppercase
  kind text not null check (kind in ('percent','fixed')),
  value integer not null,                     -- percent: 10 = 10% | fixed: centavos
  min_subtotal_centavos integer not null default 0,
  max_uses integer,                           -- null = ilimitado
  used_count integer not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table coupons enable row level security; -- sem policy pública: só service role

create table if not exists shipping_config (
  id text primary key default 'default',
  flat_centavos integer not null default 2400,
  free_above_centavos integer not null default 25000,
  pix_discount_percent integer not null default 5
);
insert into shipping_config (id) values ('default') on conflict (id) do nothing;
alter table shipping_config enable row level security;
create policy "public read" on shipping_config for select using (true);

create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  author text not null,
  role text not null default '',
  sort integer not null default 0,
  visible boolean not null default true
);
alter table testimonials enable row level security;
create policy "public read" on testimonials for select using (visible);

-- Idempotência de webhook
create table if not exists payment_events (
  id text primary key,                        -- provider:event_id
  provider text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);
alter table payment_events enable row level security;

-- Auditoria de estoque
create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references products(id),
  size text not null,
  delta integer not null,                     -- negativo = venda
  reason text not null,                       -- 'sale' | 'restock' | 'adjustment' | 'cancel'
  order_id uuid,
  created_at timestamptz not null default now()
);
alter table stock_movements enable row level security;
```

**Steps:**
1. Aplicar migration; semear `testimonials` com os 3 depoimentos atuais de `TESTIMONIALS` (via SQL na própria migration).
2. Commit: `feat(db): cupons, frete, depoimentos, payment_events, stock_movements`

### Task 1.3: Migration — decremento atômico de estoque (função SQL)

**Files:**
- Create: `supabase/migrations/20260804000005_decrement_stock_fn.sql`

```sql
-- Decrementa estoque de vários itens atomicamente; falha se qualquer um ficar negativo.
create or replace function decrement_stock(items jsonb, p_order_id uuid)
returns void language plpgsql security definer as $$
declare item jsonb; current_qty integer;
begin
  for item in select * from jsonb_array_elements(items) loop
    select coalesce((stock ->> (item->>'size'))::integer, 0) into current_qty
      from products where id = item->>'id' for update;
    if current_qty < (item->>'qty')::integer then
      raise exception 'ESTOQUE_INSUFICIENTE:%:%', item->>'id', item->>'size';
    end if;
    update products
      set stock = jsonb_set(coalesce(stock,'{}'::jsonb), array[item->>'size'],
        to_jsonb(current_qty - (item->>'qty')::integer))
      where id = item->>'id';
    insert into stock_movements (product_id, size, delta, reason, order_id)
      values (item->>'id', item->>'size', -((item->>'qty')::integer), 'sale', p_order_id);
  end loop;
end $$;
```

> Nota: se `products.stock` for `json`/`Record` no baseline, ajustar cast conforme o tipo real.

**Steps:**
1. Aplicar; testar no SQL editor: decremento válido funciona, decremento além do estoque lança exceção e não altera nada.
2. Commit: `feat(db): função atômica de decremento de estoque`

### Task 1.4: Refatorar camada de dados (`src/lib/`)

**Files:**
- Create: `src/lib/money.ts`
- Modify: `src/lib/data.ts` (grande refatoração)
- Modify: todos os consumidores de `price`/`parsePrice`/`formatPrice`

**Step 1: Teste primeiro** — Create `src/lib/__tests__/money.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert';
import { formatCentavos, parseCentavosFromInput } from '../money';

test('formata centavos em BRL', () => {
  assert.equal(formatCentavos(18990), 'R$ 189,90');
  assert.equal(formatCentavos(18900), 'R$ 189');       // sem centavos exibe inteiro
});
test('parseia input humano', () => {
  assert.equal(parseCentavosFromInput('189,90'), 18990);
  assert.equal(parseCentavosFromInput('R$ 189'), 18900);
});
```

Run: `npx tsx --test src/lib/__tests__/money.test.ts` → FAIL.

**Step 2:** Implementar `src/lib/money.ts` até passar. Adicionar script `"test:unit": "tsx --test src/lib/__tests__/*.test.ts src/lib/payments/__tests__/*.test.ts"` no `package.json`.

**Step 3:** Em `data.ts`:
- `Product.price: string` → `priceCentavos: number` (manter `price` como getter formatado apenas se o custo de mudar todos os componentes for alto — preferir migrar componentes).
- Remover: `MOCK_ORDERS`, `MOCK_ADDRESSES`, `TESTIMONIALS`, `getCatalog`, `getCollections` (localStorage), `HOME_PRODUCTS`/`COLLECTIONS`/`GENDER_DATA` como fallback de fetchers — em erro de rede, lançar/propagar e deixar a página mostrar estado vazio ou `error.tsx`. `GENDER_DATA` (textos de meninas/meninos) pode virar constante legítima de conteúdo, sem produtos embutidos.
- Substituir fetchers REST manuais por client Supabase (`createClient()` server-side sem cookies para dados públicos), mantendo cache: envolver leituras públicas em `'use cache'` + `cacheTag('catalog')` (ler `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md` e `.../04-functions/cacheTag.md`; se `cacheComponents` não estiver habilitado, manter `next: { revalidate: 60 }` no fetch e trocar em Fase 7).
- Novo: `fetchTestimonials()`, `fetchShippingConfig()`.

**Step 4:** Migrar consumidores (`HomeClient`, `ProdutoClient`, `ColecaoClient`, `GeneroClient`, `BuscaClient`, `SearchBox`, carrinho, checkout, admin produtos) para `priceCentavos` + `formatCentavos`.

**Step 5:** `npm run build` + smoke manual das páginas. Commit: `refactor: preços em centavos e camada de dados sem mocks`

### Task 1.5: Remover UserContext mockado

**Files:**
- Modify: `src/context/UserContext.tsx` — remover `MOCK_USER`; popular o contexto a partir da sessão Supabase real (`supabase.auth.onAuthStateChange` + `getUser()`), derivando `name/email/initial` de `user_metadata`.
- Verify: `grep -rn "MOCK_USER" src/` → vazio.

Commit: `refactor: UserContext ligado à sessão Supabase real`

---

# FASE 2 — Autenticação e segurança do admin

### Task 2.1: Papel de admin no banco

**Files:**
- Create: `supabase/migrations/20260804000006_admin_role.sql`

```sql
alter table profiles add column if not exists is_admin boolean not null default false;
-- promover o(s) admin(s) reais manualmente:
-- update profiles set is_admin = true where id = '<uuid do dono>';
```

Commit: `feat(db): flag is_admin em profiles`

### Task 2.2: Guard de servidor `requireAdmin`

**Files:**
- Create: `src/lib/admin-auth.ts`

```ts
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase';

export async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');
  const service = createServiceClient();
  const { data } = await service.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!data?.is_admin) throw new Error('NOT_AUTHORIZED');
  return user;
}
```

**Steps:**
1. Adicionar `await requireAdmin();` como primeira linha de **todas** as actions em `src/app/actions/admin.ts` e `src/app/actions/upload.ts`.
2. Teste manual: chamar uma action deslogado (via página) deve falhar.
3. Commit: `fix(security): server actions de admin exigem admin autenticado`

### Task 2.3: Login admin real

**Files:**
- Modify: `src/app/admin/login/page.tsx` — trocar campo de senha única por login Supabase (email+senha e/ou Google, reutilizando o fluxo de `SignupForm`/`auth/callback` existente). Preservar o visual atual da tela.
- Modify: `src/context/AdminContext.tsx` — remover `ADMIN_PASSWORD`/localStorage; `isAuthenticated` passa a derivar de sessão Supabase + `profiles.is_admin` (nova action `checkIsAdminAction`).
- Modify: `src/proxy.ts` — adicionar `/admin/:path*` ao matcher; sem sessão → redirect `/admin/login`. (A checagem `is_admin` fica nas actions e no layout server-side do admin, não no proxy.)
- Create: `src/app/admin/layout.tsx` (server) — verifica admin via `requireAdmin()`; se falhar, `redirect('/admin/login')`. Páginas admin continuam client components dentro dele.

**Steps:** implementar, testar login/logout/acesso negado, commit: `feat(security): admin com Supabase Auth e verificação server-side`

---

# FASE 3 — Cliente: carrinho, perfil e pedidos reais

### Task 3.1: Carrinho persistente e sem mock

**Files:**
- Modify: `src/context/CartContext.tsx`

**Steps:**
1. Remover `INITIAL_CART` → `useState<CartItem[]>([])`.
2. Persistir em `localStorage` (`pdl_cart_v1`): hidratar em `useEffect` inicial, salvar a cada mudança. (localStorage é adequado aqui — carrinho de visitante; pedido real só existe após checkout.)
3. `CartItem.price: string` → `priceCentavos: number` (já iniciado na Task 1.4).
4. Adicionar `size`+quantidade máx pelo estoque do produto quando disponível.
5. Teste manual: adicionar, recarregar página (mantém), limpar.
6. Commit: `feat: carrinho persistente sem itens de demonstração`

### Task 3.2: Perfil — pedidos reais

**Files:**
- Create: `src/app/actions/orders.ts` — `getMyOrdersAction(): Promise<OrderSummary[]>` usando client com RLS (sem service role), ordenado por `created_at desc`.
- Modify: `src/app/perfil/page.tsx` — substituir `MOCK_ORDERS` pela action; estado vazio: "Você ainda não fez pedidos" com link para a loja. Mapear status → chips existentes (`pendente`, `pago`, `enviado`, `entregue`, `cancelado`, `recusado`).
- Modify: `src/lib/data.ts` — confirmar remoção de `MOCK_ORDERS`/`MOCK_ADDRESSES` (Task 1.4).

Commit: `feat: histórico real de pedidos no perfil`

### Task 3.3: Página de detalhe do pedido

**Files:**
- Create: `src/app/pedido/[id]/page.tsx` (server component; busca via client RLS — dono só vê o seu; 404 caso contrário)
- Reutilizar visual da confirmação (itens, endereço, totais, status, forma de pagamento).

Commit: `feat: página de detalhe do pedido`

---

# FASE 4 — Camada de pagamentos desacoplada (Mercado Pago)

> Núcleo da arquitetura. Nada fora de `src/lib/payments/` pode importar o SDK `mercadopago`.

### Task 4.1: Contrato do gateway

**Files:**
- Create: `src/lib/payments/types.ts`
- Create: `src/lib/payments/README.md` (documentação da camada: contrato, como trocar de provedor, env vars)

```ts
// types.ts — contrato independente de provedor
export interface PaymentItem { id: string; title: string; quantity: number; unitPriceCentavos: number; }

export interface CreateCheckoutInput {
  orderId: string;
  orderNumber: string;
  items: PaymentItem[];
  totalCentavos: number;
  payerEmail: string;
  successUrl: string; failureUrl: string; pendingUrl: string;
  notificationUrl: string;
}

export interface CreateCheckoutResult { redirectUrl: string; externalId?: string; }

export type NormalizedPaymentStatus = 'approved' | 'pending' | 'rejected' | 'refunded' | 'cancelled';

export interface WebhookVerification { valid: boolean; eventId?: string; }
export interface PaymentNotification {
  eventId: string;
  externalPaymentId: string;
  orderId: string;              // nossa referência (external_reference)
  status: NormalizedPaymentStatus;
  method?: string;              // 'pix' | 'credit_card' | …
  raw: unknown;
}

export interface PaymentGateway {
  readonly provider: string;    // 'mercadopago'
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  verifyWebhook(request: Request, rawBody: string): WebhookVerification;
  parseNotification(rawBody: string, request: Request): Promise<PaymentNotification | null>;
  refund?(externalPaymentId: string): Promise<void>;
}
```

Commit: `feat(payments): contrato PaymentGateway independente de provedor`

### Task 4.2: Adaptador Mercado Pago + factory

**Files:**
- Create: `src/lib/payments/mercadopago.ts` — implementa `PaymentGateway`: move para cá a criação de `Preference` (de `checkout.ts`), a validação HMAC de assinatura e o `Payment.get` + normalização de status (de `route.ts`). Mapear status MP → `NormalizedPaymentStatus` (`approved→approved`, `rejected/cancelled→rejected/cancelled`, `refunded/charged_back→refunded`, resto→`pending`).
- Create: `src/lib/payments/index.ts`:

```ts
import type { PaymentGateway } from './types';
import { MercadoPagoGateway } from './mercadopago';

export function getPaymentGateway(): PaymentGateway {
  // Trocar de provedor = nova classe + novo case aqui. Nada mais muda.
  switch (process.env.PAYMENT_PROVIDER ?? 'mercadopago') {
    case 'mercadopago': return new MercadoPagoGateway();
    default: throw new Error(`Unknown payment provider: ${process.env.PAYMENT_PROVIDER}`);
  }
}
```

**Step teste (antes do adaptador):** `src/lib/payments/__tests__/mercadopago.test.ts` — testar `verifyWebhook` com HMAC calculado num fixture (secret fake) e a normalização de status (função pura exportada). Run: `npm run test:unit` → FAIL → implementar → PASS.

Commit: `feat(payments): adaptador Mercado Pago atrás do contrato`

### Task 4.3: Checkout server-side seguro

**Files:**
- Rewrite: `src/app/actions/checkout.ts`

**Nova lógica de `createOrderAction(items: {id, size, qty}[], addressId | address, couponCode?)`** — cliente envia **apenas id/size/qty**:
1. Autenticar usuário.
2. Buscar produtos no banco (service role) pelos ids → preços reais (`price_centavos`), validar `active` e tamanho existente.
3. Validar estoque disponível (leitura; reserva definitiva ocorre na aprovação — ver ADR-3).
4. Calcular `subtotal` no servidor; frete via `shipping_config`; cupom via `validateCoupon` (Task 5.2); desconto Pix **não** entra aqui (o método é escolhido no MP — ver ADR-4).
5. Inserir pedido com `order_number = 'PDL-' || nextval('order_number_seq')`, todos os valores em centavos, `status='pendente'`, `payment_provider=gateway.provider`.
6. `const gateway = getPaymentGateway(); const { redirectUrl } = await gateway.createCheckout({...})`.
7. Retornar `{ redirectUrl, orderId }`.

**Modify:** `src/app/checkout/page.tsx`:
- Remover dados pré-preenchidos (estado inicial vazio) e o formulário de cartão fake inteiro (o pagamento acontece no MP).
- Step "entrega": oferecer endereços salvos (`getAddressesAction`) + formulário para novo (com ViaCEP via `lib/cep.ts` já existente); opção "salvar este endereço".
- Step "pagamento" vira informativo (redirecionamento seguro Mercado Pago — Pix, cartão, boleto) + campo de cupom.
- Exibir subtotal/frete/desconto vindos de uma action `quoteCheckoutAction` (mesma matemática do servidor — fonte única).
- `clearCart()` só após retorno bem-sucedido (mover para a página de confirmação), não antes do redirect.

Commit: `feat(checkout): preços e totais calculados no servidor via gateway desacoplado`

### Task 4.4: Webhook idempotente e genérico

**Files:**
- Rewrite: `src/app/api/webhooks/mercadopago/route.ts` (fica um wrapper fino)
- Create: `src/lib/payments/process-notification.ts` (lógica独 de domínio, testável)

Fluxo:
1. `gateway.verifyWebhook` → 401 se inválido.
2. `gateway.parseNotification` → null = 200 ok (evento irrelevante).
3. **Idempotência:** `insert into payment_events (id: 'mercadopago:'+eventId+':'+status)` — conflito = já processado, retornar 200.
4. Transição de status do pedido (nunca regredir: `pago` não volta a `pendente`).
5. Se `approved`: `rpc('decrement_stock', { items, p_order_id })`; se estoque insuficiente (corrida rara), marcar pedido `status='pago'` mesmo assim e registrar flag para tratamento manual no admin (ver ADR-3).
6. Se `refunded/cancelled` de pedido antes `pago`: repor estoque (`stock_movements` reason `cancel`).
7. Atualizar `payment_external_id`, `payment_method`, `updated_at`.

Commit: `feat(payments): webhook idempotente com decremento de estoque`

### Task 4.5: Confirmação server-side

**Files:**
- Rewrite: `src/app/confirmacao/page.tsx` → server component: busca o pedido com client RLS (dono) usando `order_id` do searchParam; client component apenas para o efeito visual. Limpar carrinho aqui (pequeno client component que chama `clearCart()` uma vez). Estado `pending` (Pix aguardando) com polling leve ou instrução "você receberá a confirmação".

Commit: `feat: confirmação de pedido server-side com RLS`

### Task 4.6: Documentar variáveis de ambiente

**Files:**
- Create: `.env.example` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `PAYMENT_PROVIDER=mercadopago`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `INSTAGRAM_ACCESS_TOKEN` (opcional), com comentários de onde obter cada uma.

Commit: `docs: .env.example completo`

---

# FASE 5 — Frete e cupons

### Task 5.1: Config de frete no admin

**Files:**
- Create: `src/app/admin/frete/page.tsx` (padrão da página `admin/pagamentos` existente: valor fixo, grátis acima de X, desconto Pix %)
- Create: actions `getShippingConfigAction`/`upsertShippingConfigAction` em `src/app/actions/admin.ts` (com `requireAdmin`)
- Modify: cálculo de frete no checkout/carrinho lê `shipping_config` (remover `subtotal >= 250 ? 0 : 24` dos dois lugares)
- Modify: `src/components/admin/AdminLayout.tsx` — item de menu "frete"

Commit: `feat(admin): configuração de frete e desconto pix`

### Task 5.2: Motor de cupons

**Step 1 — teste primeiro:** `src/lib/__tests__/coupon.test.ts` — casos: percentual, fixo, mínimo de subtotal não atingido, expirado, esgotado (`max_uses`), inativo, código inexistente, desconto nunca excede subtotal.

**Step 2:** Create `src/lib/coupon.ts` — função pura `computeDiscount(coupon, subtotalCentavos): number` + `src/app/actions/coupons.ts` — `validateCouponAction(code, subtotal)` (service role, retorna desconto ou erro tipado) e incremento de `used_count` no momento da criação do pedido (dentro de `createOrderAction`).

**Step 3:** UI: campo de cupom no checkout (step pagamento) com feedback de erro/sucesso no estilo atual.

Commit: `feat: cupons de desconto no checkout`

### Task 5.3: Admin de cupons

**Files:**
- Create: `src/app/admin/cupons/page.tsx` — listar, criar, ativar/desativar, excluir (padrão visual das tabelas admin existentes; mostrar usos/limite/validade)
- Actions correspondentes em `src/app/actions/admin.ts` com `requireAdmin`
- Menu no `AdminLayout`

Commit: `feat(admin): gerenciamento de cupons`

---

# FASE 6 — Painel administrativo completo

### Task 6.1: Admin de pedidos

**Files:**
- Create: `src/app/admin/pedidos/page.tsx` — lista com filtro por status, busca por número/e-mail, paginação (`range`)
- Create: `src/app/admin/pedidos/[id]/page.tsx` — detalhe: itens, endereço, pagamento, timeline; ações de transição de status (`pago → enviado → entregue`, `cancelar` com reposição de estoque via `stock_movements`), campo de código de rastreio (`add column tracking_code text` — incluir em migration `20260804000007_orders_tracking.sql`)
- Actions: `listOrdersAdminAction`, `getOrderAdminAction`, `updateOrderStatusAction` (com `requireAdmin`; transições válidas apenas)
- Menu no `AdminLayout`

Commit: `feat(admin): gestão completa de pedidos`

### Task 6.2: Admin de clientes

**Files:**
- Create: `src/app/admin/clientes/page.tsx` — lista de `profiles` + e-mail (via `service.auth.admin.listUsers()`), com nº de pedidos e total gasto (agregação em `orders`); detalhe inline ou página com pedidos do cliente.
- Action `listCustomersAdminAction` (`requireAdmin`)

Commit: `feat(admin): visão de clientes`

### Task 6.3: Estoque no admin de produtos

**Files:**
- Modify: `src/app/admin/produtos/[id]/page.tsx` e `novo/page.tsx` — editor de estoque por tamanho (grade tamanho × quantidade, substituindo/absorvendo o conceito `unavail`: tamanho indisponível = estoque 0). Preço passa a input numérico em reais convertendo para centavos.
- Modify: `ProdutoClient.tsx` — indisponibilidade derivada de `stock[size] === 0`; badge "últimas unidades" quando `stock <= 2` (opcional, mantém estilo).
- Create: `src/app/admin/estoque/page.tsx` — visão geral: todos os produtos × tamanhos, edição rápida, últimos `stock_movements`.

Commit: `feat(admin): gestão de estoque por tamanho`

### Task 6.4: Dashboard admin

**Files:**
- Create: `src/app/admin/dashboard/page.tsx` — cards: pedidos hoje/mês, receita (soma `total_centavos` de pedidos pagos), pedidos pendentes de envio, produtos com estoque baixo. Sem gráficos pesados — números no estilo editorial do site.
- Modify: `src/app/admin/page.tsx` — redirect para `/admin/dashboard`.

Commit: `feat(admin): dashboard com indicadores`

### Task 6.5: Admin de depoimentos + limpeza de TESTIMONIALS

**Files:**
- Create: `src/app/admin/depoimentos/page.tsx` (CRUD simples, ordenação, visibilidade)
- Modify: `HomeClient.tsx` — receber depoimentos de `fetchTestimonials()` (via page server component)
- Verify: `grep -rn "TESTIMONIALS" src/` → vazio

Commit: `feat(admin): depoimentos gerenciáveis`

### Task 6.6: AdminContext — reduzir e alinhar

**Files:**
- Modify: `src/context/AdminContext.tsx` — remover fallbacks `HOME_PRODUCTS`/`COLLECTIONS`; carregar do banco com estados de loading; erros de persistência não podem ser engolidos (`.catch(console.error)`) — mostrar toast/erro e reverter o estado otimista.

Commit: `refactor(admin): estado sem fallback mockado e com tratamento de erro`

---

# FASE 7 — Qualidade: SEO, acessibilidade, performance, robustez

### Task 7.1: Metadata e SEO

**Files:**
- Modify: `src/app/layout.tsx` — `metadata` base (title template, description, openGraph).
- Modify: `src/app/produto/[id]/page.tsx` e `colecao/[id]/page.tsx` — `generateMetadata` com nome/descrição/imagem do produto; JSON-LD `Product` (com `offers` em BRL) via `node_modules/next/dist/docs/01-app/02-guides/json-ld.md`.
- Create: `src/app/sitemap.ts` (produtos + coleções + páginas fixas), `src/app/robots.ts` (bloquear `/admin`, `/api`, `/checkout`, `/perfil`).

Commit: `feat(seo): metadata dinâmica, JSON-LD, sitemap e robots`

### Task 7.2: Estados de erro e vazio

**Files:**
- Create: `src/app/error.tsx`, `src/app/not-found.tsx` (estilo editorial do site: "esse pingo se perdeu…")
- Verify: páginas de catálogo com banco vazio renderizam estado vazio digno, sem produtos fantasma.

Commit: `feat: páginas de erro e not-found`

### Task 7.3: Páginas institucionais

**Files:**
- Create: `src/app/trocas/page.tsx`, `src/app/privacidade/page.tsx`, `src/app/sobre/page.tsx` — conteúdo real fornecido pela loja (deixar estrutura + texto placeholder MARCADO com `{/* CONTEÚDO PENDENTE DA LOJA */}` para o lojista revisar — única exceção consciente de conteúdo provisório, sinalizada).
- Modify: `PdlFooter.tsx` — linkar (hoje provavelmente há links mortos; conferir).

Commit: `feat: páginas institucionais`

### Task 7.4: Acessibilidade

**Steps:**
1. Passar nas páginas principais: `aria-label` em botões de ícone (coração, carrinho, busca, drawer), foco visível, `alt` real nas imagens de produto (usar `label`/nome), hierarquia de headings, contraste dos tints (verificar `--muted` sobre cream).
2. Drawer/modais: focus trap + `Escape` fecha + `aria-modal`.
3. Formulários: `label for`/`id` reais (o padrão `pdl-input` já tem labels — conferir associação), mensagens de erro anunciadas (`aria-live="polite"`).
4. Testar navegação por teclado no fluxo completo compra.

Commit: `fix(a11y): navegação por teclado, aria e alt text`

### Task 7.5: Performance e cache moderno

**Steps:**
1. Ler `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md` e `.../api-reference/config/next-config-js/cacheComponents.md`; avaliar habilitar `cacheComponents: true` e migrar leituras públicas para `'use cache'` + `cacheTag('catalog')`, invalidando com `updateTag('catalog')`/`revalidateTag` nas actions admin (substituindo os `revalidatePath` espalhados). **Só adotar se o build/dev validar sem regressões**; caso contrário manter `revalidate: 60` e registrar em ADR.
2. Trocar `<PdlImg>`/imagens por `next/image` onde forem URLs do Storage (definir `images.remotePatterns` para o domínio do Supabase em `next.config.ts`); usar `preload` (não `priority`, deprecado) apenas na imagem hero.
3. Auditar bundle: `dynamic import` já usado no checkout; conferir se `admin/*` não entra no bundle público.

Commit: `perf: cache tags, next/image e invalidação por tag`

---

# FASE 8 — Testes e verificação final

### Task 8.1: Testes e2e Playwright

**Files:**
- Create: `playwright.config.ts` (baseURL localhost:3000, webServer `npm run dev`)
- Create: `tests/e2e/catalogo.spec.ts` — home carrega, navegar até produto, ver tamanhos.
- Create: `tests/e2e/carrinho.spec.ts` — adicionar ao carrinho, alterar qty, carrinho persiste após reload, remover.
- Create: `tests/e2e/checkout.spec.ts` — logado (usuário seed), preencher endereço, aplicar cupom inválido (erro visível), chegar até o ponto do redirect (mockar `createOrderAction`? Não — parar na chamada: interceptar navegação para `mercadopago.com` e validar que o pedido foi criado `pendente` no banco).
- Create: `tests/e2e/admin.spec.ts` — login admin, criar produto, produto aparece na loja; acesso a `/admin/produtos` deslogado redireciona.
- Script: `"test:e2e": "playwright test"`.

### Task 8.2: Webhook — teste de integração local

**Files:**
- Create: `src/scripts/simulate-webhook.ts` (tsx) — monta payload MP fake com HMAC válido usando `MERCADOPAGO_WEBHOOK_SECRET` de teste, POSTa no endpoint local, verifica: pedido vira `pago`, estoque decrementa, segundo POST idêntico não duplica (`payment_events`).

### Task 8.3: Verificação final (checklist antes de considerar completo)

1. `npm run build` limpo (sem warnings de deprecação do Next).
2. `npm run test:unit` e `npm run test:e2e` verdes.
3. `grep -rn "MOCK_\|pingo2024\|HeartButtonExample\|INITIAL_CART" src/` → vazio.
4. `grep -rn "console.log" src/` → apenas logs intencionais de servidor (idealmente nenhum).
5. Teste manual completo em sandbox MP (credenciais de teste): compra Pix e cartão de teste, webhook via túnel (ex.: `ngrok`), status atualiza, estoque decrementa, e-mail do pedido aparece no admin.
6. Rodar fluxo como usuário não-admin tentando acessar `/admin` e chamar actions → bloqueado.

Commit final: `chore: suíte de testes e verificação de produção`

---

## Decisões arquiteturais (ADRs) — registrar em `docs/adr/`

- **ADR-1 — Pagamentos via ports & adapters:** todo acesso a provedor de pagamento passa pela interface `PaymentGateway` (`src/lib/payments/types.ts`) resolvida por `getPaymentGateway()`. Trocar de provedor = implementar a interface + registrar na factory + novo webhook route (wrapper de 10 linhas). O domínio (pedidos, estoque, status) nunca vê tipos do MP.
- **ADR-2 — Dinheiro em centavos (integer):** elimina os três parsers de string divergentes; formatação apenas na borda da UI.
- **ADR-3 — Estoque decrementa na aprovação do pagamento, não na criação do pedido:** evita reservar estoque de pedidos abandonados; aceita corrida rara (dois pagamentos simultâneos do último item) tratada com flag para resolução manual no admin. Alternativa (reserva com TTL) registrada como evolução futura.
- **ADR-4 — Checkout Pro (redirect) em vez de checkout transparente:** nenhum dado de cartão toca o sistema (PCI fora de escopo); desconto Pix é aplicado configurando `payment_methods`/preço no provedor ou removido — decidir com o lojista; UI não coleta cartão.
- **ADR-5 — Autorização em camadas:** proxy só verifica sessão (rápido, sem DB); `requireAdmin()` nas actions e layouts server-side é a fronteira real de segurança. RLS é a última linha de defesa.
- **ADR-6 — Sem fallback silencioso para dados mockados:** falha de dados = estado de erro visível, nunca catálogo fantasma.

## Riscos e pontos de atenção

- **Migração de preço (Task 1.1/1.4)** é a mudança mais invasiva — fazer cedo e completa; nada de manter os dois formatos.
- **Tipo real da coluna `stock`** no baseline pode exigir ajuste na função SQL da Task 1.3.
- **Cache Components (Task 7.5)** é opcional — não bloquear o restante se causar problemas; documentar a decisão.
- **E-mails transacionais** (confirmação de pedido/envio) ficaram fora do escopo deste plano — próxima iteração (Resend ou SMTP; gancho natural: `process-notification.ts` e `updateOrderStatusAction`).
- Antes de escrever código de cada fase, **ler o doc correspondente do Next em `node_modules/next/dist/docs/`** (o projeto avisa que difere do conhecimento de treinamento).
