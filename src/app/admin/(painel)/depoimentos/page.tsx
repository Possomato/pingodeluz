'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  listTestimonialsAction, upsertTestimonialAction, deleteTestimonialAction,
} from '@/app/actions/admin';

interface Row {
  id: string;
  quote: string;
  author: string;
  role: string;
  sort: number;
  visible: boolean;
}

const BLANK = { quote: '', author: '', role: '', sort: 0, visible: true };

export default function AdminDepoimentosPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof BLANK & { id?: string }>(BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows((await listTestimonialsAction()) as Row[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await upsertTestimonialAction({
        id: form.id,
        quote: form.quote,
        author: form.author,
        role: form.role,
        sort: form.sort,
        visible: form.visible,
      });
      setForm(BLANK);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout>
      <h1 className="adm-page-title">Depoimentos</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
        Aparecem na seção &ldquo;O que dizem as mães&rdquo; da home. Sem nenhum
        visível, a seção some.
      </p>

      <form className="adm-form" onSubmit={submit} style={{ marginBottom: 32 }}>
        <div className="adm-field">
          <label htmlFor="d-quote">Depoimento</label>
          <textarea id="d-quote" required value={form.quote}
            onChange={(e) => setForm({ ...form, quote: e.target.value })} />
        </div>
        <div className="adm-form-row">
          <div className="adm-field">
            <label htmlFor="d-author">Quem escreveu</label>
            <input id="d-author" required value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Marina Vasques" />
          </div>
          <div className="adm-field">
            <label htmlFor="d-role">Descrição</label>
            <input id="d-role" value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="mãe da Manuela, 4" />
          </div>
        </div>
        <div className="adm-form-row">
          <div className="adm-field">
            <label htmlFor="d-sort">Ordem</label>
            <input id="d-sort" type="number" value={form.sort}
              onChange={(e) => setForm({ ...form, sort: parseInt(e.target.value, 10) || 0 })} />
          </div>
          <div className="adm-field">
            <label htmlFor="d-vis">Visível</label>
            <select id="d-vis" value={form.visible ? 'sim' : 'nao'}
              onChange={(e) => setForm({ ...form, visible: e.target.value === 'sim' })}>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </div>
        </div>

        {error && <div role="alert" style={{ color: '#c0392b', fontSize: 13 }}>{error}</div>}

        <div className="adm-form-actions">
          <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>
            {form.id ? 'Salvar alterações' : 'Adicionar depoimento'}
          </button>
          {form.id && (
            <button type="button" className="adm-btn adm-btn-secondary" onClick={() => setForm(BLANK)}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p style={{ color: '#888' }}>Carregando…</p>
      ) : rows.length === 0 ? (
        <p style={{ color: '#888' }}>Nenhum depoimento cadastrado.</p>
      ) : (
        <table className="adm-table">
          <thead><tr><th>Depoimento</th><th>Autoria</th><th>Ordem</th><th>Visível</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={r.visible ? undefined : { opacity: 0.55 }}>
                <td style={{ maxWidth: 380 }}>{r.quote}</td>
                <td>{r.author}<br /><span style={{ color: '#888', fontSize: 12 }}>{r.role}</span></td>
                <td>{r.sort}</td>
                <td>{r.visible ? 'sim' : 'não'}</td>
                <td>
                  <div className="adm-actions">
                    <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => setForm(r)}>Editar</button>
                    <button className="adm-btn adm-btn-danger adm-btn-sm"
                      onClick={async () => {
                        if (confirm('Excluir este depoimento?')) { await deleteTestimonialAction(r.id); load(); }
                      }}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminLayout>
  );
}
