'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageWrapper from '@/components/PageWrapper';
import PdlImg from '@/components/PdlImg';
import ProductCard from '@/components/ProductCard';
import InstagramFeed from '@/components/InstagramFeed';
import { Sparkle, IconArrowRight } from '@/components/Icons';
import { calcInstallments, isSizeAvailable, isSoldOut } from '@/lib/data';
import type { Product, Collection, HomepageSection, HomepageSectionId, Testimonial, PaymentConfig } from '@/lib/data';
import { formatCentavos } from '@/lib/money';
import { pixPriceCentavos, type ShippingConfig } from '@/lib/pricing';

interface Props {
  hpConfig: Record<HomepageSectionId, HomepageSection>;
  products: Product[];
  /** Peça que abre a home (a mais vendida com estoque). */
  featured: Product | null;
  paymentConfig: PaymentConfig;
  shipping: ShippingConfig;
  collections: Record<string, Collection>;
  testimonials: Testimonial[];
}

export default function HomeClient({ hpConfig, products, featured, paymentConfig, shipping, collections, testimonials }: Props) {
  const [testIdx, setTestIdx] = useState(0);
  const collectionList = Object.values(collections);

  // A peça de abertura não se repete na vitrine logo abaixo.
  const others = featured ? products.filter(p => p.id !== featured.id) : products;
  const featuredSizes = featured ? (featured.sizes ?? []).filter(s => isSizeAvailable(featured, s)) : [];
  const featuredInstallments = featured ? calcInstallments(featured.priceCentavos, paymentConfig) : null;
  const featuredParts = featured?.nameParts ?? [featured?.name ?? '', ''];
  // Só a primeira frase da descrição: na abertura, menos texto diz mais.
  const featuredLead = featured?.desc?.split(/(?<=[.!?])\s+/)[0]?.trim();

  return (
    <PageWrapper>
      {/* Abertura: uma peça só, grande, com tudo o que a pessoa precisa
          para decidir — foto, nome, preço e um único botão. Nenhum selo:
          o tamanho e a posição já dizem que é a peça da vez. */}
      {featured ? (
        <Link href={`/produto/${featured.id}`} className="pdl-hero" aria-label={`${featured.name}, ${formatCentavos(featured.priceCentavos)}`}>
          <div className="pdl-hero-media">
            <PdlImg tint={featured.tint} imageUrl={featured.imageUrl} label={featured.label} />
          </div>
          <div className="pdl-hero-body">
            <div className="pdl-hero-eyebrow">olá, mãe</div>
            <h1 className="pdl-hero-title">{featuredParts[0]} <em>{featuredParts[1]}</em></h1>
            {featuredLead && <p className="pdl-hero-lead">{featuredLead}</p>}
            <div className="pdl-hero-rule" aria-hidden><Sparkle size={10} color="var(--terra)" /></div>
            <div className="pdl-hero-price">
              <span className="now">{formatCentavos(featured.priceCentavos)}</span>
              {featuredInstallments && <span className="inst">ou {featuredInstallments}</span>}
            </div>
            {shipping.pixDiscountPercent > 0 && (
              <div className="pdl-pix-badge">
                <strong>{formatCentavos(pixPriceCentavos(featured.priceCentavos, shipping))}</strong> no Pix
                <span>{shipping.pixDiscountPercent}% de desconto</span>
              </div>
            )}
            <div className="pdl-hero-meta">
              <span>{featured.col}</span>
              {featuredSizes.length > 0 && <span>tamanhos {featuredSizes.join(' · ')}</span>}
            </div>
            <span className="pdl-hero-cta">
              {isSoldOut(featured) ? 'ver a peça' : 'quero este'} <IconArrowRight size={14} />
            </span>
          </div>
        </Link>
      ) : (
        <div className="pdl-welcome">
          <div className="eyebrow">olá, mãe</div>
          <h1>Roupas feitas com <em>carinho</em></h1>
          <p>Novas peças chegam em breve.</p>
        </div>
      )}

      {hpConfig.queridos.visible && others.length > 0 && (
        <section className="pdl-section" aria-labelledby="queridos">
          <div className="pdl-section-head">
            <h2 id="queridos">Mais <em>queridos</em></h2>
            <Link href="/genero/meninas" className="more">ver todas <IconArrowRight size={10} /></Link>
          </div>
          <div className="pdl-products">
            {others.map(p => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {hpConfig.manifesto.visible && (
        <div className="pdl-manifesto">
          <div className="pdl-eyebrow" style={{ marginBottom: 14 }}>nosso manifesto</div>
          <div className="quote">
            Cada criança é um pingo<Sparkle size={11} color="var(--terra)" style={{ verticalAlign: 'super', margin: '0 3px' }} /> de luz —
            e a roupa que veste deve ser tão leve, tão honesta e tão acolhedora quanto a infância dela.
          </div>
          <div className="sig">— atelier pingo de luz · desde 2019</div>
        </div>
      )}

      {hpConfig.colecoes.visible && collectionList.length > 0 && (
        <section className="pdl-section" id="colecoes" aria-labelledby="colecoes-title" style={{ scrollMarginTop: 'var(--header-h)' }}>
          <div className="pdl-section-head">
            <h2 id="colecoes-title">Coleções <em>conceituais</em></h2>
          </div>
          <div className="pdl-collections">
            {collectionList.map(col => (
              <Link key={col.id} href={`/colecao/${col.id}`} className="pdl-col-card">
                <PdlImg tint={col.tint} imageUrl={col.imageUrl} label={`lookbook · ${col.name.join(' ').toLowerCase()}`} />
                <div className="pdl-col-overlay">
                  {col.eyebrow ? <span className="pdl-col-tag">{col.eyebrow}</span> : <span />}
                  <div>
                    <div className="pdl-col-name">{col.name[0]}<em>{col.name[1]}</em></div>
                    {col.count > 0 && <div className="pdl-col-meta">{col.count} {col.count === 1 ? 'peça' : 'peças'} · coleção atual</div>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {hpConfig.fases.visible && (
        <section className="pdl-section" aria-labelledby="fases">
          <div className="pdl-section-head">
            <h2 id="fases">Para cada <em>fase</em></h2>
          </div>
          <div className="pdl-ages">
            <div className="pdl-age">
              <div>
                <div className="pdl-age-label">recém-chegados</div>
                <div className="pdl-age-num">1m<em>–</em>9m</div>
              </div>
              <div className="pdl-age-desc">primeiros passos, primeiros vestidinhos</div>
            </div>
            <div className="pdl-age">
              <div>
                <div className="pdl-age-label">descobridores</div>
                <div className="pdl-age-num">1<em>–</em>4</div>
              </div>
              <div className="pdl-age-desc">imaginação solta, joelhos sujos</div>
            </div>
            <div className="pdl-age">
              <div>
                <div className="pdl-age-label">aventureiros</div>
                <div className="pdl-age-num">6<em>–</em>14</div>
              </div>
              <div className="pdl-age-desc">já escolhem sozinhos o que vestir</div>
            </div>
          </div>
        </section>
      )}

      {hpConfig.depoimentos.visible && testimonials.length > 0 && (
        <section className="pdl-section" aria-labelledby="depoimentos">
          <div className="pdl-section-head">
            <h2 id="depoimentos">O que dizem as <em>mães</em></h2>
          </div>
          <div className="pdl-test">
            <div className="pdl-test-card" key={testimonials[testIdx]?.id}>
              <div className="pdl-test-quote">{testimonials[testIdx]?.quote}</div>
              <div className="pdl-test-author">
                <div className="pdl-test-avatar" aria-hidden>{testimonials[testIdx]?.author?.charAt(0)}</div>
                <div>
                  <div style={{ color: 'var(--ink)', fontWeight: 500 }}>{testimonials[testIdx]?.author}</div>
                  <div style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic' }}>{testimonials[testIdx]?.role}</div>
                </div>
              </div>
            </div>
            {testimonials.length > 1 && (
              <div className="pdl-test-dots">
                {testimonials.map((tst, i) => (
                  <button
                    key={tst.id}
                    type="button"
                    className={`pdl-test-dot ${i === testIdx ? 'active' : ''}`}
                    onClick={() => setTestIdx(i)}
                    aria-label={`Depoimento ${i + 1} de ${testimonials.length}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {false && hpConfig.instagram.visible && (
        <div className="pdl-section" style={{ paddingBottom: 0 }}>
          <div className="pdl-section-head">
            <h2>No <em>instagram</em></h2>
            <a
              href="https://instagram.com/pingodeluz"
              target="_blank"
              rel="noopener noreferrer"
              className="more"
            >
              @pingodeluz
            </a>
          </div>
          <InstagramFeed />
        </div>
      )}
    </PageWrapper>
  );
}
