'use client';

import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';

export default function TabelasPage() {
  const { sizeTables, deleteSizeTable } = useAdmin();
  const router = useRouter();

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Tabelas de <em>tamanho</em></h1>
        <button className="adm-btn adm-btn-primary" onClick={() => router.push('/admin/tabelas/novo')}>+ Nova tabela</button>
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr><th>Nome</th><th>Colunas</th><th>Tamanhos</th><th></th></tr>
          </thead>
          <tbody>
            {sizeTables.map(t => (
              <tr key={t.id}>
                <td style={{ fontWeight: 500 }}>{t.name}</td>
                <td style={{ color: 'var(--muted)' }}>{t.columns.join(', ')}</td>
                <td style={{ color: 'var(--muted)' }}>{t.rows.map(r => r.size).join(', ')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="adm-btn adm-btn-secondary" onClick={() => router.push(`/admin/tabelas/${t.id}`)}>Editar</button>
                    <button className="adm-btn" style={{ color: 'var(--terra)' }} onClick={() => { if (confirm(`Excluir "${t.name}"?`)) deleteSizeTable(t.id); }}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sizeTables.length === 0 && <p style={{ color: 'var(--muted)', padding: '24px 0' }}>Nenhuma tabela cadastrada.</p>}
      </div>
    </AdminLayout>
  );
}
