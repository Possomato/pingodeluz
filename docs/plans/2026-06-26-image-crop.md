# Image Crop Upload — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adicionar um modal de crop com drag + zoom ao fluxo de upload de imagens no admin, com proporção correta por seção.

**Architecture:** Um componente `CropModal` puro (drag/zoom/canvas) + um `ImageCropUploader` reutilizável (file input + modal + upload). O upload envia um Blob gerado pelo canvas para o `uploadImageAction` existente. Proporções: produto=3/4, coleção=7/9, gênero home=7/11.

**Tech Stack:** Next.js 16, React (hooks), Canvas API, Supabase Storage (já configurado em `src/app/actions/upload.ts`).

---

## Task 1: CropModal — UI puro de crop

**Files:**
- Create: `src/components/admin/CropModal.tsx`

**Step 1: Criar o componente**

```tsx
'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface Props {
  src: string;
  aspect: number; // width / height, ex: 3/4 = 0.75
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

const VIEW_MAX_W = 480;
const VIEW_MAX_H = 400;
const OUTPUT_W = 1000;

type T = { natW: number; natH: number; scale: number; ox: number; oy: number };

export default function CropModal({ src, aspect, onConfirm, onCancel }: Props) {
  const viewW = Math.min(VIEW_MAX_W, VIEW_MAX_H * aspect);
  const viewH = viewW / aspect;

  const [t, setT] = useState<T | null>(null);
  const imgEl = useRef<HTMLImageElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

  const initT = useCallback((img: HTMLImageElement) => {
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    const scale = Math.max(viewW / natW, viewH / natH);
    setT({
      natW, natH, scale,
      ox: (viewW - natW * scale) / 2,
      oy: (viewH - natH * scale) / 2,
    });
  }, [viewW, viewH]);

  // Non-passive wheel handler (React's onWheel is passive by default)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setT(prev => {
        if (!prev) return prev;
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        const minScale = Math.max(viewW / prev.natW, viewH / prev.natH);
        const newScale = clamp(prev.scale * factor, minScale, minScale * 6);
        const cx = viewW / 2;
        const cy = viewH / 2;
        return {
          ...prev,
          scale: newScale,
          ox: clamp(cx - (cx - prev.ox) * (newScale / prev.scale), viewW - prev.natW * newScale, 0),
          oy: clamp(cy - (cy - prev.oy) * (newScale / prev.scale), viewH - prev.natH * newScale, 0),
        };
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [viewW, viewH]);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setT(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        ox: clamp(prev.ox + dx, viewW - prev.natW * prev.scale, 0),
        oy: clamp(prev.oy + dy, viewH - prev.natH * prev.scale, 0),
      };
    });
  }, [viewW, viewH]);

  const onMouseUp = useCallback(() => { dragging.current = false; }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const confirm = () => {
    const img = imgEl.current;
    if (!img || !t) return;
    const outputH = Math.round(OUTPUT_W / aspect);
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_W;
    canvas.height = outputH;
    const ctx = canvas.getContext('2d')!;
    // viewport (0,0) maps to image pixel (-ox/scale, -oy/scale)
    ctx.drawImage(img, -t.ox / t.scale, -t.oy / t.scale, viewW / t.scale, viewH / t.scale, 0, 0, OUTPUT_W, outputH);
    canvas.toBlob(blob => { if (blob) onConfirm(blob); }, 'image/jpeg', 0.85);
  };

  return (
    <div className="crop-backdrop" onClick={onCancel}>
      <div className="crop-modal" onClick={e => e.stopPropagation()}>
        <div className="crop-modal-title">Ajuste a imagem</div>
        <div
          ref={viewportRef}
          className="crop-viewport"
          style={{ width: viewW, height: viewH }}
          onMouseDown={onMouseDown}
        >
          <img
            ref={imgEl}
            src={src}
            alt=""
            onLoad={e => initT(e.currentTarget)}
            style={t ? {
              position: 'absolute',
              left: t.ox,
              top: t.oy,
              width: t.natW * t.scale,
              height: t.natH * t.scale,
              userSelect: 'none',
              pointerEvents: 'none',
            } : { visibility: 'hidden', position: 'absolute' }}
            draggable={false}
          />
        </div>
        <div className="crop-hint">Arraste para reposicionar · scroll para zoom</div>
        <div className="crop-actions">
          <button type="button" className="adm-btn" onClick={onCancel}>Cancelar</button>
          <button type="button" className="adm-btn adm-btn-primary" onClick={confirm} disabled={!t}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: zero erros.

**Step 3: Commit**

```bash
git add src/components/admin/CropModal.tsx
git commit -m "feat: add CropModal component with drag/zoom/canvas crop"
```

---

## Task 2: CSS do CropModal

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Adicionar ao final do arquivo**

```css
/* ── Image Crop Modal ──────────────────────────────────────── */
.crop-backdrop { position: fixed; inset: 0; background: rgba(42,36,25,0.65); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.crop-modal { background: var(--cream); border-radius: 10px; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 14px; max-width: calc(100vw - 32px); box-shadow: 0 8px 32px rgba(42,36,25,0.18); }
.crop-modal-title { font-family: var(--sans); font-size: 13px; font-weight: 600; letter-spacing: 0.04em; color: var(--ink); align-self: flex-start; }
.crop-viewport { position: relative; overflow: hidden; border-radius: 4px; cursor: grab; user-select: none; background: #1a1612; flex-shrink: 0; }
.crop-viewport:active { cursor: grabbing; }
.crop-hint { font-family: var(--sans); font-size: 11px; color: var(--muted); letter-spacing: 0.02em; }
.crop-actions { display: flex; gap: 10px; align-self: flex-end; }
```

**Step 2: Verificar build**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add CropModal CSS"
```

---

## Task 3: ImageCropUploader — componente reutilizável

**Files:**
- Create: `src/components/admin/ImageCropUploader.tsx`

**Step 1: Criar o componente**

```tsx
'use client';

import { useRef, useState } from 'react';
import CropModal from './CropModal';
import { uploadImageAction } from '@/app/actions/upload';

interface Props {
  aspect: number;
  currentUrl?: string;
  onUpload: (url: string) => void;
  label?: string;
}

export default function ImageCropUploader({ aspect, currentUrl, onUpload, label = 'foto' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (typeof ev.target?.result === 'string') setPendingSrc(ev.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleConfirm = async (blob: Blob) => {
    setPendingSrc(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', blob, 'image.jpg');
      const url = await uploadImageAction(fd);
      onUpload(url);
    } finally {
      setUploading(false);
    }
  };

  const previewH = Math.round(120 / aspect);

  return (
    <>
      {pendingSrc && (
        <CropModal
          src={pendingSrc}
          aspect={aspect}
          onConfirm={handleConfirm}
          onCancel={() => setPendingSrc(null)}
        />
      )}
      <div className="crop-uploader">
        {currentUrl ? (
          <img
            src={currentUrl}
            alt="preview"
            style={{ width: 120, height: previewH, objectFit: 'cover', borderRadius: 4, display: 'block', marginBottom: 8 }}
          />
        ) : (
          <div style={{ width: 120, height: previewH, borderRadius: 4, marginBottom: 8, background: 'var(--cream-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--muted)', border: '1px dashed var(--border)' }}>
            sem foto
          </div>
        )}
        <button
          type="button"
          className="adm-btn"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'enviando…' : currentUrl ? `trocar ${label}` : `+ ${label}`}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </>
  );
}
```

**Step 2: Adicionar `.crop-uploader` ao CSS** (em `globals.css`, logo após `.crop-actions`)

```css
.crop-uploader { display: flex; flex-direction: column; align-items: flex-start; }
```

**Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/components/admin/ImageCropUploader.tsx src/app/globals.css
git commit -m "feat: add ImageCropUploader reusable component"
```

---

## Task 4: Produto admin — usar ImageCropUploader (aspect 3/4)

**Files:**
- Modify: `src/app/admin/produtos/[id]/page.tsx`

**Step 1: Atualizar import**

Remover a linha:
```tsx
import { uploadImageAction } from '@/app/actions/upload';
```

Adicionar:
```tsx
import ImageCropUploader from '@/components/admin/ImageCropUploader';
```

**Step 2: Substituir o bloco de upload de imagem**

Localizar e remover este bloco completo (linhas ~88–126):
```tsx
<div className="adm-field">
  <label>Imagem do produto</label>
  {form.imageUrl && (
    <img
      src={form.imageUrl}
      alt="preview"
      width={120}
      height={160}
      style={{ objectFit: 'cover', borderRadius: 4, marginBottom: 8, display: 'block' }}
    />
  )}
  {!form.imageUrl && (
    <PdlImg tint={form.tint ?? 'rose'} style={{ width: 120, height: 160, flexShrink: 0, borderRadius: 4, marginBottom: 8, display: 'block' }} />
  )}
  <input
    type="file"
    accept="image/*"
    onChange={async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      const url = await uploadImageAction(fd);
      set('imageUrl', url);
    }}
  />
  <input
    type="url"
    placeholder="ou cole uma URL"
    value={form.imageUrl ?? ''}
    onChange={e => set('imageUrl', e.target.value)}
    style={{ marginTop: 6 }}
  />
  {form.imageUrl && (
    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, wordBreak: 'break-all' }}>
      {form.imageUrl}
    </div>
  )}
