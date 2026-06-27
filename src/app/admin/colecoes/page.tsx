'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';

function toSlug(name: string) {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'colecao';
}

export default function AdminColecoesPage() {
  const { collections, addCollection, deleteCollection } = useAdmin();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name0, setName0] = useState('');
  const [name1, setName1] = useState('');
  const [saving, setSaving] = useState(false);

  const slug = toSlug(name0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name0.trim()) return;
    setSaving(true);
    const id = await addCollection([name0.trim(), name1.trim()]);
    setSaving(false);
    setCreating(false);
    setName0('');
    setName1('');
    router.push(`/admin/colecoes/${id}`);
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Excluir a coleção "${label}"? Esta ação não pode ser desfeita.`)) return;
    await deleteCollection(id);
  };

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Coleções</h1>
        <button className="adm-btn adm-btn-primary adm-btn-sm" onClick={() => setCreating(v => !v)}>
          {creating ? 'Cancelar' : '+ Nova coleção'}
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="adm-inline-form">
          <div className="adm-field">
            <label className="adm-label">Nome (parte 1)</label>
            <input
              className="adm-input"
              value={name0}
              onChange={e => setName0(e.target.value)}
              placeholder="ex: Jardim"
              autoFocus
            />
          </div>
          <div className="adm-field">
            <label className="adm-label">Nome (parte 2 — itálico)</label>
            <input
              className="adm-input"
              value={name1}
              onChange={e => setName1(e.target.value)}
              placeholder="ex: Encantado"
            />
          </div>
          {name0 && (
            <p className="adm-slug-preview">slug gerado: <code>{slug}</code></p>
          )}
          <button className="adm-btn adm-btn-primary" type="submit" disabled={!name0.trim() || saving}>
            {saving ? 'Criando…' : 'Criar coleção'}
          </button>
        </form>
      )}

      <div className="adm-col-grid">
        {Object.values(collections).map(col => (
          <div key={col.id} className="adm-col-card">
            <div className="adm-col-card-name">
              {col.name[0]} <em style={{ fontStyle: 'italic', color: '#888' }}>{col.name[1]}</em>
            </div>
            <div className="adm-col-card-meta">{col.products.length} produtos · {col.eyebrow || 'sem eyebrow'}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                className="adm-btn adm-btn-secondary adm-btn-sm"
                onClick={() => router.push(`/admin/colecoes/${col.id}`)}
              >
                Editar
              </button>
              <button
                className="adm-btn adm-btn-danger adm-btn-sm"
                onClick={() => handleDelete(col.id, `${col.name[0]} ${col.name[1]}`)}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
