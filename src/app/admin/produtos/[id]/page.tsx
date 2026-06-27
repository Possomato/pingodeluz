'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { Product } from '@/lib/data';
import ImageCropUploader from '@/components/admin/ImageCropUploader';

const TINTS = ['rose', 'ochre', 'sage', 'clay', 'moss', 'ink'];
const TIPOS = ['vestido', 'macacão', 'camisa', 'blusa', 'bermuda', 'calça', 'conjunto', 'saia', 'suéter', 'camiseta', 'camisola', 'body', 'outro'];
const TINT_COLORS: Record<string, string> = {
  rose: '#e8c5b0', ochre: '#c9a96e', sage: '#9eb89e',
  clay: '#c17c5a', moss: '#7a8c6a', ink: '#3a3530',
};

function formatPrice(raw: string): string {
  let clean = raw.replace(/[^\d,]/g, '');
  const commaIdx = clean.indexOf(',');
  if (commaIdx !== -1) {
    clean = clean.slice(0, commaIdx + 1) + clean.slice(commaIdx + 1).replace(/,/g, '').slice(0, 2);
  }
  const [intPart = '', decPart] = clean.split(',');
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return formatted ? `R$ ${formatted}${decPart !== undefined ? ',' + decPart : ''}` : '';
}

export function ProductForm({ initial, onSave }: {
  initial: Partial<Product>;
  onSave: (p: Partial<Product>) => void;
}) {
  const resolvedUrls = initial.imageUrls?.length
    ? initial.imageUrls
    : initial.imageUrl ? [initial.imageUrl] : [];

  const [form, setForm] = useState<Partial<Product>>({
    name: '', col: '', gender: 'meninas', price: '',
    desc: '', tint: 'rose',
    ...initial,
    imageUrls: resolvedUrls,
  });
  const { sizeTables, collections } = useAdmin();
  const [toast, setToast] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof Product, val: unknown) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name?.trim()) e.name = 'Informe o nome do produto';
    if (!form.type) e.type = 'Selecione o tipo de peça';
    if (!form.price?.trim()) e.price = 'Informe o preço';
    if (!(form.imageUrls?.length)) e.imageUrls = 'Adicione ao menos uma foto';
    if (!form.sizeTableId) e.sizeTableId = 'Selecione uma tabela de tamanhos';
    if (form.sizeTableId && !(form.sizes?.length)) e.sizes = 'Selecione ao menos um tamanho';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const nameParts: [string, string] = [
      form.name?.split(' ')[0] ?? '',
      form.name?.split(' ').slice(1).join(' ') ?? '',
    ];
    onSave({ ...form, nameParts, label: `foto · ${form.name?.toLowerCase()}` });
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  const E = ({ k }: { k: string }) => errors[k]
    ? <span className="adm-field-error">{errors[k]}</span>
    : null;

  return (
    <form className="adm-form" onSubmit={handleSave} noValidate>
      <div className="adm-form-row">
        <div className={`adm-field ${errors.name ? 'adm-field--error' : ''}`}>
          <label>Nome do produto</label>
          <input value={form.name ?? ''} onChange={e => set('name', e.target.value)} placeholder="Vestido Margarida" />
          <E k="name" />
        </div>
        <div className="adm-field">
          <label>Coleção</label>
          <select value={form.col ?? ''} onChange={e => set('col', e.target.value)}>
            <option value="">— selecione —</option>
            {Object.values(collections).map(col => {
              const label = col.name.join(' ');
              return <option key={col.id} value={label}>{label}</option>;
            })}
          </select>
        </div>
      </div>

      <div className="adm-form-row">
        <div className={`adm-field ${errors.type ? 'adm-field--error' : ''}`}>
          <label>Tipo de peça</label>
          <select value={form.type ?? ''} onChange={e => set('type', e.target.value)}>
            <option value="">— selecione —</option>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <E k="type" />
        </div>
        <div className="adm-field">
          <label>Gênero</label>
          <select value={form.gender ?? 'meninas'} onChange={e => set('gender', e.target.value as Product['gender'])}>
            <option value="meninas">Meninas</option>
            <option value="meninos">Meninos</option>
            <option value="unissex">Unissex</option>
          </select>
        </div>
      </div>

      <div className={`adm-field ${errors.price ? 'adm-field--error' : ''}`}>
        <label>Preço</label>
        <input
          value={form.price ?? ''}
          inputMode="numeric"
          onChange={e => set('price', formatPrice(e.target.value))}
          placeholder="R$ 189,00"
        />
        <E k="price" />
      </div>

      <div className="adm-field">
        <label>Descrição</label>
        <textarea value={form.desc ?? ''} onChange={e => set('desc', e.target.value)} />
      </div>

      <div className={`adm-field ${errors.imageUrls ? 'adm-field--error' : ''}`}>
        <label>Fotos do produto</label>
        <div className="adm-gallery-grid">
          {(form.imageUrls ?? []).map((url, i) => (
            <div key={i} className="adm-gallery-item">
              <img src={url} alt={`foto ${i + 1}`} className="adm-gallery-thumb" style={{ width: 88, height: 117, objectFit: 'cover', borderRadius: 6, display: 'block', flexShrink: 0 }} />
              <button
                type="button"
                className="adm-gallery-remove"
                onClick={() => set('imageUrls', (form.imageUrls ?? []).filter((_, j) => j !== i))}
              >×</button>
            </div>
          ))}
          <ImageCropUploader
            aspect={3 / 4}
            addTile
            onUpload={url => set('imageUrls', [...(form.imageUrls ?? []), url])}
            label="foto"
          />
        </div>
        <E k="imageUrls" />
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

      <div className={`adm-field ${errors.sizeTableId ? 'adm-field--error' : ''}`}>
        <label>Tabela de tamanhos</label>
        <select
          value={form.sizeTableId ?? ''}
          onChange={e => {
            const tableId = e.target.value || undefined;
            const table = tableId ? sizeTables.find(t => t.id === tableId) : undefined;
            set('sizeTableId', tableId);
            set('sizes', table?.rows.map(r => r.size) ?? []);
          }}
        >
          <option value="">— selecione uma tabela —</option>
          {sizeTables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <E k="sizeTableId" />
      </div>

      {form.sizeTableId && (() => {
        const table = sizeTables.find(t => t.id === form.sizeTableId);
        if (!table) return null;
        return (
          <div className={`adm-field ${errors.sizes ? 'adm-field--error' : ''}`}>
            <label>Tamanhos disponíveis</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {table.rows.map(row => (
                <label key={row.size} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={form.sizes?.includes(row.size) ?? false}
                    onChange={() => {
                      const next = form.sizes?.includes(row.size)
                        ? form.sizes.filter(s => s !== row.size)
                        : [...(form.sizes ?? []), row.size];
                      set('sizes', next);
                    }}
                  />
                  <span style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13 }}>{row.size}</span>
                </label>
              ))}
            </div>
            <E k="sizes" />
          </div>
        );
      })()}

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
        initial={product}
        onSave={patch => {
          updateProduct(id, patch);
          setTimeout(() => router.push('/admin/produtos'), 1500);
        }}
      />
    </AdminLayout>
  );
}