</div>
```

Substituir por:
```tsx
<div className="adm-field">
  <label>Imagem do produto</label>
  <ImageCropUploader
    aspect={3 / 4}
    currentUrl={form.imageUrl ?? undefined}
    onUpload={url => set('imageUrl', url)}
    label="foto"
  />
  <input
    type="url"
    placeholder="ou cole uma URL"
    value={form.imageUrl ?? ''}
    onChange={e => set('imageUrl', e.target.value)}
    style={{ marginTop: 6 }}
  />
  {form.imageUrl && (
    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, wordBreak: 'break-all' }}>
      {form.imageUrl}
    </div>
  )}
</div>
```

**Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add "src/app/admin/produtos/[id]/page.tsx"
git commit -m "feat: use ImageCropUploader (3/4) in produto admin"
```

---

## Task 5: Coleção admin — usar ImageCropUploader (aspect 7/9)

**Files:**
- Modify: `src/app/admin/colecoes/[id]/page.tsx`

**Step 1: Atualizar import**

Remover:
```tsx
import { uploadImageAction } from '@/app/actions/upload';
```

Adicionar:
```tsx
import ImageCropUploader from '@/components/admin/ImageCropUploader';
```

**Step 2: Substituir o bloco de upload de imagem**

Localizar e remover (linhas ~85–110):
```tsx
{form.imageUrl && (
  <img
    src={form.imageUrl}
    alt="preview"
    width={140}
    height={100}
    style={{ objectFit: 'cover', borderRadius: 6, marginBottom: 8, display: 'block', border: '1px solid #e5e5e5' }}
  />
)}
<input
  type="file"
  accept="image/*"
  onChange={async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const url = await uploadImageAction(fd);
    set('imageUrl', url);
  }}
/>
{form.imageUrl && (
  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, wordBreak: 'break-all' }}>
    {form.imageUrl}
  </div>
)}
```

