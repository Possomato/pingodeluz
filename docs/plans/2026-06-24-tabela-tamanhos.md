# Tabela de Tamanhos Meninas — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the size system to use real infant mannequin sizes (1m–14) and show a compact, always-visible measurement table below the size selector on every product page.

**Architecture:** Static constant `TABELA_MEDIDAS` in `lib/data.ts`. `ProdutoClient` uses the new sizes as default and renders the table inline. `GeneroClient` filters updated. Homepage text updated.

**Tech Stack:** Next.js 16, TypeScript, existing CSS variables.

**Worktree:** `.worktrees/tabela-tamanhos` on branch `feature/tabela-tamanhos`

---

### Task 1: Add TABELA_MEDIDAS and SIZES_MENINAS to lib/data.ts

**Files:**
- Modify: `src/lib/data.ts`

**Step 1: Add after the TESTIMONIALS export (around line 107), before MOCK_ORDERS**

```ts
export interface MedidaRow {
  manequim: string;
  torax: number;
  cintura: number;
  comprimento: number;
}

export const TABELA_MEDIDAS: MedidaRow[] = [
  { manequim: '1m',  torax: 40, cintura: 39, comprimento: 32 },
  { manequim: '3m',  torax: 44, cintura: 41, comprimento: 35 },
  { manequim: '6m',  torax: 46, cintura: 43, comprimento: 38 },
  { manequim: '9m',  torax: 48, cintura: 44, comprimento: 41 },
  { manequim: '1',   torax: 50, cintura: 48, comprimento: 44 },
  { manequim: '2',   torax: 53, cintura: 52, comprimento: 50 },
  { manequim: '4',   torax: 57, cintura: 56, comprimento: 60 },
  { manequim: '6',   torax: 61, cintura: 58, comprimento: 65 },
  { manequim: '8',   torax: 66, cintura: 60, comprimento: 70 },
  { manequim: '10',  torax: 70, cintura: 62, comprimento: 75 },
  { manequim: '12',  torax: 75, cintura: 64, comprimento: 80 },
  { manequim: '14',  torax: 78, cintura: 66, comprimento: 85 },
];

export const SIZES_MENINAS = TABELA_MEDIDAS.map(r => r.manequim);
```

**Step 2: Update HOME_PRODUCTS mock sizes**

In `HOME_PRODUCTS`, the products `p1`, `p3`, `p5` (meninas) have `sizes: ['1', '2', '3', '4', '6', '8']`. Update them to use a representative subset:
```ts
sizes: ['1m', '3m', '6m', '9m', '1', '2', '4', '6', '8', '10', '12', '14']
```

For meninos products (p2, p4), leave sizes as-is or use a similar array — they are out of scope for this feature.

**Step 3: TypeScript check**
```bash
cd /Users/Shared/projetos/pingo-de-luz-v2/.worktrees/tabela-tamanhos && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

**Step 4: Commit**
```bash
git add src/lib/data.ts
git commit -m "feat: add TABELA_MEDIDAS and SIZES_MENINAS constants"
```

---

### Task 2: Update ProdutoClient with new sizes default and measurement table

**Files:**
- Modify: `src/components/ProdutoClient.tsx`

**Step 1: Add import**

Add to existing import from `@/lib/data`:
```ts
import { HOME_PRODUCTS, TABELA_MEDIDAS, SIZES_MENINAS } from '@/lib/data';
```

**Step 2: Update size fallback on line 19**

Change:
```ts
const sizes = p.sizes || ['1', '2', '3', '4', '6', '8'];
```
To:
```ts
const sizes = p.sizes || SIZES_MENINAS;
```

**Step 3: Add measurement table after the size selector block**

Find the closing `</div>` of `pdl-prodpage-section` that contains the size buttons (around line 95). After that closing div, insert:

```tsx
<div className="pdl-size-chart">
  <div className="pdl-size-chart-note">
    toque no tamanho para ver suas medidas
  </div>
  <div className="pdl-size-chart-scroll">
    <table className="pdl-size-table">
      <thead>
        <tr>
          <th>tam.</th>
          <th>tórax</th>
          <th>cintura</th>
          <th>compr.</th>
        </tr>
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
  </div>
  <div className="pdl-size-chart-caption">medidas em centímetros · corpo da criança</div>
</div>
```

Note: the table only shows rows for sizes the product actually has (`.filter(row => sizes.includes(row.manequim))`).

Also, remove or update the "guia de tamanhos" link text in the `<h4>` (line 77-79) — change the italic text from "guia de tamanhos" to nothing, since the table is now always visible inline:

Find:
```tsx
<h4>
  <span>tamanho</span>
  <span style={{ textTransform: 'none', letterSpacing: 0.05, fontFamily: 'var(--editorial)', fontStyle: 'italic' }}>
    guia de tamanhos
  </span>
</h4>
```
Replace with:
```tsx
<h4><span>tamanho</span></h4>
```

**Step 4: TypeScript check**
```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 5: Commit**
```bash
git add src/components/ProdutoClient.tsx
git commit -m "feat: size table always visible on product page, update default sizes"
```

