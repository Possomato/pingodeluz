# Favorites System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a favorites system allowing users to mark products as favorites with a heart icon and view them in their profile.

**Architecture:** Create a `favorites` table in Supabase with RLS policies, build reusable HeartButton component with auth checks, add server actions for CRUD operations, and integrate the system into the profile page and product components.

**Tech Stack:** Next.js 16, Supabase (PostgreSQL + RLS), React, TypeScript, Server Actions

---

## Task 1: Create Favorites Table in Supabase

**Files:**
- Create: Supabase SQL (manual execution in dashboard)

**Step 1: Create SQL migration**

Execute this SQL in Supabase SQL Editor (https://app.supabase.com/project/dgzmpmqmalsyhnmgvtpb/sql):

```sql
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can insert own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;

CREATE POLICY "Users can read own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON favorites
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON favorites(product_id);
```

**Step 2: Verify table creation**

Run this query:

```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'favorites' AND table_schema = 'public'
ORDER BY ordinal_position;
```

Expected: Shows columns (id, user_id, product_id, created_at)

**Step 3: No code commit needed**

Table is created manually in Supabase.

---

## Task 2: Create Server Actions for Favorites

**Files:**
- Create: `src/app/actions/favorites.ts`

**Step 1: Create favorites server actions file**

Create file `src/app/actions/favorites.ts`:

```typescript
'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function getFavoritesAction(): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];

  const { data, error } = await supabase
    .from('favorites')
    .select('product_id')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching favorites:', error);
    return [];
  }

  return data?.map(f => f.product_id) ?? [];
}

export async function toggleFavoriteAction(productId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  // Check if already favorited
  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .single();

  if (existing) {
    // Remove favorite
    await supabase
      .from('favorites')
      .delete()
      .eq('id', existing.id);
    revalidatePath('/perfil');
    return false;
  } else {
    // Add favorite
    await supabase
      .from('favorites')
      .insert([{ user_id: user.id, product_id: productId }]);
    revalidatePath('/perfil');
    return true;
  }
}

export async function isFavoritedAction(productId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .single();

  return !!data;
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
cd /Users/Shared/projetos/pingo-de-luz-v2 && npx tsc --noEmit src/app/actions/favorites.ts 2>&1 | grep -E "error" || echo "✅ No errors"
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/app/actions/favorites.ts
git commit -m "feat: create favorites server actions (getFavorites, toggleFavorite, isFavorited)"
```

---

## Task 3: Build HeartButton Component

**Files:**
- Create: `src/components/HeartButton.tsx`

**Step 1: Create HeartButton component**

Create file `src/components/HeartButton.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toggleFavoriteAction } from '@/app/actions/favorites';

interface HeartButtonProps {
  productId: string;
  initialFavorited: boolean;
}

export default function HeartButton({ productId, initialFavorited }: HeartButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);
    try {
      const result = await toggleFavoriteAction(productId);
      setIsFavorited(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Not authenticated') {
        router.push('/perfil');
      } else {
        console.error('Error toggling favorite:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      style={{
        background: 'none',
        border: 'none',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        fontSize: 24,
        opacity: isLoading ? 0.6 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {isFavorited ? '❤️' : '🤍'}
    </button>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
cd /Users/Shared/projetos/pingo-de-luz-v2 && npx tsc --noEmit src/components/HeartButton.tsx 2>&1 | grep -E "error" || echo "✅ No errors"
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/components/HeartButton.tsx
git commit -m "feat: create HeartButton component with auth redirect"
```

---

## Task 4: Add Favorites Section to Profile Page

**Files:**
- Modify: `src/app/perfil/page.tsx:240-250` (favorites section)

**Step 1: Import getFavoritesAction at top of perfil/page.tsx**

Add to imports:

```typescript
import { getFavoritesAction } from '@/app/actions/favorites';
```

**Step 2: Add state for favorites in PerfilContent**

Add after existing state declarations:

```typescript
const [favoriteProducts, setFavoriteProducts] = useState<any[]>([]);
const [favoritedProductIds, setFavoritedProductIds] = useState<string[]>([]);
```

**Step 3: Load favorites on mount**

Add this useEffect after the existing useEffect for loading addresses:

```typescript
useEffect(() => {
  const loadFavorites = async () => {
    const favorited = await getFavoritesAction();
    setFavoritedProductIds(favorited);
    // TODO: Fetch actual product data based on favorited IDs
    // For now, this will be populated when products are available
  };
  loadFavorites();
}, []);
```

**Step 4: Add favorites section to JSX**

Find the section with "Meus favoritos" (should be around line 283) and replace:

```typescript
<div className="pdl-profile-section">
  <h3><span>Meus <em>favoritos</em></span><span className="action">ver todos</span></h3>
  {favoritedProductIds.length === 0 ? (
    <div style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>
      Suas peças favoritas aparecerão aqui.
    </div>
  ) : (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginTop: 8 }}>
      {favoritedProductIds.map(productId => (
        <div key={productId} style={{ position: 'relative', padding: '8px', background: 'var(--cream-warm)', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            Produto: {productId}
          </div>
          <button
            onClick={async () => {
              const { toggleFavoriteAction } = await import('@/app/actions/favorites');
              await toggleFavoriteAction(productId);
              const updated = await getFavoritesAction();
              setFavoritedProductIds(updated);
            }}
            style={{ marginTop: 6, fontSize: 11, color: 'var(--terra)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
          >
            remover
          </button>
        </div>
      ))}
    </div>
  )}
</div>
```

**Step 5: Verify no errors**

Run:
```bash
npm run dev &
```

Navigate to `http://localhost:3000/perfil` and verify page loads without errors.

**Step 6: Commit**

```bash
git add src/app/perfil/page.tsx
git commit -m "feat: add favorites display section to profile page"
```

---

## Task 5: Integrate HeartButton into Product Components

**Files:**
- Modify: Any product card/component files (location depends on current product rendering)

**Step 1: Identify product components**

Check which files render products. Common locations:
- `src/components/ProductCard.tsx`
- Product listing pages

For this example, assuming products are rendered in a component. Add HeartButton:

```typescript
import HeartButton from '@/components/HeartButton';
import { isFavoritedAction } from '@/app/actions/favorites';

// In product card JSX:
<div style={{ position: 'absolute', top: 8, right: 8 }}>
  <HeartButton productId={product.id} initialFavorited={/* get from props or state */} />
</div>
```

**Step 2: Fetch initial favorite state**

If server-side rendering, add at top of component:

```typescript
const isFavorited = await isFavoritedAction(product.id);
```

Then pass to HeartButton:

```typescript
<HeartButton productId={product.id} initialFavorited={isFavorited} />
```

**Step 3: Test in browser**

1. Navigate to a product page/listing
2. Click heart icon
3. Should toggle between empty/filled
4. Should redirect to login if not authenticated
5. Navigate to profile - should show in favorites

**Step 4: Commit**

```bash
git add src/components/ProductCard.tsx  # or whatever file you modified
git commit -m "feat: integrate HeartButton into product components"
```

---

## Verification Checklist

- [ ] Favorites table created in Supabase
- [ ] RLS policies configured
- [ ] Server actions work (getFavorites, toggleFavorite, isFavorited)
- [ ] HeartButton component toggles heart state
- [ ] HeartButton redirects to login if not authenticated
- [ ] Profile page displays favorites
- [ ] Can remove favorites from profile
- [ ] Can favorite/unfavorite from product page
- [ ] No TypeScript errors
- [ ] All commits done

---

## Testing Flow

1. **Test unauthenticated:** Click heart → redirects to `/perfil`
2. **Test authenticated:** Click heart → toggles immediately (optimistic), updates DB
3. **Test profile:** Navigate to profile → see favorited products
4. **Test removal:** Remove from profile → updates list
5. **Test persistence:** Refresh page → favorites still show

---

## Next Steps After Implementation

If product data needs to be fetched for display:
- Create server action to fetch product details by IDs
- Update favorites section to load actual product data
- Display full product cards instead of just IDs
