'use client';

import { useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';

export default function AdminEstoquePage() {
  const { products, loading, adjustStock } = useAdmin();
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const visible = products
    .filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      const ta = Object.values(a.stock ?? {}).reduce((s, q) => s + q, 0);
      const tb = Object.values(b.stock ?? {}).reduce((s, q) => s + q, 0);
      return ta - tb;  // mais críticos primeiro
    });

  const handleChange = async (productId: string, size: string, value: string) => {
    const qty = Math.max(0, parseInt(value, 10) || 0);
    setSaving(`${productId}-${size}`);
    await adjustStock(productId, size, qty);
    setSaving(null);
  };

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Estoque</h1>
      </div>

      <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
        Alterações são gravadas na hora e registradas no histórico de movimentações.
        A baixa por venda acontece sozinha quando o pagamento é aprovado.
      </p>

      <div className="adm-field" style={{ maxWidth: 320, marginBottom: 16 }}>
        <label htmlFor="filtro-estoque">Buscar peça</label>
        <input id="filtro-estoque" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>

      {loading ? (
        <p style={{ color: '#888' }}>Carregando…</p>
      ) : visible.length === 0 ? (
        <p style={{ color: '#888' }}>Nenhum produto encontrado.</p>
      ) : (
        <table className="adm-table">
          <thead><tr><th>Produto</th><th>Estoque por tamanho</th><th>Total</th></tr></thead>
          <tbody>
            {visible.map((p) => {
              const total = Object.values(p.stock ?? {}).reduce((s, q) => s + q, 0);
              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/produtos/${p.id}`} style={{ fontWeight: 500 }}>{p.name}</Link>
                    {!p.active && <span style={{ color: '#888', fontSize: 11 }}> · rascunho</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {(p.sizes ?? []).length === 0 ? (
                        <span style={{ color: '#888', fontSize: 12 }}>sem tamanhos definidos</span>
                      ) : (p.sizes ?? []).map((s) => (
                        <div key={s} style={{ display: 'grid', gap: 2, width: 60 }}>
                          <label htmlFor={`e-${p.id}-${s}`} style={{ fontSize: 10, fontWeight: 600 }}>{s}</label>
                          <input
                            id={`e-${p.id}-${s}`}
                            type="number"
                            min={0}
                            defaultValue={p.stock?.[s] ?? 0}
                            disabled={saving === `${p.id}-${s}`}
                            onBlur={(e) => {
                              const next = Math.max(0, parseInt(e.target.value, 10) || 0);
                              if (next !== (p.stock?.[s] ?? 0)) handleChange(p.id, s, e.target.value);
                            }}
                            style={(p.stock?.[s] ?? 0) === 0 ? { borderColor: '#c0392b' } : undefined}
                          />
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={total === 0 ? { color: '#c0392b', fontWeight: 600 } : undefined}>
                    {total === 0 ? 'esgotado' : `${total} un.`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </AdminLayout>
  );
}
