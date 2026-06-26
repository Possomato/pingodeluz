# Tabelas de Tamanho + Modelo Encomenda — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Substituir o sistema de estoque por tabelas de tamanho configuráveis no admin, mantendo a experiência do cliente idêntica.

**Architecture:** `SizeTable` é uma entidade independente gerenciada em `/admin/tabelas`. Produtos apontam para uma tabela via `sizeTableId` e declaram quais tamanhos estão ativos em `sizes[]`. A página de produto busca a tabela vinculada server-side e renderiza colunas dinamicamente.

**Tech Stack:** Next.js 16, TypeScript, Supabase (REST), localStorage fallback, React state.

---

## Task 1: Adicionar `SizeTable` a `src/lib/data.ts`

**Files:**
- Modify: `src/lib/data.ts`

**Step 1: Adicionar interface e dados padrão após `TABELA_MEDIDAS`**

```typescript
export interface SizeTable {
  id: string;
  name: string;
  columns: string[];
  rows: { size: string; values: Record<string, number> }[];
}

export const DEFAULT_SIZE_TABLES: SizeTable[] = [
  {
    id: 'padrao-meninas',
    name: 'Padrão meninas',
    columns: ['tórax', 'cintura', 'comprimento'],
    rows: TABELA_MEDIDAS.map(r => ({
      size: r.manequim,
      values: { 'tórax': r.torax, 'cintura': r.cintura, 'comprimento': r.comprimento },
    })),
  },
];
```

**Step 2: Adicionar `sizeTableId` ao `Product` interface** (após `type?: string`)

```typescript
sizeTableId?: string;
```

**Step 3: Adicionar helper localStorage + fetchers após `fetchHomepageConfig`**

```typescript
export function getSizeTables(): SizeTable[] {
  if (typeof window === 'undefined') return DEFAULT_SIZE_TABLES;
  try {
    const saved = localStorage.getItem('pdl_size_tables');
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.length > 0 ? parsed : DEFAULT_SIZE_TABLES;
  } catch {
    return DEFAULT_SIZE_TABLES;
  }
}

export async function fetchSizeTables(): Promise<SizeTable[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/size_tables?select=*&order=name`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return DEFAULT_SIZE_TABLES;
    const rows = await res.json();
    if (!rows.length) return DEFAULT_SIZE_TABLES;
    return rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      name: r.name as string,
      columns: r.columns as string[],
      rows: r.rows as SizeTable['rows'],
    }));
  } catch {
    return DEFAULT_SIZE_TABLES;
  }
}

