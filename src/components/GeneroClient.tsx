'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageWrapper from '@/components/PageWrapper';
import PdlImg from '@/components/PdlImg';
import ProductCard from '@/components/ProductCard';
import { AGE_GROUPS, type GenderData, type Product } from '@/lib/data';

export default function GeneroClient({
  g,
  products,
  heroImageUrl,
}: {
  g: GenderData;
  products: Product[];
  heroImageUrl?: string;
}) {
  const [filter, setFilter] = useState('todas');

  // Filtros de idade — só os grupos que têm pelo menos uma peça.
  const activeAgeGroups = AGE_GROUPS
    .filter(ag => products.some(p => (p.sizes ?? []).some(s => ag.sizes.includes(s))))
    .map(ag => ag.label);

  // Chips de coleção — nomes únicos entre os produtos.
  const colChips = Array.from(new Set(products.map(p => p.col).filter(Boolean)));

  // Link "conheça também": a coleção do primeiro produto listado.
  const featuredCollectionId = products.find(p => p.collectionId)?.collectionId;

  const filters = ['todas', ...activeAgeGroups, ...colChips];

  const visibleProducts = filter === 'todas'
    ? products
    : (() => {
        const ageGroup = AGE_GROUPS.find(ag => ag.label === filter);
        if (ageGroup) return products.filter(p => (p.sizes ?? []).some(s => ageGroup.sizes.includes(s)));
        return products.filter(p => p.col === filter);
      })();

  return (
    <PageWrapper>
      <div className="pdl-coll-hero pdl-genpage-hero">
        <PdlImg tint={g.tint} imageUrl={heroImageUrl} style={{ position: 'absolute', inset: 0 }} />
        <div className="pdl-coll-hero-overlay">
          <div className="pdl-coll-hero-top">
            <div className="pdl-coll-hero-eyebrow">{g.eyebrow}</div>
            <div className="pdl-coll-hero-num">{products.length} {products.length === 1 ? 'peça' : 'peças'}</div>
          </div>
          <div className="pdl-coll-hero-bottom">
            <h1 className="pdl-coll-hero-title">
              {g.label[0]}
              <em>{g.label[1]}</em>
            </h1>
          </div>
        </div>
      </div>

      <div className="pdl-sidebar-layout">
        <aside className="pdl-sidebar">
          <div className="pdl-sidebar-title">{g.label[0]} <em>{g.label[1]}</em></div>
          <p className="pdl-sidebar-intro">{g.intro}</p>
          {filters.length > 1 && (
            <>
              <div className="pdl-sidebar-filter-label">filtrar por</div>
              <div className="pdl-sidebar-filters">
                {filters.map(f => (
                  <button
                    key={f}
                    type="button"
                    className={`pdl-sidebar-filter ${filter === f ? 'active' : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>

        <div>
          {filters.length > 1 && (
            <div className="pdl-coll-filters">
              {filters.map(f => (
                <button
                  key={f}
                  className={`pdl-chip ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
          <div className="pdl-coll-info-row">
            <span>{visibleProducts.length} {visibleProducts.length === 1 ? 'peça' : 'peças'}{filter !== 'todas' ? ` · ${filter}` : ''}</span>
          </div>
          <div className="pdl-coll-grid">
            {visibleProducts.map(p => <ProductCard key={p.id} p={p} />)}
          </div>

          {visibleProducts.length === 0 && (
            <div className="pdl-coll-empty">
              {products.length === 0 ? 'Novas peças chegam em breve.' : 'Nenhuma peça encontrada para este filtro.'}
            </div>
          )}

          {featuredCollectionId && (
            <div className="pdl-coll-end">
              <div className="pdl-eyebrow">conheça também</div>
              <Link href={`/colecao/${featuredCollectionId}`} className="pdl-link" style={{ fontSize: 16, display: 'inline-block', marginTop: 10 }}>
                a coleção completa
              </Link>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
