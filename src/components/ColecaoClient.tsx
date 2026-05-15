'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PdlDrawer from '@/components/PdlDrawer';
import PdlFooter from '@/components/PdlFooter';
import PdlImg from '@/components/PdlImg';
import { IconChevronLeft, IconSearch, IconBag, IconChevronDown } from '@/components/Icons';
import type { Collection } from '@/lib/data';
import { useCart } from '@/context/CartContext';

export default function ColecaoClient({ c, filters }: { c: Collection; filters: string[] }) {
  const router = useRouter();
  const { cartCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [filter, setFilter] = useState('todas');

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 280);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="pdl-app">
      <div className={`pdl-back-bar ${scrolled ? 'solid' : 'over-hero'}`} style={{ marginBottom: -54 }}>
        <button onClick={() => router.back()} aria-label="Voltar"><IconChevronLeft size={18} /></button>
        <span className="pdl-back-title">{c.name.join(' ')}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button aria-label="Buscar"><IconSearch size={16} /></button>
          <button onClick={() => router.push('/carrinho')} aria-label="Sacola" style={{ position: 'relative' }}>
            <IconBag size={16} />
            {cartCount > 0 && <span className="pdl-bag-count">{cartCount}</span>}
          </button>
        </div>
      </div>

      <div className="pdl-coll-hero pdl-colpage-hero">
        <PdlImg tint={c.tint} label={`editorial · ${c.name.join(' ').toLowerCase()}`} style={{ position: 'absolute', inset: 0 }} />
        <div className="pdl-coll-hero-overlay">
          <div className="pdl-coll-hero-top">
            <div className="pdl-coll-hero-eyebrow">{c.eyebrow}</div>
            <div className="pdl-coll-hero-num">N.º 12</div>
          </div>
          <div className="pdl-coll-hero-bottom">
            <div className="pdl-coll-hero-title">
              {c.name[0]}
              <em>{c.name[1]}</em>
            </div>
          </div>
        </div>
      </div>

      <div className="pdl-sidebar-layout">
        <div className="pdl-sidebar">
          <div className="pdl-sidebar-title">{c.name[0]} <em>{c.name[1]}</em></div>
          <div className="pdl-sidebar-intro">{c.intro}</div>
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
            <span>{c.count} peças · {c.name.join(' ').toLowerCase()}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              ordenar <IconChevronDown size={12} />
            </span>
          </div>
          <div className="pdl-coll-grid">
            {c.products.map(p => (
              <div key={p.id} className="pdl-prod" onClick={() => router.push(`/produto/${p.id}`)}>
                <PdlImg tint={p.tint} label={p.label} />
                <div className="pdl-prod-name">{p.name}</div>
                <div className="pdl-prod-meta">
                  <span className="pdl-prod-col">{c.name.join(' ')}</span>
                  <span className="pdl-prod-price">{p.price}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div className="pdl-eyebrow" style={{ marginBottom: 10 }}>fim da coleção</div>
            <div style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 16, color: 'var(--ink-soft)' }}>
              Cada peça é feita em pequeno lote.<br />
              Quando acaba, vira memória.
            </div>
          </div>
        </div>
      </div>

      <PdlFooter />
      <PdlDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
