# Admin Portal Design — Pingo de Luz

**Date:** 2026-05-13  
**Scope:** Demo admin portal with localStorage persistence. No backend required.

---

## Overview

A password-protected admin portal at `/admin/*` for managing the product catalog, stock levels, photos, and collections. Changes persist in `localStorage` and reflect live in the storefront.

---

## Architecture

The admin lives within the same Next.js app. No new packages needed.

### Route structure

```
/admin                    → redirects to /admin/login or /admin/produtos
/admin/login              → password form
/admin/produtos           → product list table
/admin/produtos/novo      → add product form
/admin/produtos/[id]      → edit product form
/admin/colecoes           → collection list
/admin/colecoes/[id]      → edit collection form
```

### New files

```
src/context/AdminContext.tsx
src/components/admin/AdminLayout.tsx
src/app/admin/login/page.tsx
src/app/admin/produtos/page.tsx
src/app/admin/produtos/novo/page.tsx
src/app/admin/produtos/[id]/page.tsx
src/app/admin/colecoes/page.tsx
src/app/admin/colecoes/[id]/page.tsx
```

---

## Data Layer — `AdminContext`

`src/context/AdminContext.tsx` provides:

- `products: Product[]` — hydrated from `localStorage` key `pdl_admin_catalog` on mount; falls back to `HOME_PRODUCTS` from `data.ts`
- `collections: Collection[]` — hydrated from `localStorage` key `pdl_admin_collections`; falls back to `COLLECTIONS`
- `addProduct(p)`, `updateProduct(id, p)`, `deleteProduct(id)`
- `updateStock(id, sizeStocks: Record<string, number>)` — sets stock per size; sizes with `0` auto-populate `unavail[]`
- `isAuthenticated: boolean` — from `localStorage` key `pdl_admin_auth`
- `login(password: string): boolean` — checks against hardcoded `'pingo2024'`; writes auth key on success
- `logout()` — clears auth key, redirects to `/admin/login`

### Store integration

`data.ts` exports updated to check localStorage first:

```ts
export function getCatalog(): Product[] {
  if (typeof window === 'undefined') return HOME_PRODUCTS;
  const saved = localStorage.getItem('pdl_admin_catalog');
  return saved ? JSON.parse(saved) : HOME_PRODUCTS;
}
```

Dynamic store pages hydrate from localStorage on the client — acceptable for demo purposes.

---

## Authentication

- **Password:** `pingo2024` (hardcoded constant in `AdminContext`)
- **Session:** `localStorage` key `pdl_admin_auth: 'true'`
- **Guard:** `AdminLayout` checks auth on every render; redirects to `/admin/login` if missing
- **Wrong password:** shake animation + "Senha incorreta" error message

---

## Admin UI Style

Distinct from the storefront — functional, not editorial:

- Background: `#fff` / `#f7f7f7` surfaces
- Text: `#1a1a1a`
- Same fonts (Lora + Nunito Sans) for brand consistency
- Primary action (save, add): green `#2e7d5e`
- Destructive action (delete): red `#c0392b`
- Top nav bar: "Pingo de Luz · Admin" logo, Produtos / Coleções links, Sair button
- No drawer, no footer — just the work surface

---

## Product Management

### List (`/admin/produtos`)

Table columns: thumbnail (swatch or `<img>`), name, collection, price, total stock, actions (Editar / Excluir).  
"+ Adicionar produto" button top-right → `/admin/produtos/novo`.

### Form (`/admin/produtos/[id]` and `/admin/produtos/novo`)

| Field | Input |
|---|---|
| Nome | text |
| Coleção | select (jardim / doce / avulso) |
| Gênero | select (meninas / meninos / unissex) |
| Preço | text — e.g. `R$ 189,00` |
| Parcelamento | text — e.g. `3x de R$ 63,00` |
| Descrição | textarea |
| Foto (URL) | text + live `<img>` preview |
| Cor / tint | chip picker (fallback when no URL) |
| Tamanhos | checkboxes: 1, 2, 3, 4, 6, 8 |
| Estoque por tamanho | number input per checked size |

**Stock → unavail:** sizes with stock `0` are auto-added to `unavail[]`. No separate field.

**Save:** updates localStorage, redirects to `/admin/produtos`, shows success toast.

---

## Collections Management

### List (`/admin/colecoes`)

Card grid — name, hero image, product count, Editar button. "+ Nova coleção" button.

### Form (`/admin/colecoes/[id]`)

| Field | Input |
|---|---|
| Nome | text |
| Slug | text (auto-derived, editable) |
| Subtítulo | text |
| Descrição | textarea |
| Imagem hero (URL) | text + live preview |
| Cor hero (tint) | chip picker (fallback) |

---

## Constraints & Non-Goals

- No real image upload — URL only
- No role system — single hardcoded password
- No audit log / history
- Changes reset on `localStorage.clear()` — expected for a demo
- No server-side persistence
