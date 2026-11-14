'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import ProductForm from '@/components/admin/ProductForm';
import { useAdmin } from '@/context/AdminContext';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { products, loading, updateProduct } = useAdmin();
  const product = products.find(p => p.id === id);

  if (!product) return (
    <AdminLayout>
      <Link href="/admin/produtos" className="adm-back">← Peças</Link>
      {loading
        ? <p className="adm-muted">Carregando…</p>
        : <div className="adm-empty"><strong>Peça não encontrada</strong>Ela pode ter sido excluída.</div>}
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <Link href="/admin/produtos" className="adm-back">← Peças</Link>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">{product.name}</h1>
        {product.active && (
          <a href={`/produto/${product.id}`} target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn-secondary adm-btn-sm">
            Ver na loja ↗
          </a>
        )}
      </div>
      <ProductForm key={product.id} initial={product} onSave={patch => updateProduct(id, patch)} />
    </AdminLayout>
  );
}