---

### Task 3: Update GeneroClient filters

**Files:**
- Modify: `src/components/GeneroClient.tsx`

**Step 1: Add import**
```ts
import { SIZES_MENINAS } from '@/lib/data';
```

**Step 2: Replace the hardcoded age filters on line 42**

Current:
```ts
const filters = ['todas', '0–2 anos', '3–6 anos', '7–12 anos', ...colChips, 'vestidos', 'conjuntos', 'sob encomenda'];
```

Replace with size-based filters grouped by age range. The age groups map to:
- bebê (1m–9m): ['1m','3m','6m','9m']
- pequenos (1–4): ['1','2','4']  
- maiores (6–14): ['6','8','10','12','14']

```ts
const filters = ['todas', 'bebê · 1m–9m', 'pequenos · 1–4', 'maiores · 6–14', ...colChips];
```

**Step 3: TypeScript check**
```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 4: Commit**
```bash
git add src/components/GeneroClient.tsx
git commit -m "feat: update genero page filters to use new size groups"
```

---

### Task 4: Update homepage text references to age ranges

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Find all occurrences of "1–12 anos" in the gender cards**

Current text in the gender cards (around lines 44, 64):
- `label="meninas · 1–12 anos"` → change to `label="meninas · 1m–14"`
- `<span className="top">1–12 anos</span>` (×2, one for meninas, one for meninos) → change to `<span className="top">1m–14</span>`
- `eyebrow` in `GENDER_DATA` in `lib/data.ts`: `'todos os produtos · 0–12 anos'` → `'todos os produtos · 1m–14'`

**Step 2: Update lib/data.ts GENDER_DATA eyebrow**

Find in `src/lib/data.ts`:
```ts
eyebrow: 'todos os produtos · 0–12 anos',
```
(appears twice, once for meninas and once for meninos)

Replace both with:
```ts
eyebrow: 'todos os produtos · 1m–14',
```

**Step 3: Update page.tsx labels and top spans**

In `src/app/page.tsx`, find and update:
- `label="meninas · 1–12 anos"` → `label="meninas · 1m–14"`
- `label="meninos · 1–12 anos"` → `label="meninos · 1m–14"`
- `<span className="top">1–12 anos</span>` (both instances) → `<span className="top">1m–14</span>`

Also update the "Para cada fase" section age ranges to match the new grouping:
- "recém-chegados 0–2" → "bebê · 1m–9m"
- "descobridores 3–6" → "pequenos · 1–4"
- "aventureiros 7–12" → "maiores · 6–14"
And their descriptions can stay the same or be updated to match.

**Step 4: TypeScript check**
```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 5: Commit**
```bash
git add src/app/page.tsx src/lib/data.ts
git commit -m "feat: update age references to new size system across homepage"
```

---

### Task 5: Add CSS for the size measurement table

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add at the end of the file (after the last admin section)**

```css
/* ── size measurement table ─────────────────────────────── */
.pdl-size-chart {
  margin-top: 16px;
}

.pdl-size-chart-note {
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.04em;
  margin-bottom: 10px;
  text-transform: uppercase;
}

.pdl-size-chart-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
}

.pdl-size-chart-scroll::-webkit-scrollbar {
  display: none;
}

.pdl-size-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  font-family: var(--sans);
  min-width: 240px;
}

.pdl-size-table thead tr {
  background: var(--cream-warm);
  border-bottom: 1px solid var(--border-soft);
}

.pdl-size-table th {
  padding: 8px 12px;
  text-align: center;
  font-weight: 600;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.pdl-size-table th:first-child {
  text-align: left;
}

.pdl-size-table td {
  padding: 9px 12px;
  text-align: center;
  color: var(--ink);
  border-bottom: 1px solid var(--border-soft);
  cursor: pointer;
  transition: background 0.12s;
}

.pdl-size-table td:first-child {
  text-align: left;
  font-weight: 600;
}

.pdl-size-table tbody tr:last-child td {
  border-bottom: none;
}

.pdl-size-table tbody tr:hover td {
  background: var(--cream-warm);
}

.pdl-size-table-row.active td {
  background: #f5ede5;
  font-weight: 600;
}

.pdl-size-table-maneq {
  font-weight: 700 !important;
  font-size: 13px !important;
}

.pdl-size-chart-caption {
  margin-top: 8px;
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-align: center;
}
```

**Step 2: TypeScript check (CSS doesn't affect TS, but run anyway)**
```bash
npx tsc --noEmit 2>&1 | head -5
```

**Step 3: Commit**
```bash
git add src/app/globals.css
git commit -m "feat: add CSS for size measurement table"
```

---

### Task 6: Merge to main

**Step 1: Final build check**
```bash
npx tsc --noEmit 2>&1
```
Expected: zero errors.

**Step 2: From project root, merge**
```bash
cd /Users/Shared/projetos/pingo-de-luz-v2
git merge feature/tabela-tamanhos
```

**Step 3: Remove worktree**
```bash
git worktree remove .worktrees/tabela-tamanhos
git branch -d feature/tabela-tamanhos
```
