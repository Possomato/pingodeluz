'use client';

import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';

export default function AdminColecoesPage() {
  const { collections } = useAdmin();
  const router = useRouter();

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Coleções</h1>
      </div>
      <div className="adm-col-grid">
        {Object.values(collections).map(col => (
          <div key={col.id} className="adm-col-card">
            <div className="adm-col-card-name">{col.name[0]} <em style={{ fontStyle: 'italic', color: '#888' }}>{col.name[1]}</em></div>
            <div className="adm-col-card-meta">{col.products.length} produtos · {col.eyebrow}</div>
            <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => router.push(`/admin/colecoes/${col.id}`)}>Editar</button>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
