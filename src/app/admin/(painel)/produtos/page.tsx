'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import PdlImg from '@/components/PdlImg';
import { formatCentavos } from '@/lib/money';
import { isSoldOut } from '@/lib/data';

export default function AdminProdutosPage() {
  const { products, loading, deleteProduct, addProduct, setProductActive } = useAdmin();
  const router = useRouter();
  const [filter, setFilter] = useState('');

  const visible = products.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    p.col.toLowerCase().includes(filter.toLowerCase())
  );

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Excluir "${name}" definitivamente?\n\nSe a peça já foi vendida, prefira despublicar — assim o histórico de pedidos continua íntegro.`)) return;
    deleteProduct(id);
  };

  const handleClone = async (p: (typeof products)[0]) => {
    const { id: _id, imageUrl: _img, imageUrls: _imgs, ...rest } = p;
    const newId = await addProduct({
      ...rest,
      name: `${p.name} (cópia)`,
      imageUrls: [],
      imageUrl: undefined,
      active: false,
    });
    if (newId) router.push(`/admin/produtos/${newId}`);
  };

  const totalStock = (stock: Record<string, number> | undefined) =>
    Object.values(stock ?? {}).reduce((s, q) => s + q, 0);

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Produtos</h1>
        <button className="adm-btn adm-btn-primary" onClick={() => router.push('/admin/produtos/novo')}>
          + Adicionar produto
        </button>
      </div>

      <div className="adm-field" style={{ maxWidth: 320, marginBottom: 16 }}>
        <label htmlFor="filtro">Buscar</label>
        <input
          id="filtro"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="nome ou coleção"
        />
      </div>

      {loading ? (
        <p style={{ color: '#888' }}>Carregando…</p>
      ) : visible.length === 0 ? (
        <p style={{ color: '#888' }}>
          {products.length === 0
            ? 'Nenhum produto cadastrado ainda.'
            : 'Nenhum produto corresponde à busca.'}
        </p>
      ) : (
        <table className="adm-table">
          <thead>
            <tr>
              <th>Foto</th>
              <th>Nome</th>
              <th>Coleção</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th>Situação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const stock = totalStock(p.stock);
              return (
                <tr key={p.id} style={p.active ? undefined : { opacity: 0.55 }}>
                  <td>
                    {(p.imageUrls?.[0] ?? p.imageUrl)
                      ? <img src={p.imageUrls?.[0] ?? p.imageUrl} alt={p.name} width={80} height={107} className="adm-img-preview" />
                      : <PdlImg tint={p.tint} className="adm-img-swatch" style={{ aspectRatio: '3/4' }} />
                    }
                  </td>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td style={{ color: '#888' }}>{p.col}</td>
                  <td>{formatCentavos(p.priceCentavos)}</td>
                  <td style={isSoldOut(p) ? { color: '#c0392b' } : undefined}>
                    {stock === 0 ? 'esgotado' : `${stock} un.`}
                  </td>
                  <td>{p.active ? 'publicado' : 'rascunho'}</td>
                  <td>
                    <div className="adm-actions">
                      <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => router.push(`/admin/produtos/${p.id}`)}>Editar</button>
                      <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => setProductActive(p.id, !p.active)}>
                        {p.active ? 'Despublicar' : 'Publicar'}
                      </button>
                      <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => handleClone(p)}>Clonar</button>
                      <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => handleDelete(p.id, p.name)}>Excluir</button>
                    </div>
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
