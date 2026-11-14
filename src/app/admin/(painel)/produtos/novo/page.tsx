'use client';

import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import ProductForm from '@/components/admin/ProductForm';
import { useAdmin } from '@/context/AdminContext';
import type { Product } from '@/lib/data';

export default function NewProductPage() {
  const { addProduct } = useAdmin();

  return (
    <AdminLayout>
      <Link href="/admin/produtos" className="adm-back">← Peças</Link>
      <h1 className="adm-page-title">Nova <em>peça</em></h1>
      <p className="adm-page-sub">Quatro passos: fotos, nome e preço, tamanhos com estoque e publicar.</p>
      <ProductForm
        isNew
        initial={{}}
        onSave={async p => (await addProduct(p as Omit<Product, 'id'>)) !== null}
      />
    </AdminLayout>
  );
}
