'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PdlHeader from '@/components/PdlHeader';
import PdlDrawer from '@/components/PdlDrawer';
import PdlFooter from '@/components/PdlFooter';
import PdlImg from '@/components/PdlImg';
import { Sparkle, IconArrowRight } from '@/components/Icons';
import { HOME_PRODUCTS, TESTIMONIALS, fetchCatalog, fetchHomepageConfig, DEFAULT_HOMEPAGE_CONFIG, type HomepageSectionId } from '@/lib/data';

export default function HomePage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [testIdx, setTestIdx] = useState(0);
  const [hpConfig, setHpConfig] = useState(DEFAULT_HOMEPAGE_CONFIG);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    fetchCatalog().catch(() => {});
    fetchHomepageConfig().then(cfg => setHpConfig(cfg)).catch(() => {});
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
            <PdlImg tint="rose" imageUrl={hpConfig.meninas.imageUrls[0]} label="meninas · 1–12 anos" />
            <div className="pdl-gender-overlay">
              <span className="top">1–12 anos</span>
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
            <PdlImg tint="ochre" imageUrl={hpConfig.meninos.imageUrls[0]} label="meninos · 1–12 anos" />
            <div className="pdl-gender-overlay">
              <span className="top">1–12 anos</span>
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
            {HOME_PRODUCTS.map(p => (
              <div key={p.id} className="pdl-prod" onClick={() => router.push(`/produto/${p.id}`)}>
                <PdlImg tint={p.tint} label={p.label} />
                <div className="pdl-prod-name">{p.name}</div>
                <div className="pdl-prod-meta">
                  <span className="pdl-prod-col">{p.col}</span>
                  <span className="pdl-prod-price">{p.price}</span>
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
            <div className="pdl-col-card" onClick={() => router.push('/colecao/jardim')}>
              <PdlImg tint="rose" label="lookbook · jardim encantado · meninas 1–12" />
              <div className="pdl-col-overlay">
                <span className="pdl-col-tag">meninas · 1–12 anos</span>
                <div>
                  <div className="pdl-col-name">Jardim<em>Encantado</em></div>
                  <div className="pdl-col-meta">— 24 peças · coleção atual</div>
                </div>
              </div>
            </div>
            <div className="pdl-col-card" onClick={() => router.push('/colecao/doce')}>
              <PdlImg tint="ochre" label="lookbook · doce aventura · meninos 1–12" />
              <div className="pdl-col-overlay">
                <span className="pdl-col-tag">meninos · 1–12 anos</span>
                <div>
                  <div className="pdl-col-name">Doce<em>Aventura</em></div>
                  <div className="pdl-col-meta">— 18 peças · coleção atual</div>
                </div>
              </div>
            </div>
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
                <div className="pdl-age-num">0<em>–</em>2</div>
              </div>
              <div className="pdl-age-desc">primeiros passos, primeiros vestidinhos</div>
            </div>
            <div className="pdl-age">
              <div>
                <div className="pdl-age-label">descobridores</div>
                <div className="pdl-age-num">3<em>–</em>6</div>
              </div>
              <div className="pdl-age-desc">imaginação solta, joelhos sujos</div>
            </div>
            <div className="pdl-age">
              <div>
                <div className="pdl-age-label">aventureiros</div>
                <div className="pdl-age-num">7<em>–</em>12</div>
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

      {hpConfig.instagram.visible && (
        <div className="pdl-section" style={{ paddingBottom: 0 }}>
          <div className="pdl-section-head">
            <h2>No <em>instagram</em></h2>
            <span className="more">@pingodeluz</span>
          </div>
          <div className="pdl-ig">
            {(hpConfig.instagram.imageUrls.length > 0
              ? hpConfig.instagram.imageUrls
              : ['rose', 'ochre', 'sage', 'clay', 'ink', 'moss']
            ).map((urlOrTint, i) => (
              <PdlImg
                key={i}
                tint={urlOrTint.startsWith('http') ? 'rose' : urlOrTint}
                imageUrl={urlOrTint.startsWith('http') ? urlOrTint : undefined}
                label="ig"
              />
            ))}
          </div>
        </div>
      )}

      <PdlFooter />
      <PdlDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
