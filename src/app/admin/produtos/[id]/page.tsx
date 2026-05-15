'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import PdlImg from '@/components/PdlImg';
import { Product } from '@/lib/data';
import { uploadImageAction } from '@/app/actions/upload';

const SIZES = ['1', '2', '3', '4', '6', '8'];
const TINTS = ['rose', 'ochre', 'sage', 'clay', 'moss', 'ink'];
const TINT_COLORS: Record<string, string> = {
  rose: '#e8c5b0', ochre: '#c9a96e', sage: '#9eb89e',
  clay: '#c17c5a', moss: '#7a8c6a', ink: '#3a3530',
};

export function ProductForm({ initial, onSave }: {
  initial: Partial<Product>;
  onSave: (p: Partial<Product>) => void;
}) {
  const [form, setForm] = useState<Partial<Product>>({
    name: '', col: 'Jardim Encantado', gender: 'meninas', price: '',
    installments: '', desc: '', imageUrl: '', tint: 'rose',
    sizes: [...SIZES], unavail: [], stock: {},
    ...initial,
  });
  const [toast, setToast] = useState(false);

  const set = (key: keyof Product, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const toggleSize = (s: string) => {
    const has = form.sizes?.includes(s);
    const nextSizes = has ? form.sizes!.filter(x => x !== s) : [...(form.sizes ?? []), s];
    set('sizes', nextSizes);
    const stock = form.stock ?? {};
    set('unavail', nextSizes.filter(sz => !stock[sz] || stock[sz] === 0));
  };

  const setStock = (s: string, val: number) => {
    const next = { ...(form.stock ?? {}), [s]: val };
    set('stock', next);
    const ua = (form.sizes ?? SIZES).filter(sz => !next[sz] || next[sz] === 0);
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
          <select value={form.gender ?? 'meninas'} onChange={e => set('gender', e.target.value as Product['gender'])}>
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
                type="number" min={0}
                value={form.stock?.[s] ?? ''}
                onChange={e => setStock(s, parseInt(e.target.value) || 0)}
                disabled={!form.sizes?.includes(s)}
                placeholder="qtd"
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
        initial={product}
        onSave={patch => {
          updateProduct(id, patch);
          setTimeout(() => router.push('/admin/produtos'), 1500);
        }}
      />
    </AdminLayout>
  );
}
