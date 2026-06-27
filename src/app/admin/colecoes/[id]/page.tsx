'use client';

import { useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import ImageCropUploader from '@/components/admin/ImageCropUploader';

const TINTS = ['rose', 'ochre', 'sage', 'clay', 'moss', 'ink'];
const TINT_COLORS: Record<string, string> = {
  rose: '#e8c5b0', ochre: '#c9a96e', sage: '#9eb89e',
  clay: '#c17c5a', moss: '#7a8c6a', ink: '#3a3530',
};

export default function EditColecaoPage() {
  const { id } = useParams<{ id: string }>();
  const { collections, updateCollection, deleteCollection } = useAdmin();
  const router = useRouter();
  const col = collections[id];

  const [form, setForm] = useState({
    name0: col?.name[0] ?? '',
    name1: col?.name[1] ?? '',
    eyebrow: col?.eyebrow ?? '',
    tint: col?.tint ?? 'rose',
    intro: col?.intro ?? '',
    imageUrl: col?.imageUrl ?? '',
  });
  const [toast, setToast] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!col) return (
    <AdminLayout>
      <p style={{ color: '#888' }}>Coleção não encontrada.</p>
    </AdminLayout>
  );

  const set = (key: keyof typeof form, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCollection(id, {
      name: [form.name0, form.name1],
      eyebrow: form.eyebrow,
      tint: form.tint,
      intro: form.intro,
      imageUrl: form.imageUrl || undefined,
    });
    setToast(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setToast(false); router.push('/admin/colecoes'); }, 1500);
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
          <label>Imagem hero</label>
          <ImageCropUploader
            aspect={4 / 2}
            currentUrl={form.imageUrl ?? undefined}
            onUpload={url => set('imageUrl', url)}
            label="foto"
          />
          {form.imageUrl && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, wordBreak: 'break-all' }}>
              {form.imageUrl}
            </div>
          )}
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
          <button
            type="button"
            className="adm-btn adm-btn-danger"
            onClick={async () => {
              if (!window.confirm(`Excluir a coleção "${col.name[0]} ${col.name[1]}"? Esta ação não pode ser desfeita.`)) return;
              await deleteCollection(id);
              router.push('/admin/colecoes');
            }}
          >
            Excluir coleção
          </button>
        </div>
      </form>

      {toast && <div className="adm-toast">Coleção salva!</div>}
    </AdminLayout>
  );
}
