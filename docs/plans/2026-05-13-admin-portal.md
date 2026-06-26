# Admin Portal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a password-protected `/admin` section to manage products, stock, photos, and collections — persisted in localStorage and reflected live in the storefront.

**Architecture:** `AdminContext` owns auth state + a catalog mirror in localStorage (keys `pdl_admin_auth`, `pdl_admin_catalog`, `pdl_admin_collections`). `data.ts` gains `getCatalog()` / `getCollections()` functions that check localStorage first, so store pages read admin-saved data without any extra wiring. All admin pages are `'use client'` and share `AdminLayout` which handles the auth redirect guard.

**Tech Stack:** Next.js 15 App Router, TypeScript, React Context + localStorage, no new npm packages. Worktree: `.worktrees/feature/admin-portal`.

---

## Task 1: Extend Product type + add catalog accessor functions

**Files:**
- Modify: `src/lib/data.ts`

### Step 1: Add `stock` field to the `Product` interface

In `src/lib/data.ts`, add `stock?: Record<string, number>` to the `Product` interface (after `unavail`):

```ts
export interface Product {
  id: string;
  name: string;
  nameParts: [string, string];
  col: string;
  price: string;
  tint: string;
  label: string;
  installments?: string;
  desc?: string;
  sizes?: string[];
  unavail?: string[];
  stock?: Record<string, number>; // size → quantity; 0 = unavailable
  galleryLabels?: string[];
  imageUrl?: string; // external photo URL (admin-set)
  gender?: 'meninas' | 'meninos' | 'unissex';
}
```

Also add `imageUrl` and `gender` fields — they'll be set by the admin but are used by store pages.

### Step 2: Add accessor functions at the bottom of `data.ts`

Append after `getProductById`:

```ts
export function getCatalog(): Product[] {
  if (typeof window === 'undefined') return HOME_PRODUCTS;
  try {
    const saved = localStorage.getItem('pdl_admin_catalog');
    return saved ? JSON.parse(saved) : HOME_PRODUCTS;
  } catch {
    return HOME_PRODUCTS;
  }
}

export function getCollections(): Record<string, Collection> {
  if (typeof window === 'undefined') return COLLECTIONS;
  try {
    const saved = localStorage.getItem('pdl_admin_collections');
    return saved ? JSON.parse(saved) : COLLECTIONS;
  } catch {
    return COLLECTIONS;
  }
}
```

### Step 3: Verify build

```bash
cd .worktrees/feature/admin-portal
npm run build 2>&1 | tail -5
```

Expected: `✓ Generating static pages` with 0 TypeScript errors.

### Step 4: Commit

```bash
git add src/lib/data.ts
git commit -m "feat(data): add stock/imageUrl/gender to Product, add getCatalog/getCollections"
```

---

## Task 2: Create AdminContext

**Files:**
- Create: `src/context/AdminContext.tsx`

### Step 1: Write the context

```tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Collection, HOME_PRODUCTS, COLLECTIONS } from '@/lib/data';

const ADMIN_PASSWORD = 'pingo2024';
const AUTH_KEY = 'pdl_admin_auth';
const CATALOG_KEY = 'pdl_admin_catalog';
const COLLECTIONS_KEY = 'pdl_admin_collections';

interface AdminContextType {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  products: Product[];
  collections: Record<string, Collection>;
  addProduct: (p: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  updateCollection: (id: string, c: Partial<Collection>) => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [products, setProducts] = useState<Product[]>(HOME_PRODUCTS);
  const [collections, setCollections] = useState<Record<string, Collection>>(COLLECTIONS);

  useEffect(() => {
    setIsAuthenticated(localStorage.getItem(AUTH_KEY) === 'true');
    try {
      const cat = localStorage.getItem(CATALOG_KEY);
      if (cat) setProducts(JSON.parse(cat));
      const cols = localStorage.getItem(COLLECTIONS_KEY);
      if (cols) setCollections(JSON.parse(cols));
    } catch { /* use defaults */ }
  }, []);

  const persist = (next: Product[], nextCols: Record<string, Collection>) => {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(next));
    localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(nextCols));
  };

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

  const addProduct = (p: Omit<Product, 'id'>) => {
    const id = 'adm-' + Date.now();
    const next = [...products, { ...p, id }];
    setProducts(next);
    persist(next, collections);
  };

  const updateProduct = (id: string, patch: Partial<Product>) => {
    const next = products.map(p => p.id === id ? { ...p, ...patch } : p);
    setProducts(next);
    persist(next, collections);
  };

  const deleteProduct = (id: string) => {
    const next = products.filter(p => p.id !== id);
    setProducts(next);
    persist(next, collections);
  };

  const updateCollection = (id: string, patch: Partial<Collection>) => {
    const next = { ...collections, [id]: { ...collections[id], ...patch } };
    setCollections(next);
    persist(products, next);
  };

  return (
    <AdminContext.Provider value={{ isAuthenticated, login, logout, products, collections, addProduct, updateProduct, deleteProduct, updateCollection }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
```

