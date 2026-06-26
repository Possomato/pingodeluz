# Homepage Sections Admin — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an `/admin/homepage` page that lets the admin toggle each homepage section on/off and upload photos for gender cards and the Instagram grid.

**Architecture:** New Supabase table `homepage_config` (one row per section slug). `AdminContext` gains `homepageConfig` + `updateHomepageSection()`. The homepage `page.tsx` reads the config on mount and conditionally renders each block.

**Tech Stack:** Next.js 16 (App Router, `'use client'`), Supabase (postgres + storage), TypeScript, existing `uploadImageAction` from `app/actions/upload.ts`.

**Worktree:** `.worktrees/homepage-sections` on branch `feature/homepage-sections`

---

### Task 1: Create `homepage_config` table in Supabase

**Files:**
- No code files — run SQL in Supabase dashboard SQL editor

**Step 1: Open Supabase dashboard → SQL Editor and run:**

```sql
create table if not exists homepage_config (
  id text primary key,
  visible boolean not null default true,
  image_urls text[] not null default '{}',
  updated_at timestamptz not null default now()
);

insert into homepage_config (id) values
  ('meninas'),
  ('meninos'),
  ('queridos'),
  ('manifesto'),
  ('colecoes'),
  ('fases'),
  ('depoimentos'),
  ('instagram')
on conflict (id) do nothing;
```

**Step 2: Verify rows exist**

In SQL Editor: `select * from homepage_config order by id;`
Expected: 8 rows, all with `visible = true`, `image_urls = {}`.

**Step 3: No commit needed (Supabase is external)**

---

### Task 2: Add `HomepageSection` type and fetcher to `lib/data.ts`

**Files:**
- Modify: `src/lib/data.ts`

**Step 1: Add the interface and defaults after the `TESTIMONIALS` export (around line 108)**

Add this block:

```ts
export interface HomepageSection {
  id: string;
  visible: boolean;
  imageUrls: string[];
}

export const HOMEPAGE_SECTION_IDS = [
  'meninas', 'meninos', 'queridos', 'manifesto',
  'colecoes', 'fases', 'depoimentos', 'instagram',
] as const;

export type HomepageSectionId = typeof HOMEPAGE_SECTION_IDS[number];

export const DEFAULT_HOMEPAGE_CONFIG: Record<HomepageSectionId, HomepageSection> =
  Object.fromEntries(
    HOMEPAGE_SECTION_IDS.map(id => [id, { id, visible: true, imageUrls: [] }])
  ) as Record<HomepageSectionId, HomepageSection>;
```

**Step 2: Add the async fetcher at the bottom of the file**

```ts
export async function fetchHomepageConfig(): Promise<Record<HomepageSectionId, HomepageSection>> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/homepage_config?select=*`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return DEFAULT_HOMEPAGE_CONFIG;
    const rows: { id: string; visible: boolean; image_urls: string[] }[] = await res.json();
    const result = { ...DEFAULT_HOMEPAGE_CONFIG };
    for (const row of rows) {
      if (row.id in result) {
        result[row.id as HomepageSectionId] = {
          id: row.id,
          visible: row.visible,
          imageUrls: row.image_urls ?? [],
        };
      }
    }
    return result;
  } catch {
    return DEFAULT_HOMEPAGE_CONFIG;
  }
}
```

**Step 3: Build check**

```bash
cd /Users/Shared/projetos/pingo-de-luz-v2/.worktrees/homepage-sections && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

**Step 4: Commit**

```bash
git add src/lib/data.ts
git commit -m "feat: add HomepageSection type and fetchHomepageConfig"
```

---

### Task 3: Add server action `upsertHomepageSectionAction`

**Files:**
- Modify: `src/app/actions/admin.ts`

**Step 1: Add import at top of file (after existing imports)**

```ts
import type { HomepageSection } from '@/lib/data';
```

**Step 2: Add action at end of file**

```ts
export async function upsertHomepageSectionAction(section: HomepageSection) {
  const supabase = createServiceClient();
  const { error } = await supabase.from('homepage_config').upsert({
    id: section.id,
    visible: section.visible,
    image_urls: section.imageUrls,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/');
}
```

**Step 3: Build check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 4: Commit**