Substituir por:
```tsx
<ImageCropUploader
  aspect={7 / 9}
  currentUrl={form.imageUrl ?? undefined}
  onUpload={url => set('imageUrl', url)}
  label="foto"
/>
{form.imageUrl && (
  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, wordBreak: 'break-all' }}>
    {form.imageUrl}
  </div>
)}
```

**Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add "src/app/admin/colecoes/[id]/page.tsx"
git commit -m "feat: use ImageCropUploader (7/9) in colecao admin"
```

---

## Task 6: Homepage admin — usar ImageCropUploader para meninas/meninos (aspect 7/11)

**Files:**
- Modify: `src/app/admin/homepage/page.tsx`

**Step 1: Atualizar imports**

Adicionar `ImageCropUploader`:
```tsx
import ImageCropUploader from '@/components/admin/ImageCropUploader';
```

`uploadImageAction` ainda é necessário para instagram — manter o import.

**Step 2: Remover `useRef` para `inputRefs` SE instagram não precisar mais**

Atenção: `handleUpload` e `inputRefs` ainda são usados para instagram. **Manter ambos**.

**Step 3: Substituir o bloco `{hasPhotos && (...)}` completo**

Localizar (linhas ~70–100):
```tsx
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
```

Substituir por:
```tsx
{(id === 'meninas' || id === 'meninos') && (
  <ImageCropUploader
    aspect={7 / 11}
    currentUrl={section.imageUrls[0]}
    onUpload={url => updateHomepageSection(id, { imageUrls: [url] })}
    label="foto"
  />
)}
{isInstagram && (
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
    {section.imageUrls.length < 6 && (
      <>
        <button
          className="adm-homepage-upload-btn"
          onClick={() => inputRefs.current[id]?.click()}
        >
          {section.imageUrls.length === 0 ? '+ foto' : '+ foto'}
        </button>
        <input
          ref={el => { inputRefs.current[id] = el; }}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleUpload(id, e.target.files)}
        />
      </>
    )}
  </div>
)}
```

**Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/app/admin/homepage/page.tsx
git commit -m "feat: use ImageCropUploader (7/11) for meninas/meninos in homepage admin"
```

---

## Verificação final

Após todas as tasks:

```bash
npx tsc --noEmit
```

Esperado: zero erros.

Testar manualmente:
1. Acessar `/admin/produtos/[id]` → clicar em "+ foto" → selecionar imagem → modal abre com moldura 3:4 → arrastar/zoom → confirmar → imagem salva com proporção correta
2. Acessar `/admin/colecoes/[id]` → mesmo fluxo com moldura 7:9
3. Acessar `/admin/homepage` → clicar em "+ foto" em meninas/meninos → moldura 7:11
