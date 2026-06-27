'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PdlHeader from '@/components/PdlHeader';
import PdlDrawer from '@/components/PdlDrawer';
import PdlFooter from '@/components/PdlFooter';
import PdlImg from '@/components/PdlImg';
import { IconChevronDown } from '@/components/Icons';
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
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [filter, setFilter] = useState('todas');

  // Age group filters — only show groups that have at least one product
  const activeAgeGroups = AGE_GROUPS
    .filter(ag => products.some(p => (p.sizes ?? []).some(s => ag.sizes.includes(s))))
    .map(ag => ag.label);

  // Collection chips — unique collection names from the products
  const colChips = Array.from(new Set(products.map(p => p.col).filter(Boolean)));

  const filters = ['todas', ...activeAgeGroups, ...colChips];

  // Apply active filter
  const visibleProducts = filter === 'todas'
    ? products
    : (() => {
        const ageGroup = AGE_GROUPS.find(ag => ag.label === filter);
        if (ageGroup) return products.filter(p => (p.sizes ?? []).some(s => ageGroup.sizes.includes(s)));
        return products.filter(p => p.col === filter);
      })();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 220);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="pdl-app">
      <PdlHeader scrolled={scrolled} onMenu={() => setMenuOpen(true)} />

      <div className="pdl-coll-hero pdl-genpage-hero">
        <PdlImg tint={g.tint} imageUrl={heroImageUrl} style={{ position: 'absolute', inset: 0 }} />
        <div className="pdl-coll-hero-overlay">
          <div className="pdl-coll-hero-top">
            <div className="pdl-coll-hero-eyebrow">{g.eyebrow}</div>
            <div className="pdl-coll-hero-num">{products.length} peças</div>
          </div>
          <div className="pdl-coll-hero-bottom">
            <div className="pdl-coll-hero-title">
              {g.label[0]}
              <em>{g.label[1]}</em>
            </div>
          </div>
        </div>
      </div>

      <div className="pdl-sidebar-layout">
        <div className="pdl-sidebar">
          <div className="pdl-sidebar-title">{g.label[0]} <em>{g.label[1]}</em></div>
          <div className="pdl-sidebar-intro">{g.intro}</div>
          <div className="pdl-sidebar-filter-label">filtrar por</div>
          <div className="pdl-sidebar-filters">
            {filters.map(f => (
              <div
                key={f}
                className={`pdl-sidebar-filter ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </div>
            ))}
          </div>
        </div>

        <div>
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
          <div className="pdl-coll-info-row">
            <span>{visibleProducts.length} peças</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              ordenar <IconChevronDown size={12} />
            </span>
          </div>
          <div className="pdl-coll-grid">
            {visibleProducts.map(p => (
              <div key={p.id} className="pdl-prod" onClick={() => router.push(`/produto/${p.id}`)}>
                <PdlImg tint={p.tint} imageUrl={p.imageUrl} label={p.label} />
                <div className="pdl-prod-info">
                  <div className="pdl-prod-name">{p.name}</div>
                  <div className="pdl-prod-meta">
                    <span className="pdl-prod-col">{p.col}</span>
                    <span className="pdl-prod-price">{p.price?.startsWith('R$') ? p.price : `R$ ${p.price}`}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {visibleProducts.length === 0 && (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--editorial)', fontStyle: 'italic' }}>
              Nenhuma peça encontrada para este filtro.
            </div>
          )}

          <div style={{ padding: '36px 0', textAlign: 'center' }}>
            <div className="pdl-eyebrow" style={{ marginBottom: 10 }}>conheça também</div>
            <div
              style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 16, color: 'var(--ink-soft)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 4 }}
              onClick={() => router.push(`/colecao/${g.collections[0]}`)}
            >
              A coleção
            </div>
          </div>
        </div>
      </div>

      <PdlFooter />
      <PdlDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
