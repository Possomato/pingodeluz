# Desktop Responsive Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a polished editorial desktop layout (≥768px) to the Pingo de Luz storefront while keeping the mobile experience unchanged.

**Architecture:** All changes are additive CSS `@media (min-width: 768px)` blocks appended to `globals.css`, plus small structural additions to page/component JSX to expose the right class hooks. The mobile layout remains untouched. `@media (hover: hover)` guards all hover states so touch devices are unaffected.

**Tech Stack:** Next.js 15 App Router, CSS media queries only — no new packages, no JS breakpoint detection.

**Working directory:** `/Users/espanhafacil/Documents/www/pingo-de-luz-v2` (main branch, no worktree)

---

## Task 1: Global container + desktop header shell

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/PdlHeader.tsx`

### Step 1: Add global desktop container CSS to `globals.css`

Append this block at the end of `globals.css`:

```css
/* ─── Desktop (≥768px) ──────────────────────────────────── */
@media (min-width: 768px) {
  /* Container */
  .pdl-app { max-width: 1200px; margin: 0 auto; padding: 0 48px; }

  /* Hide mobile back-bar on desktop — pages use pdl-header nav instead */
  .pdl-back-bar { display: none !important; }

  /* Desktop header */
  .pdl-header { padding: 0 0 0 0; height: 64px; align-items: center; background: var(--cream); border-bottom: 1px solid var(--border-soft); position: sticky; top: 0; z-index: 30; }
  .pdl-header.solid { background: var(--cream); }
  .pdl-header-menu { display: none; }
  .pdl-header-nav { display: flex; gap: 2px; align-items: center; flex: 1; justify-content: center; }
  .pdl-header-nav a { font-size: 13px; font-weight: 600; letter-spacing: 0.04em; color: var(--ink-soft); padding: 6px 14px; border-radius: 999px; text-decoration: none; transition: background 0.15s, color 0.15s; }
  .pdl-header-nav a:hover { background: var(--cream-deep); color: var(--ink); }
  .pdl-header-icons { display: flex; gap: 14px; align-items: center; }

  /* Show home top-padding offset since pdl-back-bar is hidden */
  .pdl-welcome { padding-top: 48px; }
}
```

### Step 2: Update `PdlHeader.tsx` to add desktop nav links

Read the current file, then replace the return JSX with:

```tsx
return (
  <div className={`pdl-header ${scrolled ? 'solid' : ''}`}>
    <button className="pdl-header-icon pdl-header-menu" onClick={onMenu} aria-label="Menu">
      <IconMenu />
    </button>
    <Logo onClick={() => router.push('/')} />
    <nav className="pdl-header-nav">
      <a href="/genero/meninas">Meninas</a>
      <a href="/genero/meninos">Meninos</a>
      <a href="/colecao/jardim">Jardim Encantado</a>
      <a href="/colecao/doce">Doce Aventura</a>
    </nav>
    <div className="pdl-header-icons" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
      <button className="pdl-header-icon" onClick={() => router.push('/perfil')} aria-label="Perfil">
        <IconUser />
      </button>
      <button
        className="pdl-header-icon"
        style={{ position: 'relative' }}
        onClick={() => router.push('/carrinho')}
        aria-label="Sacola"
      >
        <IconBag />
        {cartCount > 0 && <span className="pdl-bag-count">{cartCount}</span>}
      </button>
    </div>
  </div>
);
```

Note: `.pdl-header-nav` is `display: none` on mobile (not added to CSS yet for mobile → it should be hidden by default; add to the base CSS: `.pdl-header-nav { display: none; }` before the media query).

### Step 3: Add `.pdl-header-nav { display: none; }` to base CSS

In `globals.css`, find the existing `.pdl-header` rule block and add immediately after it:
```css
.pdl-header-nav { display: none; }
```

### Step 4: Verify build

```bash
npm run build 2>&1 | tail -5
```

Expected: clean build, 0 errors.

### Step 5: Commit

```bash
git add src/app/globals.css src/components/PdlHeader.tsx
git commit -m "feat(desktop): global container, desktop header with nav links"
```

---

## Task 2: Home page desktop layout

**Files:**
- Modify: `src/app/globals.css` (append to desktop block)
- Modify: `src/app/page.tsx` (wrap Instagram grid items)

### Step 1: Append home page desktop CSS to the `@media (min-width: 768px)` block

Open `globals.css`, find the desktop media query block added in Task 1, and append inside it:

```css
  /* Home — gender cards side by side */
  .pdl-genders { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .pdl-gender-card { height: 420px; }

  /* Home — best sellers 4-column grid */
  .pdl-products { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; overflow: visible; padding-bottom: 0; }
  .pdl-prod { flex: none; width: auto; }
  .pdl-prod .pdl-img { aspect-ratio: 3/4; }

  /* Home — welcome section wider */
  .pdl-welcome { text-align: center; padding: 64px 80px 40px; }
  .pdl-welcome h1 { font-size: 36px; }

  /* Home — manifesto bigger quote */
  .pdl-manifesto .quote { font-size: 24px; max-width: 640px; margin: 0 auto; }

  /* Home — collections side by side */
  .pdl-collections { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .pdl-col-card { height: 400px; }

  /* Home — age filters row stays horizontal, just wider gap */
  .pdl-ages { gap: 32px; }

  /* Home — testimonial wider */
  .pdl-test-card { max-width: 640px; margin: 0 auto; padding: 36px 48px; }

  /* Home — Instagram 6-column */
  .pdl-insta-grid { grid-template-columns: repeat(6, 1fr); }
```

### Step 2: Verify build

```bash
npm run build 2>&1 | tail -5
```

### Step 3: Commit

```bash
git add src/app/globals.css
git commit -m "feat(desktop): home page grid layouts"
```

---

## Task 3: Collection + Gender page sidebar layout

**Files:**
- Modify: `src/app/colecao/[id]/page.tsx`
- Modify: `src/app/genero/[id]/page.tsx`
- Modify: `src/app/globals.css`

### Step 1: Add sidebar CSS to the desktop media query block in `globals.css`

```css
  /* Sidebar layout for collection + gender pages */
  .pdl-sidebar-layout { display: grid; grid-template-columns: 220px 1fr; gap: 48px; align-items: start; margin-top: 32px; }
  .pdl-sidebar { position: sticky; top: 80px; }
  .pdl-sidebar-title { font-family: var(--serif); font-size: 20px; margin-bottom: 8px; }
  .pdl-sidebar-title em { font-style: italic; color: var(--muted); }
  .pdl-sidebar-intro { font-family: var(--editorial); font-style: italic; font-size: 13px; color: var(--ink-soft); line-height: 1.5; margin-bottom: 20px; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
  .pdl-sidebar-filter-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; font-weight: 600; }
  .pdl-sidebar-filters { display: flex; flex-direction: column; gap: 4px; }
  .pdl-sidebar-filter { font-size: 13px; color: var(--ink-soft); padding: 6px 10px; border-radius: 6px; cursor: pointer; transition: background 0.12s; }
  .pdl-sidebar-filter:hover, .pdl-sidebar-filter.active { background: var(--cream-deep); color: var(--ink); }

  /* Collection/gender hero shorter on desktop */
  .pdl-colpage-hero { height: 240px !important; }
  .pdl-genpage-hero { height: 200px !important; }

  /* Hide inline filter chips on desktop (replaced by sidebar) */
  .pdl-col-filters { display: none; }

  /* Product grid 3-column on desktop listing pages */
  .pdl-col-products { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .pdl-col-prod { flex: none; width: auto; }
  .pdl-col-prod .pdl-img { aspect-ratio: 3/4; }
```

### Step 2: Update `src/app/colecao/[id]/page.tsx`

Read the file. Find the section after the hero/filters and wrap the filter + products section in the sidebar layout structure. Specifically:

1. Add `pdl-colpage-hero` class to the hero div (find `style={{ height: 360 }}` or similar).
2. Replace the existing filter chips + products grid with:

```tsx
{/* Desktop: sidebar layout. Mobile: existing flow */}
<div className="pdl-sidebar-layout">
  <div className="pdl-sidebar">
    <div className="pdl-sidebar-title">{c.name[0]} <em>{c.name[1]}</em></div>
    <div className="pdl-sidebar-intro">{c.intro}</div>
    <div className="pdl-sidebar-filter-label">filtrar por</div>
    <div className="pdl-sidebar-filters">
      {filters.map(f => (
        <div key={f} className={`pdl-sidebar-filter ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</div>
      ))}
    </div>
  </div>
  <div>
    {/* keep existing filter chips for mobile */}
    <div className="pdl-col-filters">
      {/* existing chips JSX stays here unchanged */}
    </div>
    <div className="pdl-col-products">
      {c.products.map(p => (
        <div key={p.id} className="pdl-col-prod" onClick={() => router.push(`/produto/${p.id}`)}>
          <PdlImg tint={p.tint} label={p.label} />
          <div className="pdl-prod-name">{p.name}</div>
          <div className="pdl-prod-meta">
            <span className="pdl-prod-col">{p.col}</span>
            <span className="pdl-prod-price">{p.price}</span>
          </div>
        </div>
      ))}
    </div>
    <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--muted)' }}>fim da coleção</div>
  </div>
</div>
```

**Important:** Read the actual file first to understand the current structure before editing. Preserve the hero section and back-bar — only restructure the content below the hero.

### Step 3: Apply same sidebar pattern to `src/app/genero/[id]/page.tsx`

Same approach — read the file, add `pdl-genpage-hero` to the hero div, wrap content below hero in `.pdl-sidebar-layout`.

### Step 4: Verify build

```bash
npm run build 2>&1 | tail -5
```

### Step 5: Commit

```bash
git add src/app/globals.css src/app/colecao/[id]/page.tsx src/app/genero/[id]/page.tsx
git commit -m "feat(desktop): sidebar layout for collection and gender pages"
```

---

## Task 4: Product detail page two-column layout

**Files:**
- Modify: `src/app/produto/[id]/page.tsx`
- Modify: `src/app/globals.css`

### Step 1: Add product detail desktop CSS to the media query block

```css
  /* Product detail — two-column */
  .pdl-prodpage-cols { display: grid; grid-template-columns: 55% 45%; gap: 48px; align-items: start; margin-top: 24px; }
  .pdl-prodpage-right { position: sticky; top: 80px; }
  .pdl-prodpage-gallery { position: static; height: 480px; border-radius: 4px; }
  .pdl-prodpage-gallery-strip { margin-top: 12px; }

  /* Hide sticky mobile CTA on desktop — button is inline in right panel */
  .pdl-prodpage-cta-desktop { display: block; }
  .pdl-prodpage-cta { display: none; }
```

### Step 2: Update `src/app/produto/[id]/page.tsx`

Read the file. The current structure is:
```
pdl-app
  pdl-back-bar
  pdl-prodpage-gallery     ← full width
  pdl-prodpage-gallery-strip
  pdl-prodpage-info        ← all product info
  pdl-prodpage-cta         ← sticky bottom CTA (mobile)
```

Wrap gallery + info in a `.pdl-prodpage-cols` grid, and add an inline CTA button inside the info panel for desktop:

```tsx
<div className="pdl-app" style={{ paddingBottom: 0 }}>
  <div className={`pdl-back-bar ${scrolled ? 'solid' : ''}`}>
    {/* ... existing back bar ... */}
  </div>

  <div className="pdl-prodpage-cols">
    {/* Left column: gallery */}
    <div>
      <div className="pdl-prodpage-gallery">
        {/* ... existing gallery content ... */}
      </div>
      <div className="pdl-prodpage-gallery-strip">
        {/* ... existing strip ... */}
      </div>
    </div>

    {/* Right column: info (sticky on desktop) */}
    <div className="pdl-prodpage-right">
      <div className="pdl-prodpage-info">
        {/* ... existing info content ... */}
      </div>
      {/* Desktop inline CTA (hidden on mobile) */}
      <div className="pdl-prodpage-cta-desktop" style={{ display: 'none', marginTop: 24 }}>
        <button
          onClick={() => {
            if (!size) return;
            addToCart({ pid: id, id, name: p.name, col: p.col, price: p.price, tint: p.tint, size });
            router.push('/carrinho');
          }}
          style={size ? { width: '100%', padding: '14px 20px', background: 'var(--ink)', color: 'var(--cream-warm)', borderRadius: 999, fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 } : { width: '100%', padding: '14px 20px', background: 'var(--border)', color: 'var(--muted)', borderRadius: 999, fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13 }}
        >
          {size ? `adicionar à sacola · tam ${size}` : 'escolha um tamanho'}
        </button>
      </div>
    </div>
  </div>

  {/* Related products — full width below columns */}
  {/* ... move the "combina com" section here, outside pdl-prodpage-cols ... */}

  {/* Mobile sticky CTA */}
  <div className="pdl-prodpage-cta">
    {/* ... existing CTA button ... */}
  </div>
</div>
```

**Important:** Read the actual file carefully before restructuring. The key changes are:
1. Wrap gallery divs in a plain `<div>`
2. Wrap info div in `<div className="pdl-prodpage-right">`
3. Put both inside `<div className="pdl-prodpage-cols">`
4. Move the "combina com" / related products section and the `{ height: 100 }` spacer outside `pdl-prodpage-cols`
5. Add the desktop inline CTA button inside the right column

### Step 3: Verify build

```bash
npm run build 2>&1 | tail -5
```

### Step 4: Commit

```bash
git add src/app/globals.css src/app/produto/[id]/page.tsx
git commit -m "feat(desktop): product detail two-column gallery + info layout"
```

---

## Task 5: Cart, Checkout & Profile desktop tweaks

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/perfil/page.tsx`

### Step 1: Add Cart, Checkout, Profile desktop CSS

Append inside the desktop media query block:

```css
  /* Cart — centered narrow */
  .pdl-cart { max-width: 640px; margin: 0 auto; }
  .pdl-cart-cta { max-width: 640px; margin: 0 auto; left: 50%; transform: translateX(-50%); width: 100%; }

  /* Checkout — centered, wider form */
  .pdl-checkout { max-width: 640px; margin: 0 auto; }

  /* Confirmation — wider */
  .pdl-confirm { max-width: 560px; margin: 0 auto; }

  /* Profile logged-in — two column */
  .pdl-profile { max-width: 900px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .pdl-profile-hero { grid-column: 1 / -1; }
  .pdl-profile-stats { grid-column: 1 / -1; }
  .pdl-profile-section:nth-child(3) { grid-column: 1; }  /* endereços — left */
  .pdl-profile-section:nth-child(4) { grid-column: 2; grid-row: 3; }  /* pedidos — right */
  .pdl-profile-section:nth-child(5) { grid-column: 1; }  /* favoritos — left */
  .pdl-profile-section:nth-child(6) { grid-column: 2; }  /* preferências — right */
  .pdl-profile-section:nth-child(7) { grid-column: 1 / -1; }  /* ajuda — full width */
  .pdl-logout { grid-column: 1 / -1; }

  /* Login page — centered card */
  .pdl-login { padding-top: 80px; }
  .pdl-login-logo { font-size: 28px; }
```

### Step 2: Verify build

```bash
npm run build 2>&1 | tail -5
```

### Step 3: Commit

```bash
git add src/app/globals.css
git commit -m "feat(desktop): cart/checkout/profile/confirm desktop widths"
```

---

## Task 6: Hover states + typography scale

**Files:**
- Modify: `src/app/globals.css`

### Step 1: Append hover states and type scale to desktop block

```css
  /* Typography scale */
  .pdl-cart-title { font-size: 32px; }
  .pdl-prodpage-title { font-size: 28px; }
  .pdl-section-head h2 { font-size: 24px; }

/* Hover states — only on pointer devices */
@media (min-width: 768px) and (hover: hover) {
  .pdl-prod { cursor: pointer; transition: transform 0.18s, box-shadow 0.18s; }
  .pdl-prod:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(42,36,25,0.10); }

  .pdl-col-card { transition: filter 0.18s; }
  .pdl-col-card:hover .pdl-img { filter: brightness(0.95); }

  .pdl-gender-card { transition: filter 0.18s; }
  .pdl-gender-card:hover .pdl-img { filter: brightness(0.93); }

  .pdl-header-nav a { transition: background 0.15s, color 0.15s; }

  .pdl-col-prod { cursor: pointer; transition: transform 0.18s; }
  .pdl-col-prod:hover { transform: translateY(-2px); }
}
```

Note: close the first `@media (min-width: 768px)` block before this, as the hover block is a separate media query.

### Step 2: Verify build

```bash
npm run build 2>&1 | tail -5
```

### Step 3: Final full build check

```bash
npm run build 2>&1 | grep -E "Route|error|Error|✓|✗"
```

Expected: all 15 routes listed, 0 errors.

### Step 4: Commit

```bash
git add src/app/globals.css
git commit -m "feat(desktop): hover states and typography scale"
```

---

## Done

All desktop changes are in CSS media queries — mobile is untouched. To verify visually, run `npm run dev` and open in a browser at ≥768px width. Key things to check:

- Desktop header shows nav links (Meninas · Meninos · Jardim Encantado · Doce Aventura), hamburger is hidden
- Home page: gender cards side by side, 4-col product grid, 2-col collections, 6-col instagram
- Collection page: sidebar visible with stacked filters, 3-col product grid
- Product page: two-column gallery + info panel
- All mobile views unchanged when browser is <768px
