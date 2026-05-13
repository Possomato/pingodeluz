'use client';

import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import PdlImg from '@/components/PdlImg';

export default function AdminProdutosPage() {
  const { products, deleteProduct } = useAdmin();
  const router = useRouter();

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return;
    deleteProduct(id);
  };

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Produtos</h1>
        <button className="adm-btn adm-btn-primary" onClick={() => router.push('/admin/produtos/novo')}>
          + Adicionar produto
        </button>
      </div>
      <table className="adm-table">
        <thead>
          <tr>
            <th>Foto</th>
            <th>Nome</th>
            <th>Coleção</th>
            <th>Preço</th>
            <th>Estoque total</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => {
            const totalStock = p.stock
              ? Object.values(p.stock).reduce((s, n) => s + n, 0)
              : (p.sizes ? p.sizes.length - (p.unavail?.length ?? 0) : '—');
            return (
              <tr key={p.id}>
                <td>
                  {p.imageUrl
                    ? <img src={p.imageUrl} alt={p.name} width={80} height={107} className="adm-img-preview" />
                    : <PdlImg tint={p.tint} className="adm-img-swatch" style={{ aspectRatio: '3/4' }} />
                  }
                </td>
                <td style={{ fontWeight: 500 }}>{p.name}</td>
                <td style={{ color: '#888' }}>{p.col}</td>
                <td>{p.price}</td>
                <td>{totalStock}</td>
                <td>
                  <div className="adm-actions">
                    <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => router.push(`/admin/produtos/${p.id}`)}>Editar</button>
                    <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => handleDelete(p.id, p.name)}>Excluir</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </AdminLayout>
  );
}
