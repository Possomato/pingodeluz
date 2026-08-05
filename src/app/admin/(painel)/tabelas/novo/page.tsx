'use client';

import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import SizeTableForm from '@/components/admin/SizeTableForm';
import type { SizeTable } from '@/lib/data';

export default function NovaTabela() {
  const { addSizeTable } = useAdmin();
  const router = useRouter();
  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Nova <em>tabela</em></h1>
        <button className="adm-btn adm-btn-secondary" onClick={() => router.push('/admin/tabelas')}>← Voltar</button>
      </div>
      <SizeTableForm
        initial={{}}
        onSave={t => { addSizeTable(t as Omit<SizeTable, 'id'>); setTimeout(() => router.push('/admin/tabelas'), 1500); }}
      />
    </AdminLayout>
  );
}
