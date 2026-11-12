'use client';

import { useState } from 'react';
import PageWrapper from '@/components/PageWrapper';
import PdlImg from '@/components/PdlImg';
import ProductCard from '@/components/ProductCard';
import { AGE_GROUPS, type Collection } from '@/lib/data';

export default function ColecaoClient({ c, filters }: { c: Collection; filters: string[] }) {
  const [filter, setFilter] = useState('todas');

  const visible = filter === 'todas'
    ? c.products
    : c.products.filter(p => {
        const ageGroup = AGE_GROUPS.find(g => g.label === filter);
        if (ageGroup) return (p.sizes ?? []).some(s => ageGroup.sizes.includes(s));
        return p.type === filter;
      });

  return (
    <PageWrapper>
      <div className="pdl-coll-hero pdl-colpage-hero">
        <PdlImg tint={c.tint} imageUrl={c.imageUrl} label={`editorial · ${c.name.join(' ').toLowerCase()}`} style={{ position: 'absolute', inset: 0 }} />
        <div className="pdl-coll-hero-overlay">
          <div className="pdl-coll-hero-top">
            <div className="pdl-coll-hero-eyebrow">{c.eyebrow}</div>
            <div className="pdl-coll-hero-num">{c.count} {c.count === 1 ? 'peça' : 'peças'}</div>
          </div>
          <div className="pdl-coll-hero-bottom">
            <h1 className="pdl-coll-hero-title">
              {c.name[0]}
              <em>{c.name[1]}</em>
            </h1>
          </div>
        </div>
      </div>

      <div className="pdl-sidebar-layout">
        <aside className="pdl-sidebar">
          <div className="pdl-sidebar-title">{c.name[0]} <em>{c.name[1]}</em></div>
          <p className="pdl-sidebar-intro">{c.intro}</p>
          {filters.length > 1 && (
            <>
              <div className="pdl-sidebar-filter-label">filtrar por</div>
              <div className="pdl-sidebar-filters">
                {filters.map(f => (
                  <button key={f} type="button" className={`pdl-sidebar-filter ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
                ))}
              </div>
            </>
          )}
        </aside>
        <div>
          {filters.length > 1 && (
            <div className="pdl-coll-filters">
              {filters.map(f => (
                <button key={f} className={`pdl-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                  {f}
                </button>
              ))}
            </div>
          )}
          <div className="pdl-coll-info-row">
            <span>{visible.length} {visible.length === 1 ? 'peça' : 'peças'}{filter !== 'todas' ? ` · ${filter}` : ''}</span>
          </div>
          <div className="pdl-coll-grid">
            {visible.map(p => <ProductCard key={p.id} p={p} colLabel={c.name.join(' ')} />)}
          </div>
          {visible.length === 0 && (
            <div className="pdl-coll-empty">Nenhuma peça encontrada para este filtro.</div>
          )}
          <div className="pdl-coll-end">
            <div className="pdl-eyebrow">fim da coleção</div>
            <div className="pdl-lead">
              Cada peça é feita em pequeno lote.<br />
              Quando acaba, vira memória.
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
