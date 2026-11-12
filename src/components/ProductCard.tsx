'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import PdlImg from '@/components/PdlImg';
import { formatCentavos } from '@/lib/money';

export interface ProductCardData {
  id: string;
  name: string;
  col: string;
  priceCentavos: number;
  tint: string;
  imageUrl?: string;
  label?: string;
  /** Tamanho → quantidade. Quando presente e tudo zero, a peça está esgotada. */
  stock?: Record<string, number>;
}

/**
 * Card de produto usado em toda a loja (home, coleção, gênero, busca,
 * favoritos, "combina com"). É um link de verdade: abre em nova aba,
 * prefetch do Next e leitor de tela funcionam sem código extra.
 */
export default function ProductCard({
  p,
  colLabel,
  children,
}: {
  p: ProductCardData;
  /** Sobrescreve o nome da coleção exibido. */
  colLabel?: string;
  /** Elementos sobrepostos à foto (ex.: botão de favorito). */
  children?: ReactNode;
}) {
  const soldOut = !!p.stock && !Object.values(p.stock).some((q) => q > 0);

  return (
    <Link href={`/produto/${p.id}`} className="pdl-prod" aria-label={p.name}>
      <div className="pdl-prod-media">
        {soldOut && <span className="pdl-prod-badge pdl-prod-badge--out">esgotado</span>}
        <PdlImg tint={p.tint} imageUrl={p.imageUrl} label={p.label} />
        {children}
      </div>
      <div className="pdl-prod-info">
        <div className="pdl-prod-name">{p.name}</div>
        <div className="pdl-prod-meta">
          <span className="pdl-prod-col">{colLabel ?? p.col}</span>
          <span className="pdl-prod-price">{formatCentavos(p.priceCentavos)}</span>
        </div>
      </div>
    </Link>
  );
}
