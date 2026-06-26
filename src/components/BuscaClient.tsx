'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PdlHeader from '@/components/PdlHeader';
import PdlDrawer from '@/components/PdlDrawer';
import PdlFooter from '@/components/PdlFooter';
import PdlImg from '@/components/PdlImg';
import type { SearchResult } from '@/lib/search';

interface Props {
  query: string;
  results: SearchResult[];
}

export default function BuscaClient({ query, results }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="pdl-app">
      <PdlHeader scrolled={scrolled} onMenu={() => setMenuOpen(true)} />

      <div className="pdl-busca-head">
        <div className="pdl-eyebrow">{results.length} {results.length === 1 ? 'peça encontrada' : 'peças encontradas'}</div>
        <h1>
          {query
            ? <><em>"{query}"</em></>
            : 'O que você procura?'}
        </h1>
      </div>

      {results.length > 0 ? (
        <div className="pdl-coll-grid pdl-busca-grid">
          {results.map(p => (
            <div key={p.id} className="pdl-prod" onClick={() => router.push(`/produto/${p.id}`)}>
              <PdlImg tint={p.tint} imageUrl={p.imageUrl} label={p.name} />
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
      ) : query ? (
        <div className="pdl-busca-empty">
          <div className="pdl-eyebrow" style={{ marginBottom: 12 }}>sem resultados</div>
          <p>Tente buscar por cor, tipo de peça ou tamanho.</p>
          <p style={{ marginTop: 6 }}>Ex: <em>vestido rosa</em>, <em>macacão 6 meses</em>, <em>verde</em></p>
        </div>
      ) : null}

      <PdlFooter />
      <PdlDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
