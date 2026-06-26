'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PdlHeader from '@/components/PdlHeader';
import PdlDrawer from '@/components/PdlDrawer';
import PdlFooter from '@/components/PdlFooter';
import PdlImg from '@/components/PdlImg';
import { IconChevronLeft, IconSearch, IconBag, IconChevronDown } from '@/components/Icons';
import type { GenderData, Collection } from '@/lib/data';
import { useCart } from '@/context/CartContext';

type ProductWithMeta = {
  id: string;
  name: string;
  tint: string;
  label: string;
  price: string;
  imageUrl?: string;
  colName: string;
  colId: string;
};

export default function GeneroClient({
  g,
  collections,
}: {
  g: GenderData;
  collections: Record<string, Collection>;
}) {
  const router = useRouter();
  const { cartCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [filter, setFilter] = useState('todas');

  const products: ProductWithMeta[] = g.collections.flatMap(cid => {
    const c = collections[cid];
    if (!c) return [];
    return c.products.map(p => ({ ...p, colName: c.name.join(' '), colId: cid }));
  });
  const colChips = g.collections.map(cid => collections[cid]?.name.join(' ')).filter(Boolean) as string[];
  const filters = ['todas', 'bebê · 1m–9m', 'pequenos · 1–4', 'maiores · 6–14', ...colChips];

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 220);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="pdl-app">
      <PdlHeader scrolled={scrolled} onMenu={() => setMenuOpen(true)} />
      <div className={`pdl-back-bar ${scrolled ? 'solid' : 'over-hero'}`} style={{ marginBottom: -54 }}>
        <button onClick={() => router.back()} aria-label="Voltar"><IconChevronLeft size={18} /></button>
        <span className="pdl-back-title">{g.label.join(' ')}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button aria-label="Buscar"><IconSearch size={16} /></button>
          <button onClick={() => router.push('/carrinho')} aria-label="Sacola" style={{ position: 'relative' }}>
            <IconBag size={16} />
            {cartCount > 0 && <span className="pdl-bag-count">{cartCount}</span>}
          </button>
        </div>
      </div>

      <div className="pdl-coll-hero pdl-genpage-hero" style={{ height: 280 }}>
        <PdlImg tint={g.tint} label={`${g.label.join(' ').toLowerCase()} · todos os produtos`} style={{ position: 'absolute', inset: 0 }} />
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
              <div key={f} className={`pdl-sidebar-filter ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</div>
            ))}
          </div>
        </div>
        <div>
          <div className="pdl-coll-filters">
            {filters.map(f => (
              <button key={f} className={`pdl-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
          <div className="pdl-coll-info-row">
            <span>{products.length} peças</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              ordenar <IconChevronDown size={12} />
            </span>
          </div>
          <div className="pdl-coll-grid">
            {products.map(p => (
              <div key={p.id} className="pdl-prod" onClick={() => router.push(`/produto/${p.id}`)}>
                <PdlImg tint={p.tint} imageUrl={p.imageUrl} label={p.label} />
                <div className="pdl-prod-info">
                  <div className="pdl-prod-name">{p.name}</div>
                  <div className="pdl-prod-meta">
                    <span className="pdl-prod-col">{p.colName}</span>
                    <span className="pdl-prod-price">{p.price?.startsWith('R$') ? p.price : `R$ ${p.price}`}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '36px 0', textAlign: 'center' }}>
            <div className="pdl-eyebrow" style={{ marginBottom: 10 }}>conheça também</div>
            <div
              style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 16, color: 'var(--ink-soft)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 4 }}
              onClick={() => router.push(`/colecao/${g.collections[0]}`)}
            >
              A coleção {collections[g.collections[0]]?.name.join(' ')}
            </div>
          </div>
        </div>
      </div>

      <PdlFooter />
      <PdlDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
