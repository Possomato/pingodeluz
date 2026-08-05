'use client';

import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { ProductForm } from '../[id]/page';
import { Product } from '@/lib/data';

export default function NewProductPage() {
  const { addProduct } = useAdmin();
  const router = useRouter();

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Novo <em>produto</em></h1>
        <button className="adm-btn adm-btn-secondary" onClick={() => router.push('/admin/produtos')}>← Voltar</button>
      </div>
      <ProductForm
        initial={{}}
        onSave={p => { addProduct(p as Omit<Product, 'id'>); setTimeout(() => router.push('/admin/produtos'), 1500); }}
      />
    </AdminLayout>
  );
}