```bash
git add src/app/actions/admin.ts
git commit -m "feat: add upsertHomepageSectionAction"
```

---

### Task 4: Wire `homepageConfig` into `AdminContext`

**Files:**
- Modify: `src/context/AdminContext.tsx`

**Step 1: Add imports at top (after existing imports)**

```ts
import {
  HomepageSection, HomepageSectionId,
  DEFAULT_HOMEPAGE_CONFIG, fetchHomepageConfig,
} from '@/lib/data';
import { upsertHomepageSectionAction } from '@/app/actions/admin';
```

**Step 2: Add to the `AdminContextType` interface**

```ts
homepageConfig: Record<HomepageSectionId, HomepageSection>;
updateHomepageSection: (id: HomepageSectionId, patch: Partial<HomepageSection>) => Promise<void>;
```

**Step 3: Add state inside `AdminProvider` (after `collections` state)**

```ts
const [homepageConfig, setHomepageConfig] = useState<Record<HomepageSectionId, HomepageSection>>(DEFAULT_HOMEPAGE_CONFIG);
```

**Step 4: Add fetch inside the existing `useEffect` (after `fetchCollections().then(...)`)**

```ts
fetchHomepageConfig().then(data => setHomepageConfig(data)).catch(() => {});
```

**Step 5: Add `updateHomepageSection` function (after `updateCollection`)**

```ts
const updateHomepageSection = async (id: HomepageSectionId, patch: Partial<HomepageSection>) => {
  const existing = homepageConfig[id];
  const updated: HomepageSection = { ...existing, ...patch };
  setHomepageConfig(prev => ({ ...prev, [id]: updated }));
  await upsertHomepageSectionAction(updated).catch(console.error);
};
```

**Step 6: Add to the `AdminContext.Provider` value**

Add `homepageConfig` and `updateHomepageSection` to the value object.

**Step 7: Build check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 8: Commit**

```bash
git add src/context/AdminContext.tsx
git commit -m "feat: add homepageConfig state and updateHomepageSection to AdminContext"
```

---

### Task 5: Add "Homepage" link to admin nav

**Files:**
- Modify: `src/components/admin/AdminLayout.tsx`

**Step 1: Add the nav link after the "Coleções" link**

Current nav:
```tsx
<Link href="/admin/colecoes" className={pathname.startsWith('/admin/colecoes') ? 'active' : ''}>Coleções</Link>
```

Add after it:
```tsx
<Link href="/admin/homepage" className={pathname.startsWith('/admin/homepage') ? 'active' : ''}>Homepage</Link>
```

**Step 2: Build check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add src/components/admin/AdminLayout.tsx
git commit -m "feat: add Homepage link to admin nav"
```

---

### Task 6: Create `/admin/homepage/page.tsx`

**Files:**
- Create: `src/app/admin/homepage/page.tsx`

This is the main admin page. It lists all 8 sections with toggle + photo upload for `meninas`, `meninos`, and `instagram`.

**Step 1: Create the file**

```tsx
'use client';

import { useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { uploadImageAction } from '@/app/actions/upload';
import { HOMEPAGE_SECTION_IDS, HomepageSectionId } from '@/lib/data';

const SECTION_LABELS: Record<HomepageSectionId, string> = {
  meninas: 'Card · Meninas',
  meninos: 'Card · Meninos',
  queridos: 'Mais queridos',
  manifesto: 'Nosso manifesto',
  colecoes: 'Coleções conceituais',
  fases: 'Para cada fase',
  depoimentos: 'Depoimentos',
  instagram: 'No instagram',
};

const WITH_PHOTOS: HomepageSectionId[] = ['meninas', 'meninos', 'instagram'];

export default function AdminHomepagePage() {
  const { homepageConfig, updateHomepageSection } = useAdmin();
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleToggle = (id: HomepageSectionId) => {
    const section = homepageConfig[id];
    updateHomepageSection(id, { visible: !section.visible });
  };

  const handleUpload = async (id: HomepageSectionId, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const section = homepageConfig[id];
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      const url = await uploadImageAction(fd);
      uploaded.push(url);
    }
    const newUrls = id === 'instagram'
      ? [...section.imageUrls, ...uploaded].slice(0, 6)
      : [uploaded[uploaded.length - 1]];
    updateHomepageSection(id, { imageUrls: newUrls });
  };

  const handleRemovePhoto = (id: HomepageSectionId, index: number) => {
    const section = homepageConfig[id];
    const newUrls = section.imageUrls.filter((_, i) => i !== index);
    updateHomepageSection(id, { imageUrls: newUrls });
  };

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Homepage</h1>
      </div>

      <div className="adm-homepage-list">
        {HOMEPAGE_SECTION_IDS.map(id => {
          const section = homepageConfig[id];
          const hasPhotos = WITH_PHOTOS.includes(id);
          const isInstagram = id === 'instagram';

          return (
            <div key={id} className={`adm-homepage-row ${!section.visible ? 'adm-homepage-row--hidden' : ''}`}>
              <div className="adm-homepage-row-main">
                <span className="adm-homepage-label">{SECTION_LABELS[id]}</span>

                {hasPhotos && (
                  <div className="adm-homepage-photos">
                    {section.imageUrls.map((url, i) => (
                      <div key={i} className="adm-homepage-thumb-wrap">
                        <img src={url} alt="" className="adm-homepage-thumb" />
                        <button
                          className="adm-homepage-thumb-remove"
                          onClick={() => handleRemovePhoto(id, i)}
                          title="Remover"
                        >×</button>
                      </div>
                    ))}
                    {(!isInstagram || section.imageUrls.length < 6) && (
                      <>
                        <button
                          className="adm-homepage-upload-btn"
                          onClick={() => inputRefs.current[id]?.click()}
                        >
                          {section.imageUrls.length === 0 ? '+ foto' : isInstagram ? '+ foto' : 'trocar'}
                        </button>
                        <input
                          ref={el => { inputRefs.current[id] = el; }}
                          type="file"
                          accept="image/*"
                          multiple={isInstagram}
                          style={{ display: 'none' }}
                          onChange={e => handleUpload(id, e.target.files)}
                        />
                      </>
                    )}
                  </div>
                )}

                <button
                  className={`adm-homepage-toggle ${section.visible ? 'adm-homepage-toggle--on' : 'adm-homepage-toggle--off'}`}
                  onClick={() => handleToggle(id)}
                >
                  {section.visible ? 'visível' : 'oculto'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}
```

**Step 2: Build check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add src/app/admin/homepage/page.tsx
git commit -m "feat: add /admin/homepage page with section toggles and photo upload"
```

---

### Task 7: Add CSS for the homepage admin page

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Find the end of the existing `.adm-` styles and add:**

```css
/* ── admin homepage ─────────────────────────────────────── */
.adm-homepage-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 680px;
}

.adm-homepage-row {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e8e3dc;
  border-radius: 8px;
  padding: 14px 16px;
  transition: opacity .15s;
}

.adm-homepage-row--hidden {
  opacity: .45;
}

.adm-homepage-row-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.adm-homepage-label {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
  min-width: 160px;
}

.adm-homepage-photos {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.adm-homepage-thumb-wrap {
  position: relative;
  width: 52px;
  height: 52px;
}

.adm-homepage-thumb {
  width: 52px;
  height: 52px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #e5e5e5;
  display: block;
}

.adm-homepage-thumb-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--ink);
  color: #fff;
  border: none;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
  cursor: pointer;
  padding: 0;
}

.adm-homepage-upload-btn {
  height: 52px;
  padding: 0 12px;
  border: 1.5px dashed #c9bfb3;
  border-radius: 6px;
  background: none;
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.adm-homepage-upload-btn:hover {
  border-color: var(--terra);
  color: var(--terra);
}

.adm-homepage-toggle {
  padding: 5px 14px;
  border-radius: 20px;
  border: 1.5px solid;
  font-size: 12px;
  cursor: pointer;
  font-weight: 500;
  transition: all .15s;
  white-space: nowrap;
}

.adm-homepage-toggle--on {
  background: #eaf2e8;
  border-color: #7a8c6a;
  color: #4a6040;
}

.adm-homepage-toggle--off {
  background: #f5f0ea;
  border-color: #c9bfb3;
  color: #888;
}
```

**Step 2: Build check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add CSS for admin homepage section manager"
```

---

### Task 8: Wire homepage config into `app/page.tsx`

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add import**

```ts
import { fetchHomepageConfig, DEFAULT_HOMEPAGE_CONFIG, type HomepageSectionId } from '@/lib/data';
```

Add to existing type import line for `data.ts`.

**Step 2: Add state inside the component (after existing `useState` calls)**

```ts
const [hpConfig, setHpConfig] = useState(DEFAULT_HOMEPAGE_CONFIG);
```

**Step 3: Add fetch inside the existing `useEffect` that calls `fetchCatalog`**

Add after the `fetchCatalog().then(...)` call:

```ts
fetchHomepageConfig().then(cfg => setHpConfig(cfg)).catch(() => {});
```

**Step 4: Gate each section**

Wrap each homepage section block with its config guard. Find and update each section:

**Gender cards block** (`pdl-genders` div):
- Wrap the meninas card: `{hpConfig.meninas.visible && <div className="pdl-gender-card" ...>}`
- Wrap the meninos card: `{hpConfig.meninos.visible && <div className="pdl-gender-card" ...>}`
- For the photo: change `<PdlImg tint="rose" label="meninas · 1–12 anos" />` to:
  ```tsx
  <PdlImg tint="rose" imageUrl={hpConfig.meninas.imageUrls[0]} label="meninas · 1–12 anos" />
  ```
- Same for meninos with `ochre` and `hpConfig.meninos.imageUrls[0]`

**Mais queridos** (first `pdl-section`): wrap with `{hpConfig.queridos.visible && <div className="pdl-section">...`

**Manifesto** (`pdl-manifesto`): wrap with `{hpConfig.manifesto.visible && <div className="pdl-manifesto">...`

**Coleções** (second `pdl-section`): wrap with `{hpConfig.colecoes.visible && <div className="pdl-section">...`

**Para cada fase** (third `pdl-section`): wrap with `{hpConfig.fases.visible && <div className="pdl-section">...`

**Depoimentos** (fourth `pdl-section`): wrap with `{hpConfig.depoimentos.visible && <div className="pdl-section">...`

**Instagram** (last `pdl-section`): wrap with `{hpConfig.instagram.visible && ...}` and replace the 6 hardcoded `<PdlImg />` with:
```tsx
{(hpConfig.instagram.imageUrls.length > 0
  ? hpConfig.instagram.imageUrls
  : ['rose','ochre','sage','clay','ink','moss']
).map((urlOrTint, i) => (
  <PdlImg
    key={i}
    tint={urlOrTint.startsWith('http') ? 'rose' : urlOrTint}
    imageUrl={urlOrTint.startsWith('http') ? urlOrTint : undefined}
    label="ig"
  />
))}
```

**Step 5: Build check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 6: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: homepage reads homepageConfig, sections toggle and use uploaded photos"
```

---

### Task 9: Manual smoke test

**Step 1: Start dev server in the worktree**

```bash
cd /Users/Shared/projetos/pingo-de-luz-v2/.worktrees/homepage-sections && npm run dev
```

**Step 2: Test the admin page**

1. Go to `http://localhost:3000/admin/homepage`
2. Verify all 8 sections appear with correct labels
3. Toggle "Mais queridos" off → button should show "oculto"
4. Reload `http://localhost:3000` → "Mais queridos" section should be gone
5. Toggle it back on → section reappears

**Step 3: Test photo upload**

1. Click `+ foto` on "Meninas"
2. Upload any image
3. Thumbnail should appear in admin
4. Reload homepage → gender card should show the uploaded photo

**Step 4: Test Instagram grid**

1. Upload 3 photos to Instagram section in admin
2. Reload homepage → those 3 photos show, remaining 3 slots show tint placeholders

---

### Task 10: Merge to main

**Step 1: Final build check**

```bash
npx tsc --noEmit 2>&1
```
Expected: zero errors.

**Step 2: Merge**

```bash
cd /Users/Shared/projetos/pingo-de-luz-v2
git merge feature/homepage-sections
```

**Step 3: Remove worktree**

```bash
git worktree remove .worktrees/homepage-sections
git branch -d feature/homepage-sections
```
