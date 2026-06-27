'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PdlHeader from '@/components/PdlHeader';
import PdlDrawer from '@/components/PdlDrawer';
import PdlFooter from '@/components/PdlFooter';
import PdlImg from '@/components/PdlImg';
import InstagramFeed from '@/components/InstagramFeed';
import { Sparkle, IconArrowRight } from '@/components/Icons';
import { TESTIMONIALS, type Product, type Collection, type HomepageSection, type HomepageSectionId } from '@/lib/data';

interface Props {
  hpConfig: Record<HomepageSectionId, HomepageSection>;
  products: Product[];
  collections: Record<string, Collection>;
}

export default function HomeClient({ hpConfig, products, collections }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [testIdx, setTestIdx] = useState(0);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="pdl-app">
      <PdlHeader scrolled={scrolled} onMenu={() => setMenuOpen(true)} />

      <div className="pdl-welcome">
        <div className="eyebrow">olá, mãe</div>
        <h1>Para quem você procura <em>hoje?</em></h1>
        <p>Escolha o universo dos pequenos e a gente cuida do resto.</p>
      </div>
      <div className="pdl-genders">
        {hpConfig.meninas.visible && (
          <div className="pdl-gender-card" onClick={() => router.push('/genero/meninas')}>
            <PdlImg tint="rose" imageUrl={hpConfig.meninas.imageUrls[0]} label="meninas · 1m–14" />
            <div className="pdl-gender-overlay">
              <span className="top">1m–14</span>
              <div className="bottom">
                <div className="label">Para<em>meninas</em></div>
                <div className="meta">vestidos, conjuntos e mais</div>
                <span className="arrow">explorar <IconArrowRight size={11} /></span>
              </div>
            </div>
          </div>
        )}
        {hpConfig.meninos.visible && (
          <div className="pdl-gender-card" onClick={() => router.push('/genero/meninos')}>
            <PdlImg tint="ochre" imageUrl={hpConfig.meninos.imageUrls[0]} label="meninos · 1m–14" />
            <div className="pdl-gender-overlay">
              <span className="top">1m–14</span>
              <div className="bottom">
                <div className="label">Para<em>meninos</em></div>
                <div className="meta">macacões, bermudas e mais</div>
                <span className="arrow">explorar <IconArrowRight size={11} /></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {hpConfig.queridos.visible && (
        <div className="pdl-section">
          <div className="pdl-section-head">
            <h2>Mais <em>queridos</em></h2>
            <span className="more">ver todos</span>
          </div>
          <div className="pdl-products">
            {products.map(p => (
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
        </div>
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

      {hpConfig.colecoes.visible && (
        <div className="pdl-section">
          <div className="pdl-section-head">
            <h2>Coleções <em>conceituais</em></h2>
            <span className="more">ver todas <IconArrowRight size={10} /></span>
          </div>
          <div className="pdl-collections">
            {Object.values(collections).map(col => (
              <div key={col.id} className="pdl-col-card" onClick={() => router.push(`/colecao/${col.id}`)}>
                <PdlImg tint={col.tint} imageUrl={col.imageUrl} label={`lookbook · ${col.name.join(' ').toLowerCase()}`} />
                <div className="pdl-col-overlay">
                  {col.eyebrow && <span className="pdl-col-tag">{col.eyebrow}</span>}
                  <div>
                    <div className="pdl-col-name">{col.name[0]}<em>{col.name[1]}</em></div>
                    {col.count > 0 && <div className="pdl-col-meta">— {col.count} peças · coleção atual</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hpConfig.fases.visible && (
        <div className="pdl-section">
          <div className="pdl-section-head">
            <h2>Para cada <em>fase</em></h2>
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
        </div>
      )}

      {hpConfig.depoimentos.visible && (
        <div className="pdl-section">
          <div className="pdl-section-head">
            <h2>O que dizem as <em>mães</em></h2>
          </div>
          <div className="pdl-test">
            <div className="pdl-test-card">
              <div className="pdl-test-quote">{TESTIMONIALS[testIdx].q}</div>
              <div className="pdl-test-author">
                <div className="pdl-test-avatar" />
                <div>
                  <div style={{ color: 'var(--ink)', fontWeight: 500 }}>{TESTIMONIALS[testIdx].name}</div>
                  <div style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic' }}>{TESTIMONIALS[testIdx].role}</div>
                </div>
              </div>
            </div>
            <div className="pdl-test-dots">
              {TESTIMONIALS.map((_, i) => (
                <span key={i} className={`pdl-test-dot ${i === testIdx ? 'active' : ''}`} onClick={() => setTestIdx(i)} />
              ))}
            </div>
          </div>
        </div>
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
              style={{ textDecoration: 'none' }}
            >
              @pingodeluz
            </a>
          </div>
          <InstagramFeed />
        </div>
      )}

      <PdlFooter />
      <PdlDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
