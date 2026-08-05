'use client';

import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import PdlImg from '@/components/PdlImg';

export default function AdminProdutosPage() {
  const { products, deleteProduct, addProduct } = useAdmin();
  const router = useRouter();

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return;
    deleteProduct(id);
  };

  const handleClone = async (p: (typeof products)[0]) => {
    const { id: _id, imageUrl: _img, imageUrls: _imgs, ...rest } = p;
    const newId = await addProduct({ ...rest, imageUrls: [], imageUrl: undefined });
    router.push(`/admin/produtos/${newId}`);
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
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => {
              return (
              <tr key={p.id}>
                <td>
                  {(p.imageUrls?.[0] ?? p.imageUrl)
                    ? <img src={p.imageUrls?.[0] ?? p.imageUrl} alt={p.name} width={80} height={107} className="adm-img-preview" />
                    : <PdlImg tint={p.tint} className="adm-img-swatch" style={{ aspectRatio: '3/4' }} />
                  }
                </td>
                <td style={{ fontWeight: 500 }}>{p.name}</td>
                <td style={{ color: '#888' }}>{p.col}</td>
                <td>{p.price}</td>
                <td>
                  <div className="adm-actions">
                    <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => router.push(`/admin/produtos/${p.id}`)}>Editar</button>
                    <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => handleClone(p)}>Clonar</button>
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