### Step 2: Add AdminProvider to `src/app/layout.tsx`

Import and wrap inside `UserProvider`:

```tsx
import { AdminProvider } from '@/context/AdminContext';
// …
<CartProvider>
  <UserProvider>
    <AdminProvider>
      {children}
    </AdminProvider>
  </UserProvider>
</CartProvider>
```

### Step 3: Verify build

```bash
npm run build 2>&1 | tail -5
```

Expected: no TypeScript errors.

### Step 4: Commit

```bash
git add src/context/AdminContext.tsx src/app/layout.tsx
git commit -m "feat(admin): add AdminContext with auth + product/collection CRUD"
```

---

## Task 3: Create AdminLayout + admin CSS

**Files:**
- Create: `src/components/admin/AdminLayout.tsx`
- Modify: `src/app/globals.css` (append admin styles)

### Step 1: Create the layout component

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAdmin } from '@/context/AdminContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated && pathname !== '/admin/login') {
      router.replace('/admin/login');
    }
  }, [isAuthenticated, pathname, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="adm-shell">
      <header className="adm-header">
        <span className="adm-logo">Pingo de Luz <em>· Admin</em></span>
        <nav className="adm-nav">
          <Link href="/admin/produtos" className={pathname.startsWith('/admin/produtos') ? 'active' : ''}>Produtos</Link>
          <Link href="/admin/colecoes" className={pathname.startsWith('/admin/colecoes') ? 'active' : ''}>Coleções</Link>
        </nav>
        <button className="adm-logout" onClick={() => { logout(); router.push('/admin/login'); }}>Sair</button>
      </header>
      <main className="adm-main">{children}</main>
    </div>
  );
}
```

### Step 2: Append admin CSS to `src/app/globals.css`

Add at the very end of `globals.css`:

```css
/* ─── Admin ─────────────────────────────────────────────── */
.adm-shell { min-height: 100dvh; background: #f7f7f7; font-family: var(--sans); }
.adm-header { display: flex; align-items: center; gap: 20px; padding: 0 24px; height: 52px; background: #fff; border-bottom: 1px solid #e5e5e5; position: sticky; top: 0; z-index: 100; }
.adm-logo { font-family: var(--serif); font-size: 15px; color: #1a1a1a; white-space: nowrap; }
.adm-logo em { font-style: italic; color: #888; }
.adm-nav { display: flex; gap: 4px; flex: 1; }
.adm-nav a { padding: 5px 12px; border-radius: 6px; font-size: 13px; color: #555; text-decoration: none; }
.adm-nav a.active, .adm-nav a:hover { background: #f0f0f0; color: #1a1a1a; }
.adm-logout { margin-left: auto; font-size: 13px; color: #888; background: none; cursor: pointer; }
.adm-logout:hover { color: #c0392b; }
.adm-main { padding: 28px 24px; max-width: 900px; margin: 0 auto; }
.adm-page-title { font-family: var(--serif); font-size: 22px; color: #1a1a1a; margin-bottom: 20px; }
.adm-page-title em { font-style: italic; color: #888; }

/* Table */
.adm-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.adm-table th { text-align: left; padding: 10px 14px; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #999; border-bottom: 1px solid #f0f0f0; }
.adm-table td { padding: 12px 14px; font-size: 13px; color: #1a1a1a; border-bottom: 1px solid #f5f5f5; vertical-align: middle; }
.adm-table tr:last-child td { border-bottom: none; }
.adm-swatch { width: 28px; height: 28px; border-radius: 4px; display: inline-block; }
.adm-table .adm-actions { display: flex; gap: 6px; }

/* Buttons */
.adm-btn { padding: 7px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; letter-spacing: .03em; cursor: pointer; border: none; }
.adm-btn-primary { background: #2e7d5e; color: #fff; }
.adm-btn-primary:hover { background: #256649; }
.adm-btn-secondary { background: #f0f0f0; color: #333; }
.adm-btn-secondary:hover { background: #e5e5e5; }
.adm-btn-danger { background: #fff0f0; color: #c0392b; }
.adm-btn-danger:hover { background: #fde2e2; }
.adm-btn-sm { padding: 4px 10px; font-size: 11px; }

/* Form */
.adm-form { background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.06); padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.adm-field { display: flex; flex-direction: column; gap: 5px; }
.adm-field label { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #888; }
.adm-field input, .adm-field textarea, .adm-field select { padding: 9px 12px; border: 1px solid #e5e5e5; border-radius: 6px; font-size: 13px; font-family: var(--sans); color: #1a1a1a; background: #fafafa; width: 100%; box-sizing: border-box; }
.adm-field input:focus, .adm-field textarea:focus, .adm-field select:focus { outline: none; border-color: #2e7d5e; background: #fff; }
.adm-field textarea { resize: vertical; min-height: 80px; }
.adm-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.adm-form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.adm-form-actions { display: flex; gap: 10px; padding-top: 8px; }

/* Image preview */
.adm-img-preview { width: 80px; height: 107px; border-radius: 6px; object-fit: cover; border: 1px solid #e5e5e5; }
.adm-img-swatch { width: 80px; height: 107px; border-radius: 6px; border: 1px solid #e5e5e5; }

/* Stock grid */
.adm-stock-grid { display: flex; gap: 10px; flex-wrap: wrap; }
.adm-stock-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.adm-stock-item .sz { font-size: 11px; color: #888; letter-spacing: .05em; }
.adm-stock-item input { width: 52px; text-align: center; }

/* Tint chips */
.adm-tint-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.adm-tint-chip { width: 28px; height: 28px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; }
.adm-tint-chip.selected { border-color: #1a1a1a; }

/* Login */
.adm-login { min-height: 100dvh; display: flex; align-items: center; justify-content: center; background: #f7f7f7; }
.adm-login-box { background: #fff; border-radius: 12px; padding: 36px 32px; width: 320px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
.adm-login-title { font-family: var(--serif); font-size: 20px; margin-bottom: 6px; color: #1a1a1a; }
.adm-login-title em { font-style: italic; color: #888; }
.adm-login-sub { font-size: 13px; color: #888; margin-bottom: 24px; }
.adm-login-error { font-size: 12px; color: #c0392b; margin-top: -8px; }
@keyframes adm-shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
.adm-shake { animation: adm-shake .35s ease; }

/* Toast */
.adm-toast { position: fixed; bottom: 24px; right: 24px; background: #2e7d5e; color: #fff; padding: 10px 18px; border-radius: 8px; font-size: 13px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,.15); }

/* Collection cards */
.adm-col-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.adm-col-card { background: #fff; border-radius: 8px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,.06); display: flex; flex-direction: column; gap: 10px; }
.adm-col-card-name { font-family: var(--serif); font-size: 16px; }
.adm-col-card-meta { font-size: 12px; color: #888; }

/* Top bar for list pages */
.adm-list-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
```

### Step 3: Verify build

```bash
npm run build 2>&1 | tail -5
```

### Step 4: Commit

```bash
git add src/components/admin/AdminLayout.tsx src/app/globals.css
git commit -m "feat(admin): add AdminLayout + admin CSS"
```

---

## Task 4: Admin login page

**Files:**
- Create: `src/app/admin/login/page.tsx`

### Step 1: Write the page

```tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';

export default function AdminLoginPage() {
  const { login, isAuthenticated } = useAdmin();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (isAuthenticated) {
    router.replace('/admin/produtos');
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = login(password);
    if (ok) {
      router.push('/admin/produtos');
    } else {
      setError(true);
      setShake(true);
      setPassword('');
      setTimeout(() => setShake(false), 400);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="adm-login">
      <form className="adm-login-box" onSubmit={handleSubmit}>
        <div className="adm-login-title">Pingo de Luz <em>· Admin</em></div>
        <div className="adm-login-sub">Entre com a senha de administrador.</div>
        <div className="adm-field" style={{ marginBottom: 8 }}>
          <label>Senha</label>
          <input
            ref={inputRef}
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false); }}
            className={shake ? 'adm-shake' : ''}
            placeholder="••••••••"
          />
        </div>
        {error && <div className="adm-login-error">Senha incorreta. Tente novamente.</div>}
        <div style={{ marginTop: 20 }}>
          <button type="submit" className="adm-btn adm-btn-primary" style={{ width: '100%', padding: '10px' }}>
            Entrar
          </button>
        </div>
      </form>
    </div>
  );
}
```

### Step 2: Verify build

```bash
npm run build 2>&1 | tail -5
```

### Step 3: Commit

```bash
git add src/app/admin/login/page.tsx
git commit -m "feat(admin): add login page"
```

---

## Task 5: Admin products list page

**Files:**
- Create: `src/app/admin/produtos/page.tsx`

### Step 1: Write the page

```tsx
'use client';

import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import PdlImg from '@/components/PdlImg';

export default function AdminProdutosPage() {
  const { products, deleteProduct } = useAdmin();
  const router = useRouter();

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return;
    deleteProduct(id);
  };

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Produtos</h1>
        <button className="adm-btn adm-btn-primary" onClick={() => router.push('/admin/produtos/novo')}>
          + Adicionar produto
        </button>
      </div>
      <table className="adm-table">
        <thead>
          <tr>
            <th>Foto</th>
            <th>Nome</th>
            <th>Coleção</th>
            <th>Preço</th>
            <th>Estoque total</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => {
            const totalStock = p.stock
              ? Object.values(p.stock).reduce((s, n) => s + n, 0)
              : (p.sizes ? p.sizes.length - (p.unavail?.length ?? 0) : '—');
            return (
              <tr key={p.id}>
                <td>
                  {p.imageUrl
                    ? <img src={p.imageUrl} alt={p.name} className="adm-img-preview" />
                    : <PdlImg tint={p.tint} className="adm-img-swatch" style={{ aspectRatio: '3/4' }} />
                  }
                </td>
                <td style={{ fontWeight: 500 }}>{p.name}</td>
                <td style={{ color: '#888' }}>{p.col}</td>
                <td>{p.price}</td>
                <td>{totalStock}</td>
                <td>
                  <div className="adm-actions">
                    <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => router.push(`/admin/produtos/${p.id}`)}>Editar</button>
                    <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => handleDelete(p.id, p.name)}>Excluir</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </AdminLayout>
  );
}
```

### Step 2: Verify build

```bash
npm run build 2>&1 | tail -5
```

### Step 3: Commit

```bash
git add src/app/admin/produtos/page.tsx
git commit -m "feat(admin): add products list page"
```

---

## Task 6: Admin product form (add + edit)

**Files:**
- Create: `src/app/admin/produtos/[id]/page.tsx`
- Create: `src/app/admin/produtos/novo/page.tsx`

### Step 1: Write the shared form component

The form is used by both pages. Create it inside `src/app/admin/produtos/[id]/page.tsx` and import it from `novo/page.tsx`.

**`src/app/admin/produtos/[id]/page.tsx`:**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import PdlImg from '@/components/PdlImg';
import { Product } from '@/lib/data';

const SIZES = ['1', '2', '3', '4', '6', '8'];
const TINTS = ['rose', 'ochre', 'sage', 'clay', 'moss', 'ink'];
const TINT_COLORS: Record<string, string> = {
  rose: '#e8c5b0', ochre: '#c9a96e', sage: '#9eb89e',
  clay: '#c17c5a', moss: '#7a8c6a', ink: '#3a3530',
};

export function ProductForm({ initial, onSave, title }: {
  initial: Partial<Product>;
  onSave: (p: Partial<Product>) => void;
  title: string;
}) {
  const [form, setForm] = useState<Partial<Product>>({
    name: '', col: 'jardim', gender: 'meninas', price: '',
    installments: '', desc: '', imageUrl: '', tint: 'rose',
    sizes: SIZES, unavail: [], stock: {},
    ...initial,
  });
  const [toast, setToast] = useState(false);

  const set = (key: keyof Product, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const toggleSize = (s: string) => {
    const has = form.sizes?.includes(s);
    set('sizes', has ? form.sizes!.filter(x => x !== s) : [...(form.sizes ?? []), s]);
  };

  const setStock = (s: string, val: number) => {
    const next = { ...(form.stock ?? {}), [s]: val };
    set('stock', next);
    // auto-derive unavail
    const ua = Object.entries(next).filter(([, v]) => v === 0).map(([k]) => k);
    set('unavail', ua);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const nameParts: [string, string] = [
      form.name?.split(' ')[0] ?? '',
      form.name?.split(' ').slice(1).join(' ') ?? '',
    ];
    onSave({ ...form, nameParts, label: `foto · ${form.name?.toLowerCase()}` });
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  return (
    <form className="adm-form" onSubmit={handleSave}>
      <div className="adm-form-row">
        <div className="adm-field">
          <label>Nome do produto</label>
          <input required value={form.name ?? ''} onChange={e => set('name', e.target.value)} placeholder="Vestido Margarida" />
        </div>
        <div className="adm-field">
          <label>Coleção</label>
          <select value={form.col ?? ''} onChange={e => set('col', e.target.value)}>
            <option value="Jardim Encantado">Jardim Encantado</option>
            <option value="Doce Aventura">Doce Aventura</option>
            <option value="Avulso">Avulso</option>
          </select>
        </div>
      </div>

      <div className="adm-form-row">
        <div className="adm-field">
          <label>Gênero</label>
          <select value={form.gender ?? 'meninas'} onChange={e => set('gender', e.target.value)}>
            <option value="meninas">Meninas</option>
            <option value="meninos">Meninos</option>
            <option value="unissex">Unissex</option>
          </select>
        </div>
        <div className="adm-field">
          <label>Preço</label>
          <input required value={form.price ?? ''} onChange={e => set('price', e.target.value)} placeholder="R$ 189" />
        </div>
      </div>

      <div className="adm-field">
        <label>Parcelamento</label>
        <input value={form.installments ?? ''} onChange={e => set('installments', e.target.value)} placeholder="em 3x de R$ 63 sem juros" />
      </div>

      <div className="adm-field">
        <label>Descrição</label>
        <textarea value={form.desc ?? ''} onChange={e => set('desc', e.target.value)} />
      </div>

      <div className="adm-field">
        <label>URL da foto</label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <input value={form.imageUrl ?? ''} onChange={e => set('imageUrl', e.target.value)} placeholder="https://…" style={{ flex: 1 }} />
          {form.imageUrl
            ? <img src={form.imageUrl} alt="" className="adm-img-preview" onError={e => (e.currentTarget.style.display = 'none')} />
            : <PdlImg tint={form.tint ?? 'rose'} className="adm-img-swatch" style={{ aspectRatio: '3/4', width: 80, height: 107, flexShrink: 0 }} />
          }
        </div>
      </div>

      <div className="adm-field">
        <label>Cor / tint (fallback)</label>
        <div className="adm-tint-chips">
          {TINTS.map(t => (
            <div key={t} className={`adm-tint-chip ${form.tint === t ? 'selected' : ''}`}
              style={{ background: TINT_COLORS[t] }} onClick={() => set('tint', t)} />
          ))}
        </div>
      </div>

      <div className="adm-field">
        <label>Tamanhos + estoque</label>
        <div className="adm-stock-grid">
          {SIZES.map(s => (
            <div key={s} className="adm-stock-item">
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.sizes?.includes(s) ?? true} onChange={() => toggleSize(s)} style={{ width: 'auto' }} />
                <span className="sz">{s}</span>
              </label>
              <input
                type="number" min={0} style={{ width: 52 }}
                value={form.stock?.[s] ?? ''}
                onChange={e => setStock(s, parseInt(e.target.value) || 0)}
                disabled={!form.sizes?.includes(s)}
                placeholder="qtd"
                className="adm-field input"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="adm-form-actions">
        <button type="submit" className="adm-btn adm-btn-primary">Salvar produto</button>
      </div>

      {toast && <div className="adm-toast">Produto salvo com sucesso!</div>}
    </form>
  );
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { products, updateProduct } = useAdmin();
  const router = useRouter();
  const product = products.find(p => p.id === id);

  if (!product) return (
    <AdminLayout>
      <p style={{ color: '#888' }}>Produto não encontrado.</p>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Editar <em>{product.name}</em></h1>
        <button className="adm-btn adm-btn-secondary" onClick={() => router.push('/admin/produtos')}>← Voltar</button>
      </div>
      <ProductForm
        title="Editar produto"
        initial={product}
        onSave={patch => { updateProduct(id, patch); router.push('/admin/produtos'); }}
      />
    </AdminLayout>
  );
}
```

### Step 2: Write `novo/page.tsx`

**`src/app/admin/produtos/novo/page.tsx`:**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { ProductForm } from '../[id]/page';
import { Product } from '@/lib/data';

export default function NewProductPage() {
  const { addProduct } = useAdmin();
  const router = useRouter();

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Novo <em>produto</em></h1>
        <button className="adm-btn adm-btn-secondary" onClick={() => router.push('/admin/produtos')}>← Voltar</button>
      </div>
      <ProductForm
        title="Adicionar produto"
        initial={{}}
        onSave={p => { addProduct(p as Omit<Product, 'id'>); router.push('/admin/produtos'); }}
      />
    </AdminLayout>
  );
}
```

### Step 3: Verify build

```bash
npm run build 2>&1 | tail -5
```

### Step 4: Commit

```bash
git add src/app/admin/produtos/
git commit -m "feat(admin): add product add/edit form"
```

---

## Task 7: Admin collections list page

**Files:**
- Create: `src/app/admin/colecoes/page.tsx`

### Step 1: Write the page

```tsx
'use client';

import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';

export default function AdminColecoesPage() {
  const { collections } = useAdmin();
  const router = useRouter();

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Coleções</h1>
      </div>
      <div className="adm-col-grid">
        {Object.values(collections).map(col => (
          <div key={col.id} className="adm-col-card">
            <div className="adm-col-card-name">{col.name[0]} <em style={{ fontStyle: 'italic', color: '#888' }}>{col.name[1]}</em></div>
            <div className="adm-col-card-meta">{col.products.length} produtos · {col.eyebrow}</div>
            <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => router.push(`/admin/colecoes/${col.id}`)}>Editar</button>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
```

### Step 2: Verify build

```bash
npm run build 2>&1 | tail -5
```

### Step 3: Commit

```bash
git add src/app/admin/colecoes/page.tsx
git commit -m "feat(admin): add collections list page"
```

---

## Task 8: Admin collection edit form

**Files:**
- Create: `src/app/admin/colecoes/[id]/page.tsx`

### Step 1: Write the page

```tsx
'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';

const TINTS = ['rose', 'ochre', 'sage', 'clay', 'moss', 'ink'];
const TINT_COLORS: Record<string, string> = {
  rose: '#e8c5b0', ochre: '#c9a96e', sage: '#9eb89e',
  clay: '#c17c5a', moss: '#7a8c6a', ink: '#3a3530',
};

export default function EditColecaoPage() {
  const { id } = useParams<{ id: string }>();
  const { collections, updateCollection } = useAdmin();
  const router = useRouter();
  const col = collections[id];
  const [toast, setToast] = useState(false);

  if (!col) return (
    <AdminLayout>
      <p style={{ color: '#888' }}>Coleção não encontrada.</p>
    </AdminLayout>
  );

  const [form, setForm] = useState({
    name0: col.name[0],
    name1: col.name[1],
    eyebrow: col.eyebrow,
    tint: col.tint,
    intro: col.intro,
    imageUrl: (col as { imageUrl?: string }).imageUrl ?? '',
  });

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCollection(id, {
      name: [form.name0, form.name1],
      eyebrow: form.eyebrow,
      tint: form.tint,
      intro: form.intro,
      ...(form.imageUrl ? { imageUrl: form.imageUrl } : {}),
    } as Parameters<typeof updateCollection>[1]);
    setToast(true);
    setTimeout(() => { setToast(false); router.push('/admin/colecoes'); }, 1200);
  };

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Editar <em>{col.name[0]} {col.name[1]}</em></h1>
        <button className="adm-btn adm-btn-secondary" onClick={() => router.push('/admin/colecoes')}>← Voltar</button>
      </div>

      <form className="adm-form" onSubmit={handleSave}>
        <div className="adm-form-row">
          <div className="adm-field">
            <label>Nome (parte 1)</label>
            <input value={form.name0} onChange={e => set('name0', e.target.value)} />
          </div>
          <div className="adm-field">
            <label>Nome (parte 2 — itálico)</label>
            <input value={form.name1} onChange={e => set('name1', e.target.value)} />
          </div>
        </div>

        <div className="adm-field">
          <label>Eyebrow (ex: Coleção nº 12 · Meninas 1–12)</label>
          <input value={form.eyebrow} onChange={e => set('eyebrow', e.target.value)} />
        </div>

        <div className="adm-field">
          <label>Texto de introdução</label>
          <textarea value={form.intro} onChange={e => set('intro', e.target.value)} />
        </div>

        <div className="adm-field">
          <label>URL da imagem hero</label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <input value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} placeholder="https://…" style={{ flex: 1 }} />
            {form.imageUrl && <img src={form.imageUrl} alt="" className="adm-img-preview" onError={e => (e.currentTarget.style.display = 'none')} />}
          </div>
        </div>

        <div className="adm-field">
          <label>Cor / tint (fallback)</label>
          <div className="adm-tint-chips">
            {TINTS.map(t => (
              <div key={t} className={`adm-tint-chip ${form.tint === t ? 'selected' : ''}`}
                style={{ background: TINT_COLORS[t] }} onClick={() => set('tint', t)} />
            ))}
          </div>
        </div>

        <div className="adm-form-actions">
          <button type="submit" className="adm-btn adm-btn-primary">Salvar coleção</button>
        </div>
      </form>

      {toast && <div className="adm-toast">Coleção salva!</div>}
    </AdminLayout>
  );
}
```

### Step 2: Add `imageUrl` to Collection interface in `data.ts`

In `src/lib/data.ts`, add `imageUrl?: string` to the `Collection` interface:

```ts
export interface Collection {
  id: string;
  name: [string, string];
  eyebrow: string;
  tint: string;
  intro: string;
  count: number;
  products: Product[];
  imageUrl?: string;
}
```

### Step 3: Verify build

```bash
npm run build 2>&1 | tail -5
```

### Step 4: Commit

```bash
git add src/app/admin/colecoes/ src/lib/data.ts
git commit -m "feat(admin): add collection edit form, add imageUrl to Collection type"
```

---

## Task 9: Add `/admin` root redirect

**Files:**
- Create: `src/app/admin/page.tsx`

### Step 1: Write the redirect page

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';

export default function AdminRootPage() {
  const { isAuthenticated } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    router.replace(isAuthenticated ? '/admin/produtos' : '/admin/login');
  }, [isAuthenticated, router]);

  return null;
}
```

### Step 2: Final build + smoke check

```bash
npm run build 2>&1 | grep -E "Route|error|Error|warn"
```

Expected: all `/admin/*` routes listed, 0 errors.

### Step 3: Final commit

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin): add root redirect, complete admin portal"
```

---

## Done

All admin routes should now be accessible:

| Route | Description |
|---|---|
| `/admin` | Redirects to login or products |
| `/admin/login` | Password form — enter `pingo2024` |
| `/admin/produtos` | Product table with edit/delete |
| `/admin/produtos/novo` | Add product form |
| `/admin/produtos/[id]` | Edit product form |
| `/admin/colecoes` | Collection card grid |
| `/admin/colecoes/[id]` | Edit collection form |

Changes persist in localStorage and survive page refreshes. Storefront pages read `getCatalog()` / `getCollections()` which check localStorage first.
