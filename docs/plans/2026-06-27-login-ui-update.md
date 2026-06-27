# Login UI Update Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the login page to use the official logo and improve Google button visibility with a thicker, darker border.

**Architecture:** Two isolated changes: (1) Replace text-based logo with Next.js Image component pointing to `/logo-transparente.png`, (2) Update CSS border styling for `.pdl-google-btn` class to use 2px width with darker color. No logic changes, purely visual/styling updates.

**Tech Stack:** Next.js Image component, CSS custom properties

---

## Task 1: Add Official Logo to Login Page

**Files:**
- Modify: `src/app/perfil/page.tsx:91-95`
- Reference: `/public/logo-transparente.png`

**Step 1: Replace text logo with Image component**

In `src/app/perfil/page.tsx`, find the `.pdl-login-logo` section (around line 91-95) and replace:

```jsx
// OLD:
<div className="pdl-login-logo">
  <span className="pdl-login-spark">Pingo</span>
  <em>de luz</em>
</div>

// NEW:
<div className="pdl-login-logo">
  <Image 
    src="/logo-transparente.png" 
    alt="Pingo de Luz" 
    width={200} 
    height={100}
    priority
    style={{ maxWidth: '100%', height: 'auto' }}
  />
</div>
```

**Step 2: Verify Image import exists**

At the top of `src/app/perfil/page.tsx`, check that `Image` is imported from `next/image`. If not, add:
```jsx
import Image from 'next/image';
```

**Step 3: Test in browser**

Run the dev server:
```bash
npm run dev
```

Navigate to `/perfil` (without being logged in) and verify:
- Official logo displays correctly
- Logo is centered
- Logo is responsive (test on mobile)
- No layout shift or broken spacing

**Step 4: Commit**

```bash
git add src/app/perfil/page.tsx
git commit -m "feat: add official logo to login page"
```

---

## Task 2: Enhance Google Button Border

**Files:**
- Modify: `src/app/globals.css:362`

**Step 1: Update CSS border styling**

In `src/app/globals.css`, find `.pdl-google-btn` (around line 362) and update the border:

```css
/* OLD */
.pdl-google-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 12px; padding: 14px 18px; background: #fff; border: 1px solid var(--border); border-radius: 999px; font-family: var(--sans); font-weight: 600; font-size: 14px; color: var(--ink); cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }

/* NEW - Change only the border line */
.pdl-google-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 12px; padding: 14px 18px; background: #fff; border: 2px solid var(--ink); border-radius: 999px; font-family: var(--sans); font-weight: 600; font-size: 14px; color: var(--ink); cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
```

**Change summary:**
- `border: 1px solid var(--border)` → `border: 2px solid var(--ink)`

**Step 2: Test in browser**

Refresh `/perfil` and verify:
- Google button border is now clearly visible (2px)
- Border color is darker (using `var(--ink)`)
- Button layout hasn't shifted (padding remains the same)
- Button is still centered and properly aligned
- Hover/active states still work

**Step 3: Test on mobile**

Open dev tools mobile view and confirm:
- Border is still visible on small screens
- Button text remains readable
- No overflow or spacing issues

**Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: improve google button visibility with thicker border"
```

---

## Verification Checklist

- [ ] Official logo loads and displays on `/perfil` login page
- [ ] Logo is responsive (test desktop, tablet, mobile)
- [ ] Google button border is 2px and clearly visible
- [ ] Button styling is unchanged except border
- [ ] No console errors or warnings
- [ ] Page layout is stable (no CLS)
- [ ] Both commits are created and present in git log

---

## Rollback Plan

If anything breaks, revert with:
```bash
git revert HEAD~1  # Revert border change
git revert HEAD~0  # Revert logo change (adjust hash)
```

Or manually restore the original values in both files from git history.
