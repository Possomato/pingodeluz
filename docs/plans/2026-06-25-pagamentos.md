# Configuração Global de Pagamentos — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Substituir o campo `installments` por produto por uma configuração global de parcelamento com cálculo automático baseado no preço.

**Architecture:** `PaymentConfig` é uma entidade singleton persistida no Supabase (`payment_config` table, uma linha com `id='default'`). Uma função pura `calcInstallments` calcula o texto de parcelamento a partir do preço. `ProdutoPage` busca a config server-side e passa para `ProdutoClient`. Admin gerencia via `/admin/pagamentos`.

**Tech Stack:** Next.js 16, TypeScript, Supabase (REST), React state, localStorage fallback.

---

## Task 1: `PaymentConfig` + `calcInstallments` + `fetchPaymentConfig` em `data.ts`

**Files:**
- Modify: `src/lib/data.ts`

**Step 1: Adicionar interface e default após `DEFAULT_SIZE_TABLES`**

```typescript
export interface PaymentConfig {
  maxParcelas: number;
  parcelaMinima: number;
  juros: 'sem' | number;
}

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  maxParcelas: 3,
  parcelaMinima: 50,
  juros: 'sem',
};
```

**Step 2: Adicionar função pura `calcInstallments` logo após o default**

```typescript
export function calcInstallments(price: string, config: PaymentConfig): string | null {
  const value = parseFloat(price.replace(/[^\d,]/g, '').replace(',', '.'));
  if (!value || value <= 0) return null;
  for (let n = config.maxParcelas; n >= 2; n--) {
    const parcela = value / n;
    if (parcela >= config.parcelaMinima) {
      const parcelaFmt = parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const jurosText = config.juros === 'sem' ? 'sem juros' : `${config.juros}% a.m.`;
      return `em ${n}x de R$ ${parcelaFmt} ${jurosText}`;
    }
  }
  return null;
}
```

**Step 3: Adicionar `fetchPaymentConfig` após `fetchHomepageConfig`**