export async function fetchSizeTableById(id: string | undefined): Promise<SizeTable | null> {
  if (!id) return null;
  try {
    const all = await fetchSizeTables();
    return all.find(t => t.id === id) ?? null;
  } catch {
    return null;
  }
}
```

**Step 4: Adicionar `sizeTableId` ao `rowToProduct`** (após `type:`)

```typescript
sizeTableId: (row.size_table_id ?? row.sizeTableId) as string | undefined,
```

**Step 5: Commit**

```bash
git add src/lib/data.ts
git commit -m "feat: add SizeTable type, helpers and fetchSizeTables"
```

---

## Task 2: Server Actions para SizeTable

**Files:**
- Modify: `src/app/actions/admin.ts`

**Step 1: Adicionar `size_table_id` ao `productToRow`** (após `product_type:`)

```typescript
size_table_id: p.sizeTableId ?? null,
```

**Step 2: Adicionar actions no final do arquivo**

```typescript
export async function upsertSizeTableAction(t: SizeTable) {
  const supabase = createServiceClient();
  const { error } = await supabase.from('size_tables').upsert({
    id: t.id,
    name: t.name,
    columns: t.columns,
    rows: t.rows,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/tabelas');
}

export async function deleteSizeTableAction(id: string) {
  const supabase = createServiceClient();
  const { error } = await supabase.from('size_tables').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/tabelas');
}
```

**Step 3: Adicionar import do tipo no topo**

```typescript
import type { Product, Collection, HomepageSection, SizeTable } from '@/lib/data';
```

**Step 4: Commit**

```bash
git add src/app/actions/admin.ts
git commit -m "feat: add upsertSizeTableAction and deleteSizeTableAction"
```

---

## Task 3: AdminContext — adicionar SizeTable

**Files:**
- Modify: `src/context/AdminContext.tsx`

**Step 1: Adicionar ao import de data**

```typescript
import { ..., SizeTable, DEFAULT_SIZE_TABLES, fetchSizeTables, getSizeTables } from '@/lib/data';
import { ..., upsertSizeTableAction, deleteSizeTableAction } from '@/app/actions/admin';
```

**Step 2: Adicionar ao `AdminContextType`**

```typescript
sizeTables: SizeTable[];
addSizeTable: (t: Omit<SizeTable, 'id'>) => Promise<void>;
updateSizeTable: (id: string, t: SizeTable) => Promise<void>;
deleteSizeTable: (id: string) => Promise<void>;
```

**Step 3: Adicionar state e handlers no provider** (após `homepageConfig` state)

```typescript
const [sizeTables, setSizeTables] = useState<SizeTable[]>(DEFAULT_SIZE_TABLES);
```

No `useEffect`, após `fetchHomepageConfig`:

```typescript
fetchSizeTables().then(data => {
  if (data.length > 0) setSizeTables(data);
}).catch(() => {});
```

Handlers (após `updateCollection`):

```typescript
const addSizeTable = async (t: Omit<SizeTable, 'id'>) => {
  const id = t.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `tabela-${Date.now()}`;
  const full: SizeTable = { ...t, id };
  setSizeTables(prev => [...prev, full]);
  await upsertSizeTableAction(full).catch(console.error);
};

const updateSizeTable = async (id: string, t: SizeTable) => {
  setSizeTables(prev => prev.map(x => x.id === id ? t : x));
  await upsertSizeTableAction(t).catch(console.error);
};

const deleteSizeTable = async (id: string) => {
  setSizeTables(prev => prev.filter(x => x.id !== id));
  await deleteSizeTableAction(id).catch(console.error);
};
```

**Step 4: Adicionar ao Provider value**

```typescript
sizeTables, addSizeTable, updateSizeTable, deleteSizeTable,
```

**Step 5: Commit**

```bash
git add src/context/AdminContext.tsx
git commit -m "feat: add sizeTables to AdminContext"
```

---

## Task 4: Admin nav — link Tabelas

**Files:**
- Modify: `src/components/admin/AdminLayout.tsx`

**Step 1: Adicionar link após "Homepage"**

```tsx
<Link href="/admin/tabelas" className={pathname.startsWith('/admin/tabelas') ? 'active' : ''}>Tabelas</Link>
```

**Step 2: Commit**

```bash
git add src/components/admin/AdminLayout.tsx
git commit -m "feat: add Tabelas link to admin nav"
```

---

## Task 5: `/admin/tabelas` — listagem

**Files:**
- Create: `src/app/admin/tabelas/page.tsx`

**Step 1: Criar página**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';

export default function TabelasPage() {
  const { sizeTables, deleteSizeTable } = useAdmin();
  const router = useRouter();

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Tabelas de <em>tamanho</em></h1>
        <button className="adm-btn adm-btn-primary" onClick={() => router.push('/admin/tabelas/novo')}>+ Nova tabela</button>
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr><th>Nome</th><th>Colunas</th><th>Tamanhos</th><th></th></tr>
          </thead>
          <tbody>
            {sizeTables.map(t => (
              <tr key={t.id}>
                <td style={{ fontWeight: 500 }}>{t.name}</td>
                <td style={{ color: 'var(--muted)' }}>{t.columns.join(', ')}</td>
                <td style={{ color: 'var(--muted)' }}>{t.rows.map(r => r.size).join(', ')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="adm-btn adm-btn-secondary" onClick={() => router.push(`/admin/tabelas/${t.id}`)}>Editar</button>
                    <button className="adm-btn" style={{ color: 'var(--terra)' }} onClick={() => { if (confirm(`Excluir "${t.name}"?`)) deleteSizeTable(t.id); }}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sizeTables.length === 0 && <p style={{ color: 'var(--muted)', padding: '24px 0' }}>Nenhuma tabela cadastrada.</p>}
      </div>
    </AdminLayout>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/admin/tabelas/page.tsx
git commit -m "feat: add /admin/tabelas list page"
```

---

## Task 6: Componente `SizeTableForm`

**Files:**
- Create: `src/components/admin/SizeTableForm.tsx`

**Step 1: Criar componente**

```tsx
'use client';

import { useState } from 'react';
import type { SizeTable } from '@/lib/data';

interface Props {
  initial: Partial<SizeTable>;
  onSave: (t: SizeTable) => void;
}

export default function SizeTableForm({ initial, onSave }: Props) {
  const [form, setForm] = useState<SizeTable>({
    id: initial.id ?? '',
    name: initial.name ?? '',
    columns: initial.columns ?? [],
    rows: initial.rows ?? [],
  });
  const [toast, setToast] = useState(false);

  const addColumn = () => setForm(f => ({ ...f, columns: [...f.columns, ''] }));

  const renameColumn = (i: number, val: string) =>
    setForm(f => ({ ...f, columns: f.columns.map((c, j) => j === i ? val : c) }));

  const removeColumn = (i: number) =>
    setForm(f => ({
      ...f,
      columns: f.columns.filter((_, j) => j !== i),
      rows: f.rows.map(r => {
        const v = { ...r.values };
        delete v[f.columns[i]];
        return { ...r, values: v };
      }),
    }));

  const addRow = () =>
    setForm(f => ({
      ...f,
      rows: [...f.rows, { size: '', values: Object.fromEntries(f.columns.map(c => [c, 0])) }],
    }));

  const removeRow = (i: number) =>
    setForm(f => ({ ...f, rows: f.rows.filter((_, j) => j !== i) }));

  const setRowSize = (i: number, size: string) =>
    setForm(f => ({ ...f, rows: f.rows.map((r, j) => j === i ? { ...r, size } : r) }));

  const setCellValue = (rowIdx: number, col: string, val: number) =>
    setForm(f => ({
      ...f,
      rows: f.rows.map((r, i) => i === rowIdx ? { ...r, values: { ...r.values, [col]: val } } : r),
    }));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  return (
    <form className="adm-form" onSubmit={handleSave}>
      <div className="adm-field">
        <label>Nome da tabela</label>
        <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Vestido meninas" />
      </div>

      <div className="adm-field">
        <label>Colunas (medidas)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {form.columns.map((col, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                value={col}
                onChange={e => renameColumn(i, e.target.value)}
                placeholder="ex: tórax"
                style={{ width: 120 }}
              />
              <button type="button" onClick={() => removeColumn(i)} style={{ color: 'var(--terra)', fontWeight: 700, padding: '0 4px' }}>×</button>
            </div>
          ))}
          <button type="button" className="adm-btn adm-btn-secondary" onClick={addColumn}>+ coluna</button>
        </div>
      </div>

      <div className="adm-field">
        <label>Tamanhos e medidas</label>
        {form.columns.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Adicione colunas primeiro.</p>}
        {form.columns.length > 0 && (
          <div className="adm-sizetable-wrap">
            <table className="adm-sizetable">
              <thead>
                <tr>
                  <th>Tamanho</th>
                  {form.columns.map(c => <th key={c}>{c}</th>)}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {form.rows.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <input value={row.size} onChange={e => setRowSize(i, e.target.value)} placeholder="ex: 1m" style={{ width: 60 }} />
                    </td>
                    {form.columns.map(col => (
                      <td key={col}>
                        <input
                          type="number" min={0}
                          value={row.values[col] ?? ''}
                          onChange={e => setCellValue(i, col, parseFloat(e.target.value) || 0)}
                          style={{ width: 60, textAlign: 'center' }}
                        />
                      </td>
                    ))}
                    <td>
                      <button type="button" onClick={() => removeRow(i)} style={{ color: 'var(--terra)' }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="adm-btn adm-btn-secondary" style={{ marginTop: 8 }} onClick={addRow}>+ tamanho</button>
          </div>
        )}
      </div>

      <div className="adm-form-actions">
        <button type="submit" className="adm-btn adm-btn-primary">Salvar tabela</button>
      </div>
      {toast && <div className="adm-toast">Tabela salva!</div>}
    </form>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/admin/SizeTableForm.tsx
git commit -m "feat: add SizeTableForm component"
```

---

## Task 7: `/admin/tabelas/novo` e `/admin/tabelas/[id]`

**Files:**
- Create: `src/app/admin/tabelas/novo/page.tsx`
- Create: `src/app/admin/tabelas/[id]/page.tsx`

**Step 1: Criar página novo**

```tsx
// src/app/admin/tabelas/novo/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import SizeTableForm from '@/components/admin/SizeTableForm';
import type { SizeTable } from '@/lib/data';

export default function NovaTabela() {
  const { addSizeTable } = useAdmin();
  const router = useRouter();
  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Nova <em>tabela</em></h1>
        <button className="adm-btn adm-btn-secondary" onClick={() => router.push('/admin/tabelas')}>← Voltar</button>
      </div>
      <SizeTableForm
        initial={{}}
        onSave={t => { addSizeTable(t as Omit<SizeTable, 'id'>); setTimeout(() => router.push('/admin/tabelas'), 1500); }}
      />
    </AdminLayout>
  );
}
```

**Step 2: Criar página editar**

```tsx
// src/app/admin/tabelas/[id]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import SizeTableForm from '@/components/admin/SizeTableForm';

export default function EditTabela() {
  const { id } = useParams<{ id: string }>();
  const { sizeTables, updateSizeTable } = useAdmin();
  const router = useRouter();
  const table = sizeTables.find(t => t.id === id);

  if (!table) return <AdminLayout><p style={{ color: 'var(--muted)' }}>Tabela não encontrada.</p></AdminLayout>;

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Editar <em>{table.name}</em></h1>
        <button className="adm-btn adm-btn-secondary" onClick={() => router.push('/admin/tabelas')}>← Voltar</button>
      </div>
      <SizeTableForm
        initial={table}
        onSave={t => { updateSizeTable(id, t); setTimeout(() => router.push('/admin/tabelas'), 1500); }}
      />
    </AdminLayout>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/admin/tabelas/
git commit -m "feat: add /admin/tabelas/novo and /admin/tabelas/[id] pages"
```

---

## Task 8: CSS para tabela de tamanhos no admin

**Files:**
- Modify: `src/app/globals.css` (seção admin)

**Step 1: Localizar o bloco `/* admin */` e adicionar ao final das regras admin**

```css
.adm-sizetable-wrap { overflow-x: auto; }
.adm-sizetable { border-collapse: collapse; min-width: 320px; }
.adm-sizetable th { text-align: left; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); padding: 6px 8px; border-bottom: 1px solid var(--border); }
.adm-sizetable td { padding: 4px 8px; border-bottom: 1px solid var(--border-soft); }
.adm-sizetable input { font-size: 13px; }
```

**Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add admin size table editor CSS"
```

---

## Task 9: Formulário de produto — seletor de tabela de tamanhos

**Files:**
- Modify: `src/app/admin/produtos/[id]/page.tsx`

**Step 1: Adicionar `sizeTables` ao import do AdminContext**

No topo do componente `ProductForm`, adicionar ao `useAdmin()`:
```tsx
const { sizeTables } = useAdmin(); // adicionar sizeTables
```

**Step 2: Substituir o bloco `<div className="adm-field"><label>Tamanhos + estoque</label>...` por**

```tsx
<div className="adm-field">
  <label>Tabela de tamanhos</label>
  <select
    value={form.sizeTableId ?? ''}
    onChange={e => {
      const tableId = e.target.value;
      const table = sizeTables.find(t => t.id === tableId);
      set('sizeTableId', tableId);
      set('sizes', table?.rows.map(r => r.size) ?? []);
    }}
  >
    <option value="">— selecione uma tabela —</option>
    {sizeTables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
  </select>
</div>

{form.sizeTableId && (() => {
  const table = sizeTables.find(t => t.id === form.sizeTableId);
  if (!table) return null;
  return (
    <div className="adm-field">
      <label>Tamanhos disponíveis</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {table.rows.map(row => (
          <label key={row.size} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={form.sizes?.includes(row.size) ?? false}
              onChange={() => {
                const next = form.sizes?.includes(row.size)
                  ? form.sizes.filter(s => s !== row.size)
                  : [...(form.sizes ?? []), row.size];
                set('sizes', next);
              }}
            />
            <span style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13 }}>{row.size}</span>
          </label>
        ))}
      </div>
    </div>
  );
})()}
```

**Step 3: Remover** a linha `const SIZES = ['1', '2', '3', '4', '6', '8'];` e o bloco do `adm-stock-grid` que ficou obsoleto.

**Step 4: Commit**

```bash
git add src/app/admin/produtos/[id]/page.tsx
git commit -m "feat: replace stock checkboxes with size table selector in product form"
```

---

## Task 10: Página de produto — buscar tabela server-side

**Files:**
- Modify: `src/app/produto/[id]/page.tsx`

**Step 1: Atualizar o arquivo**

```tsx
import ProdutoClient from '@/components/ProdutoClient';
import { fetchProductById, fetchSizeTableById } from '@/lib/data';

export default async function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await fetchProductById(id);
  const sizeTable = await fetchSizeTableById(p.sizeTableId);
  return <ProdutoClient p={p} id={id} sizeTable={sizeTable} />;
}
```

**Step 2: Commit**

```bash
git add src/app/produto/[id]/page.tsx
git commit -m "feat: fetch sizeTable server-side in ProdutoPage"
```

---

## Task 11: ProdutoClient — tabela dinâmica

**Files:**
- Modify: `src/components/ProdutoClient.tsx`

**Step 1: Atualizar import e props**

```tsx
import type { Product, SizeTable, TABELA_MEDIDAS, SIZES_MENINAS } from '@/lib/data';
// Manter TABELA_MEDIDAS e SIZES_MENINAS apenas para fallback

