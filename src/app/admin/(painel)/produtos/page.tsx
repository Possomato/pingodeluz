'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin, orderedSizes } from '@/context/AdminContext';
import PdlImg from '@/components/PdlImg';
import { formatCentavos } from '@/lib/money';
import type { Product } from '@/lib/data';

type Filter = 'todas' | 'publicadas' | 'rascunhos' | 'esgotadas';

const totalStock = (p: Product) => (p.sizes ?? []).reduce((n, s) => n + (p.stock?.[s] ?? 0), 0);

export default function AdminProdutosPage() {
  const { products, sizeTables, loading, deleteProduct, addProduct, setProductActive } = useAdmin();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('todas');
  const [menu, setMenu] = useState<string | null>(null);

  // Clicar fora fecha o menu "mais".
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menu]);

  const counts: Record<Filter, number> = {
    todas: products.length,
    publicadas: products.filter(p => p.active).length,
    rascunhos: products.filter(p => !p.active).length,
    esgotadas: products.filter(p => totalStock(p) === 0).length,
  };

  const q = search.trim().toLowerCase();
  const visible = products
    .filter(p => !q || p.name.toLowerCase().includes(q) || p.col.toLowerCase().includes(q))
    .filter(p =>
      filter === 'publicadas' ? p.active
        : filter === 'rascunhos' ? !p.active
          : filter === 'esgotadas' ? totalStock(p) === 0
            : true
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const handleDelete = (p: Product) => {
    if (!confirm(`Excluir "${p.name}" para sempre?\n\nSe ela já foi vendida, prefira tirar da loja: assim o histórico dos pedidos continua completo.`)) return;
    deleteProduct(p.id);
  };

  const handleClone = async (p: Product) => {
    const { id: _id, imageUrl: _img, imageUrls: _imgs, ...rest } = p;
    void _id; void _img; void _imgs;
    const newId = await addProduct({
      ...rest,
      name: `${p.name} (cópia)`,
      imageUrls: [],
      imageUrl: undefined,
      stock: {},
      active: false,
    });
    if (newId) router.push(`/admin/produtos/${newId}`);
  };

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <div>
          <h1 className="adm-page-title">Peças</h1>
          <p className="adm-page-sub" style={{ margin: 0 }}>Tudo o que a loja vende. Toque em uma peça para editar.</p>
        </div>
        <Link href="/admin/produtos/novo" className="adm-btn adm-btn-primary adm-btn-lg">+ Nova peça</Link>
      </div>

      <div className="adm-toolbar">
        <div className="adm-tabs" role="tablist" aria-label="Filtrar peças">
          {(['todas', 'publicadas', 'rascunhos', 'esgotadas'] as Filter[]).map(f => (
            <button key={f} role="tab" aria-selected={filter === f} className={`adm-tab${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)} <span className="n">{counts[f]}</span>
            </button>
          ))}
        </div>
        <div className="adm-search">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou coleção" aria-label="Buscar peça" />
        </div>
      </div>

      {loading ? (
        <p className="adm-muted">Carregando…</p>
      ) : products.length === 0 ? (
        <div className="adm-empty">
          <strong>Nenhuma peça cadastrada ainda</strong>
          Comece pela primeira: são quatro passos.
          <div style={{ marginTop: 16 }}><Link href="/admin/produtos/novo" className="adm-btn adm-btn-primary">+ Nova peça</Link></div>
        </div>
      ) : visible.length === 0 ? (
        <div className="adm-empty"><strong>Nada por aqui</strong>Nenhuma peça corresponde a esse filtro.</div>
      ) : (
        <div className="adm-prod-grid">
          {visible.map(p => {
            const stock = totalStock(p);
            const cover = p.imageUrls?.[0] ?? p.imageUrl;
            return (
              <div key={p.id} className={`adm-prod-card${p.active ? '' : ' draft'}`}>
                <Link href={`/admin/produtos/${p.id}`} aria-label={`Editar ${p.name}`}>
                  {cover
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={cover} alt="" className="adm-prod-thumb" />
                    : <PdlImg tint={p.tint} className="adm-prod-thumb" />}
                </Link>

                <div style={{ minWidth: 0 }}>
                  <div className="adm-prod-name">
                    <Link href={`/admin/produtos/${p.id}`}>{p.name}</Link>
                    <span className={`adm-pill ${p.active ? 'ok' : ''}`}>{p.active ? 'na loja' : 'rascunho'}</span>
                    {stock === 0 && <span className="adm-pill bad">esgotada</span>}
                  </div>
                  <div className="adm-prod-meta">
                    <strong>{formatCentavos(p.priceCentavos)}</strong>
                    {p.col ? ` · ${p.col}` : ''} · {stock} {stock === 1 ? 'unidade' : 'unidades'}
                  </div>
                  {(p.sizes ?? []).length === 0 ? (
                    <div className="adm-prod-meta">Sem tamanhos definidos</div>
                  ) : stock > 0 && (
                    // Peça esgotada já tem o selo; uma fileira de zeros só faz barulho.
                    <div className="adm-size-chips" aria-label="Estoque por tamanho">
                      {orderedSizes(p, sizeTables).map(s => {
                        const n = p.stock?.[s] ?? 0;
                        return <span key={s} className={`adm-size-chip${n === 0 ? ' zero' : ''}`}>{s}<b>{n}</b></span>;
                      })}
                    </div>
                  )}
                </div>

                <div className="adm-prod-actions">
                  <Link href={`/admin/produtos/${p.id}`} className="adm-btn adm-btn-secondary adm-btn-sm">Editar</Link>
                  <div className="adm-menu">
                    <button
                      className="adm-btn adm-btn-ghost adm-btn-sm"
                      style={{ width: '100%' }}
                      aria-haspopup="menu"
                      aria-expanded={menu === p.id}
                      onClick={e => { e.stopPropagation(); setMenu(menu === p.id ? null : p.id); }}
                    >
                      Mais ▾
                    </button>
                    {menu === p.id && (
                      <div className="adm-menu-list" role="menu">
                        <button role="menuitem" onClick={() => setProductActive(p.id, !p.active)}>
                          {p.active ? 'Tirar da loja' : 'Publicar na loja'}
                        </button>
                        <button role="menuitem" onClick={() => router.push('/admin/estoque')}>Ajustar estoque</button>
                        <button role="menuitem" onClick={() => handleClone(p)}>Duplicar</button>
                        <button role="menuitem" className="danger" onClick={() => handleDelete(p)}>Excluir</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