```typescript
export async function fetchPaymentConfig(): Promise<PaymentConfig> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/payment_config?id=eq.default&select=*`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return DEFAULT_PAYMENT_CONFIG;
    const rows = await res.json();
    if (!rows.length) return DEFAULT_PAYMENT_CONFIG;
    const row = rows[0];
    return {
      maxParcelas: row.max_parcelas as number,
      parcelaMinima: row.parcela_minima as number,
      juros: row.juros as 'sem' | number,
    };
  } catch {
    return DEFAULT_PAYMENT_CONFIG;
  }
}
```

**Step 4: Commit**

```bash
git add src/lib/data.ts
git commit -m "feat: add PaymentConfig type, calcInstallments and fetchPaymentConfig"
```

---

## Task 2: Server Action `upsertPaymentConfigAction`

**Files:**
- Modify: `src/app/actions/admin.ts`

**Step 1: Adicionar `PaymentConfig` ao import existente**

```typescript
import type { Product, Collection, HomepageSection, SizeTable, PaymentConfig } from '@/lib/data';
```

**Step 2: Adicionar action no final do arquivo**

```typescript
export async function upsertPaymentConfigAction(config: PaymentConfig) {
  const supabase = createServiceClient();
  const { error } = await supabase.from('payment_config').upsert({
    id: 'default',
    max_parcelas: config.maxParcelas,
    parcela_minima: config.parcelaMinima,
    juros: config.juros,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/pagamentos');
  revalidatePath('/produto/[id]', 'page');
}
```

**Step 3: Commit**

```bash
git add src/app/actions/admin.ts
git commit -m "feat: add upsertPaymentConfigAction"
```

---

## Task 3: AdminContext — adicionar PaymentConfig

**Files:**
- Modify: `src/context/AdminContext.tsx`

**Step 1: Atualizar imports**

Em `@/lib/data`, adicionar: `PaymentConfig, DEFAULT_PAYMENT_CONFIG, fetchPaymentConfig`
Em `@/app/actions/admin`, adicionar: `upsertPaymentConfigAction`

**Step 2: Adicionar ao `AdminContextType`**

```typescript
paymentConfig: PaymentConfig;
updatePaymentConfig: (config: PaymentConfig) => Promise<void>;
```

**Step 3: Adicionar state no provider** (após `sizeTables` state)

```typescript
const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
```

No `useEffect`, após `fetchSizeTables`:

```typescript
fetchPaymentConfig().then(data => setPaymentConfig(data)).catch(() => {});
```

**Step 4: Adicionar handler** (após `deleteSizeTable`)

```typescript
const updatePaymentConfig = async (config: PaymentConfig) => {
  setPaymentConfig(config);
  await upsertPaymentConfigAction(config).catch(console.error);
};
```

**Step 5: Adicionar ao Provider value**

```typescript
paymentConfig, updatePaymentConfig,
```

**Step 6: Commit**

```bash
git add src/context/AdminContext.tsx
git commit -m "feat: add paymentConfig to AdminContext"
```

---

## Task 4: Admin nav + página `/admin/pagamentos`

**Files:**
- Modify: `src/components/admin/AdminLayout.tsx`
- Create: `src/app/admin/pagamentos/page.tsx`

**Step 1: Adicionar link no nav** (após "Tabelas", antes do botão Sair)

```tsx
<Link href="/admin/pagamentos" className={pathname.startsWith('/admin/pagamentos') ? 'active' : ''}>Pagamentos</Link>
```

**Step 2: Criar a página `/admin/pagamentos/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { calcInstallments, PaymentConfig } from '@/lib/data';

const PREVIEW_PRICES = ['R$ 89', 'R$ 159', 'R$ 250'];

export default function PagamentosPage() {
  const { paymentConfig, updatePaymentConfig } = useAdmin();
  const [form, setForm] = useState<PaymentConfig>(paymentConfig);
  const [toast, setToast] = useState(false);

  const set = <K extends keyof PaymentConfig>(k: K, v: PaymentConfig[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePaymentConfig(form);
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Configuração de <em>pagamentos</em></h1>
      </div>

      <form className="adm-form" onSubmit={handleSave} style={{ maxWidth: 480 }}>
        <div className="adm-form-row">
          <div className="adm-field">
            <label>Máximo de parcelas</label>
            <input
              type="number" min={1} max={12}
              value={form.maxParcelas}
              onChange={e => set('maxParcelas', parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="adm-field">
            <label>Parcela mínima (R$)</label>
            <input
              type="number" min={0}
              value={form.parcelaMinima}
              onChange={e => set('parcelaMinima', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="adm-field">
          <label>Juros</label>
          <select
            value={form.juros === 'sem' ? 'sem' : 'com'}
            onChange={e => set('juros', e.target.value === 'sem' ? 'sem' : 0)}
          >
            <option value="sem">Sem juros</option>
            <option value="com">Com juros (% a.m.)</option>
          </select>
          {form.juros !== 'sem' && (
            <input
              type="number" min={0} step={0.1}
              value={typeof form.juros === 'number' ? form.juros : 0}
              onChange={e => set('juros', parseFloat(e.target.value) || 0)}
              placeholder="ex: 1.5"
              style={{ marginTop: 6 }}
            />
          )}
        </div>

        <div className="adm-field">
          <label style={{ marginBottom: 8, display: 'block' }}>Preview</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {PREVIEW_PRICES.map(price => {
              const result = calcInstallments(price, form);
              return (
                <div key={price} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13, minWidth: 64 }}>{price}</span>
                  <span style={{ fontSize: 13, color: result ? 'var(--ink)' : 'var(--muted)' }}>
                    {result ?? '— sem parcelamento'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="adm-form-actions">
          <button type="submit" className="adm-btn adm-btn-primary">Salvar configuração</button>
        </div>
        {toast && <div className="adm-toast">Configuração salva!</div>}
      </form>
    </AdminLayout>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/admin/AdminLayout.tsx src/app/admin/pagamentos/page.tsx
git commit -m "feat: add /admin/pagamentos page with live preview"
```

---

## Task 5: Remover `installments` do formulário de produto

**Files:**
- Modify: `src/app/admin/produtos/[id]/page.tsx`

**Step 1: Remover o campo do formulário**

Encontrar e remover o bloco:
```tsx
<div className="adm-field">
  <label>Parcelamento</label>
  <input value={form.installments ?? ''} onChange={e => set('installments', e.target.value)} placeholder="em 3x de R$ 63 sem juros" />
</div>
```
(e o `<div className="adm-form-row">` pai se ficar vazio — verificar se o campo "Preço" estava junto)

**Step 2: Remover `installments: ''` do `useState` initial value**

No objeto inicial do `useState<Partial<Product>>`, remover `installments: ''`.

**Step 3: Commit**

```bash
git add src/app/admin/produtos/[id]/page.tsx
git commit -m "feat: remove installments field from product form"
```

---

## Task 6: `ProdutoPage` — buscar `paymentConfig` server-side

**Files:**
- Modify: `src/app/produto/[id]/page.tsx`

**Step 1: Atualizar o arquivo**

```tsx
import ProdutoClient from '@/components/ProdutoClient';
import { fetchProductById, fetchSizeTableById, fetchPaymentConfig } from '@/lib/data';

export default async function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, paymentConfig] = await Promise.all([
    fetchProductById(id),
    fetchPaymentConfig(),
  ]);
  const sizeTable = await fetchSizeTableById(p.sizeTableId);
  return <ProdutoClient p={p} id={id} sizeTable={sizeTable} paymentConfig={paymentConfig} />;
}
```

Nota: `fetchProductById` é buscado primeiro pois `fetchSizeTableById` depende de `p.sizeTableId`. `fetchPaymentConfig` é independente e pode rodar em paralelo com `fetchProductById`.

**Step 2: Commit**

```bash
git add src/app/produto/[id]/page.tsx
git commit -m "feat: fetch paymentConfig server-side in ProdutoPage"
```

---

## Task 7: `ProdutoClient` — usar `calcInstallments`

**Files:**
- Modify: `src/components/ProdutoClient.tsx`

**Step 1: Atualizar import**

```tsx
import { TABELA_MEDIDAS, SIZES_MENINAS, fetchCatalog, calcInstallments } from '@/lib/data';
import type { Product, SizeTable, PaymentConfig } from '@/lib/data';
```

**Step 2: Atualizar props do componente**

```tsx
export default function ProdutoClient({
  p, id, sizeTable, paymentConfig,
}: {
  p: Product;
  id: string;
  sizeTable: SizeTable | null;
  paymentConfig: PaymentConfig;
}) {
```

**Step 3: Substituir exibição do parcelamento**

Localizar a linha:
```tsx
{p.installments && <span className="installments">— {p.installments}</span>}
```

Substituir por:
```tsx
{(() => { const inst = calcInstallments(p.price, paymentConfig); return inst ? <span className="installments">— {inst}</span> : null; })()}
```

**Step 4: Commit**

```bash
git add src/components/ProdutoClient.tsx
git commit -m "feat: use calcInstallments in ProdutoClient, remove p.installments"
```

---

## Supabase — nota para criação de tabela

```sql
CREATE TABLE payment_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  max_parcelas INTEGER NOT NULL DEFAULT 3,
  parcela_minima NUMERIC NOT NULL DEFAULT 50,
  juros TEXT NOT NULL DEFAULT 'sem'
);

-- Inserir linha padrão
INSERT INTO payment_config (id, max_parcelas, parcela_minima, juros)
VALUES ('default', 3, 50, 'sem')
ON CONFLICT (id) DO NOTHING;
```