export default function ProdutoClient({ p, id, sizeTable }: { p: Product; id: string; sizeTable: SizeTable | null }) {
```

**Step 2: Atualizar `sizes` e remover `unavail`**

```tsx
const sizes = p.sizes?.length ? p.sizes : SIZES_MENINAS;
// Remover: const unavail = p.unavail || [];
```

**Step 3: Atualizar botões de tamanho** — remover lógica `ua` (unavail):

```tsx
{sizes.map(s => (
  <div
    key={s}
    className={`pdl-size ${size === s ? 'selected' : ''}`}
    onClick={() => setSize(s)}
  >
    {s}
  </div>
))}
```

**Step 4: Substituir a tabela de medidas hardcoded** pelo render dinâmico:

```tsx
{/* Tabela de medidas — dinâmica se sizeTable disponível, fallback para TABELA_MEDIDAS */}
<div className="pdl-size-chart">
  <div className="pdl-size-chart-note">toque no tamanho para ver suas medidas</div>
  <div className="pdl-size-chart-scroll">
    {sizeTable ? (
      <table className="pdl-size-table">
        <thead>
          <tr>
            <th>tam.</th>
            {sizeTable.columns.map(col => <th key={col}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {sizeTable.rows.filter(row => sizes.includes(row.size)).map(row => (
            <tr
              key={row.size}
              className={`pdl-size-table-row ${size === row.size ? 'active' : ''}`}
              onClick={() => setSize(row.size)}
            >
              <td className="pdl-size-table-maneq">{row.size}</td>
              {sizeTable.columns.map(col => <td key={col}>{row.values[col] ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <table className="pdl-size-table">
        <thead>
          <tr><th>tam.</th><th>tórax</th><th>cintura</th><th>compr.</th></tr>
        </thead>
        <tbody>
          {TABELA_MEDIDAS.filter(row => sizes.includes(row.manequim)).map(row => (
            <tr
              key={row.manequim}
              className={`pdl-size-table-row ${size === row.manequim ? 'active' : ''}`}
              onClick={() => setSize(row.manequim)}
            >
              <td className="pdl-size-table-maneq">{row.manequim}</td>
              <td>{row.torax}</td>
              <td>{row.cintura}</td>
              <td>{row.comprimento}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
  <div className="pdl-size-chart-caption">medidas em centímetros · corpo da criança</div>
</div>
```

**Step 5: Commit**

```bash
git add src/components/ProdutoClient.tsx
git commit -m "feat: dynamic size table in product page, remove stock/unavail logic"
```

---

## Supabase — nota para criação de tabela

Se usando Supabase, criar a tabela `size_tables`:

```sql
CREATE TABLE size_tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  columns JSONB NOT NULL DEFAULT '[]',
  rows JSONB NOT NULL DEFAULT '[]'
);
```

E adicionar coluna em `products`:

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS size_table_id TEXT REFERENCES size_tables(id);
```
