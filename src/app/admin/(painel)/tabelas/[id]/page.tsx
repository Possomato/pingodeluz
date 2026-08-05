'use client';

import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import SizeTableForm from '@/components/admin/SizeTableForm';

export default function EditTabela() {
  const { id } = useParams<{ id: string }>();
  const { sizeTables, updateSizeTable } = useAdmin();
  const router = useRouter();
  const table = sizeTables.find(t => t.id === id);

  if (!table) return <AdminLayout><p style={{ color: 'var(--muted)' }}>Tabela não encontrada.</p></AdminLayout>;

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Editar <em>{table.name}</em></h1>
        <button className="adm-btn adm-btn-secondary" onClick={() => router.push('/admin/tabelas')}>← Voltar</button>
      </div>
      <SizeTableForm
        initial={table}
        onSave={t => { updateSizeTable(id, t); setTimeout(() => router.push('/admin/tabelas'), 1500); }}
      />
    </AdminLayout>
  );
}
