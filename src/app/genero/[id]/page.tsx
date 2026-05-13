'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PdlDrawer from '@/components/PdlDrawer';
import PdlFooter from '@/components/PdlFooter';
import PdlImg from '@/components/PdlImg';
import { IconChevronLeft, IconSearch, IconBag, IconChevronDown } from '@/components/Icons';
import { GENDER_DATA, COLLECTIONS } from '@/lib/data';
import { useCart } from '@/context/CartContext';

export default function GeneroPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { cartCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [filter, setFilter] = useState('todas');

  const g = GENDER_DATA[id] || GENDER_DATA.meninas;
  const products = g.collections.flatMap(cid => {
    const c = COLLECTIONS[cid];
    return c.products.map(p => ({ ...p, colName: c.name.join(' '), colId: cid }));
  });
  const colChips = g.collections.map(cid => COLLECTIONS[cid].name.join(' '));
  const filters = ['todas', '0–2 anos', '3–6 anos', '7–12 anos', ...colChips, 'vestidos', 'conjuntos', 'sob encomenda'];

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 220);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="pdl-app">
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

      <div className="pdl-coll-hero" style={{ height: 280 }}>
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

      <div className="pdl-coll-intro">
        <p>{g.intro}</p>
      </div>

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
            <PdlImg tint={p.tint} label={p.label} />
            <div className="pdl-prod-name">{p.name}</div>
            <div className="pdl-prod-meta">
              <span className="pdl-prod-col">{p.colName}</span>
              <span className="pdl-prod-price">{p.price}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '36px 22px', textAlign: 'center' }}>
        <div className="pdl-eyebrow" style={{ marginBottom: 10 }}>conheça também</div>
        <div
          style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 16, color: 'var(--ink-soft)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 4 }}
          onClick={() => router.push(`/colecao/${g.collections[0]}`)}
        >
          A coleção {COLLECTIONS[g.collections[0]].name.join(' ')}
        </div>
      </div>

      <PdlFooter />
      <PdlDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
