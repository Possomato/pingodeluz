'use client';

import PageWrapper from '@/components/PageWrapper';
import ProductCard from '@/components/ProductCard';
import type { SearchResult } from '@/lib/search';

interface Props {
  query: string;
  results: SearchResult[];
}

export default function BuscaClient({ query, results }: Props) {
  return (
    <PageWrapper>
      <div className="pdl-busca-head">
        <div className="pdl-eyebrow">
          {query ? `${results.length} ${results.length === 1 ? 'peça encontrada' : 'peças encontradas'}` : 'busca'}
        </div>
        <h1>
          {query
            ? <><em>&ldquo;{query}&rdquo;</em></>
            : 'O que você procura?'}
        </h1>
      </div>

      {results.length > 0 ? (
        <div className="pdl-coll-grid pdl-busca-grid">
          {results.map(p => <ProductCard key={p.id} p={p} />)}
        </div>
      ) : (
        <div className="pdl-busca-empty">
          {query && <div className="pdl-eyebrow" style={{ marginBottom: 12 }}>sem resultados</div>}
          <p>Tente buscar por cor, tipo de peça ou tamanho.</p>
          <p style={{ marginTop: 6 }}>Ex: <em>vestido rosa</em>, <em>macacão 6 meses</em>, <em>verde</em></p>
        </div>
      )}
    </PageWrapper>
  );
}
