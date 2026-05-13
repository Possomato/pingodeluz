# Desktop Responsive Layout Design — Pingo de Luz

**Date:** 2026-05-13  
**Scope:** Add editorial desktop layout at ≥768px breakpoint. Mobile stays unchanged.

---

## Overview

The site is mobile-first. This design adds a polished editorial/magazine desktop layout that activates at `768px` and above. All changes are additive — the mobile experience is untouched.

---

## Layout System

### Global container

```css
@media (min-width: 768px) {
  .pdl-app { max-width: 1200px; margin: 0 auto; padding: 0 40px; }
}
```

### Navigation pattern

| Screen | Header |
|---|---|
| `<768px` | Per-page `pdl-back-bar` (hamburger + back arrow) — unchanged |
| `≥768px` | `pdl-back-bar` hidden via CSS; `PdlHeader` shows persistent top nav |

**Desktop header layout:**
- Left: `<Logo />`
- Center: Nav links — Meninas · Meninos · Coleções · Sobre
- Right: Search icon · Cart icon (with count badge) · Profile icon

No JS branching — CSS `display: none / flex` handles the toggle.

### Sidebar system

Collection and gender listing pages use `.pdl-sidebar-layout` on desktop:

```css
@media (min-width: 768px) {
  .pdl-sidebar-layout { display: grid; grid-template-columns: 220px 1fr; gap: 40px; }
}
```

Left sidebar: collection intro + stacked filter options + "limpar filtros" link.  
Right content: product grid.  
On mobile: sidebar collapses, filters return to horizontal chip row.

---

## Page-by-Page Changes

### Home page (`/`)

| Element | Mobile | Desktop |
|---|---|---|
| Hero / welcome | Stacked card | Full-width editorial banner, 480px tall, text centered |
| Gender entry cards | Stacked | Side-by-side 50/50 |
| Best sellers | Horizontal scroll | 4-column grid |
| Collections | 2 stacked cards | 2-column side-by-side grid, taller cards |
| Instagram grid | 3-column | 6-column mosaic |

### Collection page (`/colecao/[id]`)

- Hero banner: `360px` → `240px` (intro moves to sidebar)
- Layout: single column → `.pdl-sidebar-layout` (220px sidebar + 1fr)
- Sidebar: collection name, intro text (3-line truncate), stacked filter chips
- Product grid: 2-column → 3-column

### Gender page (`/genero/[id]`)

Same sidebar pattern as collection page. Hero: `280px` → `200px`.

### Product detail page (`/produto/[id]`)

Two-column layout at ≥768px:

```
┌─────────────────┬──────────────────┐
│  Gallery (55%)  │  Info panel (45%)│
│  Main image     │  Eyebrow         │
│  Thumb strip    │  Title           │
│                 │  Price           │
│                 │  Size selector   │
│                 │  CTA button      │
│                 │  Accordions      │
│                 │  (sticky)        │
└─────────────────┴──────────────────┘
  Related products — full-width 4-column grid
```

Right column is `position: sticky; top: 80px` so info stays visible while scrolling gallery.

### Cart (`/carrinho`)

Single column, `max-width: 640px`, centered. No layout change — just constrained and centered.

### Checkout (`/checkout`)

Two-column on desktop:
- Left (~60%): step-by-step form (address → payment)
- Right (~40%): sticky order summary sidebar with "Finalizar pedido" button
- Sticky bottom CTA bar hidden on desktop

### Profile (`/perfil`)

- Login: centered card, `max-width: 420px`
- Logged in: two-column — stats + addresses left, orders + favorites right

### Confirmation (`/confirmacao`)

Centered, `max-width: 560px`. No layout change, just wider.

---

## Typography Scale (desktop only)

```css
@media (min-width: 768px) {
  .pdl-cart-title, .pdl-prodpage-title { font-size: calc(var(--base) * 1.2); }
  .pdl-manifesto-quote { font-size: 26px; }
}
```

---

## Hover States (desktop only, `@media (hover: hover)`)

- Product cards: `translateY(-3px)` + `box-shadow`
- Nav links: underline slide-in via CSS `::after`
- CTA buttons: `filter: brightness(1.05)`
- Collection cards: overlay darkens on hover

Using `@media (hover: hover)` ensures touch devices never see hover states.

---

## Files to Change

| File | Change |
|---|---|
| `src/app/globals.css` | ~150 lines of `@media (min-width: 768px)` additions |
| `src/components/PdlHeader.tsx` | Add desktop nav links |
| `src/app/page.tsx` | Home grid layouts, hero, gender cards |
| `src/app/colecao/[id]/page.tsx` | Sidebar layout |
| `src/app/genero/[id]/page.tsx` | Sidebar layout |
| `src/app/produto/[id]/page.tsx` | Two-column gallery + info |
| `src/app/checkout/page.tsx` | Two-column form + summary |
| `src/app/perfil/page.tsx` | Two-column logged-in profile |

---

## Constraints & Non-Goals

- Mobile layout is untouched — all changes are additive CSS
- No new npm packages
- No JS breakpoint detection — CSS media queries only
- Admin portal desktop layout is out of scope (it already has a desktop-friendly design)
- No animation library — CSS transitions only
