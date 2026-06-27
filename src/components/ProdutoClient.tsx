'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PdlImg from '@/components/PdlImg';
import PdlHeader from '@/components/PdlHeader';
import PdlDrawer from '@/components/PdlDrawer';
import PdlFooter from '@/components/PdlFooter';
import { IconChevronDown, IconArrowRight } from '@/components/Icons';
import { TABELA_MEDIDAS, SIZES_MENINAS, fetchCatalog, calcInstallments } from '@/lib/data';
import type { Product, SizeTable, PaymentConfig } from '@/lib/data';
import { useCart } from '@/context/CartContext';

function formatSize(s: string): string {
  if (s.endsWith('m')) {
    const n = parseInt(s);
    return n === 1 ? '1 mês' : `${n} meses`;
  }
  const n = parseInt(s);
  return n === 1 ? '1 ano' : `${n} anos`;
}

const COL_SLUG: Record<string, string> = {
  'Jardim Encantado': 'jardim',
  'Doce Aventura': 'doce',
};

export default function ProdutoClient({
  p, id, sizeTable, paymentConfig, colIntro,
}: {
  p: Product;
  id: string;
  sizeTable: SizeTable | null;
  paymentConfig: PaymentConfig;
  colIntro: string;
}) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [size, setSize] = useState<string | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [openAcc, setOpenAcc] = useState<string | null>('medidas');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [relIdx, setRelIdx] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);

  const imgs = p.imageUrls?.length ? p.imageUrls : (p.imageUrl ? [p.imageUrl] : []);
  const labels = p.galleryLabels?.length === imgs.length ? p.galleryLabels : imgs.map((_, i) => `foto ${i + 1}`);
  const nameParts = p.nameParts || [p.name, ''];
  const sizeOrder = sizeTable ? sizeTable.rows.map(r => r.size) : TABELA_MEDIDAS.map(r => r.manequim);
  const rawSizes = p.sizes?.length ? p.sizes : SIZES_MENINAS;
  const sizes = [...rawSizes].sort((a, b) => sizeOrder.indexOf(a) - sizeOrder.indexOf(b));
  const colSlug = COL_SLUG[p.col] ?? p.col.toLowerCase().split(' ')[0];

  useEffect(() => {
    fetchCatalog().then(all => {
      setRelated(all.filter(r => r.id !== id).slice(0, 4));
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const len = imgs.length;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') setGalleryIdx(i => Math.min(i + 1, len - 1));
      if (e.key === 'ArrowLeft') setGalleryIdx(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxOpen, imgs.length]);

  const toggle = (k: string) => setOpenAcc(openAcc === k ? null : k);

  const handleBuy = () => {
    if (!size) return;
    addToCart({ pid: id, id, name: p.name, col: p.col, price: p.price, tint: p.tint, size });
    router.push('/carrinho');
  };

  return (
    <div className="pdl-app" style={{ paddingBottom: 0 }}>
      <PdlHeader onMenu={() => setMenuOpen(true)} />

      {/* Breadcrumb */}
      <nav className="pdl-breadcrumb">
        <span className="pdl-breadcrumb-link" onClick={() => router.push('/')}>Pingo de Luz</span>
        <span className="pdl-breadcrumb-sep">›</span>
        <span className="pdl-breadcrumb-link" onClick={() => router.push(`/colecao/${colSlug}`)}>{p.col}</span>
        <span className="pdl-breadcrumb-sep">›</span>
        <span className="pdl-breadcrumb-current">{p.name}</span>
      </nav>

      <div className="pdl-prodpage-cols">
        {/* Gallery column */}
        <div>
          <div className="pdl-prodpage-gallery-wrap">
            {/* Vertical thumbnails — desktop only via CSS */}
            {imgs.length > 1 && (
              <div className="pdl-prodpage-gallery-strip">
                {labels.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setGalleryIdx(i)}
                    className={`pdl-prodpage-thumb ${i === galleryIdx ? 'active' : ''}`}
                  >
                    <PdlImg tint={p.tint} imageUrl={imgs[i] ?? p.imageUrl} ratio="3/4" />
                  </div>
                ))}
              </div>
            )}

            {/* Hero + dots */}
            <div className="pdl-prodpage-gallery-main">
              <div
                className="pdl-prodpage-gallery-img pdl-prodpage-gallery-clickable"
                onClick={() => isDesktop && setLightboxOpen(true)}
              >
                {(imgs[galleryIdx] ?? p.imageUrl) && (
                  <img
                    src={imgs[galleryIdx] ?? p.imageUrl}
                    alt={`${p.name} · ${labels[galleryIdx]}`}
                    className="pdl-prodpage-gallery-photo"
                  />
                )}
              </div>
              {imgs.length > 1 && (
                <div className="pdl-prodpage-dots">
                  {imgs.map((_, i) => (
                    <span
                      key={i}
                      onClick={() => setGalleryIdx(i)}
                      style={{
                        width: i === galleryIdx ? 18 : 5,
                        height: 5,
                        borderRadius: 999,
                        background: i === galleryIdx ? 'var(--ink)' : 'var(--border)',
                        transition: 'width .2s',
                        cursor: 'pointer',
                        display: 'block',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info column */}
        <div className="pdl-prodpage-right">
          <div className="pdl-prodpage-info">
            <div className="pdl-prodpage-eyebrow">{p.col}</div>
            <div className="pdl-prodpage-title">
              {nameParts[0]} <em>{nameParts[1]}</em>
            </div>
            <div className="pdl-prodpage-price">
              <span className="now">{p.price}</span>
              {(() => {
                const inst = calcInstallments(p.price, paymentConfig);
                return inst ? <span className="installments">— {inst}</span> : null;
              })()}
            </div>

            {/* Size selector */}
            <div className="pdl-prodpage-section">
              <h4><span>tamanho</span></h4>
              <div className="pdl-prodpage-sizes">
                {sizes.map(s => (
                  <div
                    key={s}
                    className={`pdl-size ${size === s ? 'selected' : ''}`}
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>

            {/* CTA — desktop (immediately after sizes) */}
            <div className="pdl-prodpage-cta-desktop" style={{ marginTop: 16 }}>
              <button
                className={`pdl-cta-btn${size ? ' active' : ''}`}
                onClick={handleBuy}
                disabled={!size}
              >
                {size ? `Comprar · Tamanho ${formatSize(size)}` : 'escolha um tamanho'}
                {size && <IconArrowRight size={12} />}
              </button>
            </div>

            {/* Description */}
            {p.desc && <div className="pdl-prodpage-desc" style={{ marginTop: 24 }}>{p.desc}</div>}

            {/* Accordions */}
            <div className="pdl-prodpage-section">
              <h4><span>detalhes</span></h4>
              <div className="pdl-acc">
                <div className="pdl-acc-head" onClick={() => toggle('medidas')}>
                  <span>Medidas</span>
                  <span className={`pdl-acc-chevron${openAcc === 'medidas' ? ' open' : ''}`}><IconChevronDown size={14} /></span>
                </div>
                {openAcc === 'medidas' && (
                  <div className="pdl-acc-body" style={{ paddingTop: 12 }}>
                    <div className="pdl-size-chart">
                      <div className="pdl-size-chart-scroll">
                        {sizeTable ? (
                          <table className="pdl-size-table">
                            <thead>
                              <tr>
                                <th>tam.</th>
                                {sizeTable.columns.map(col => {
                                  const t = sizeTable.columnTypes?.[col];
                                  return (
                                    <th key={col}>
                                      <span style={{ display: 'block' }}>{col}</span>
                                      {t && <span style={{ display: 'block', fontSize: 9, fontWeight: 400, opacity: 0.6, marginTop: 1 }}>{t === 'crianca' ? 'da criança' : 'do vestido'}</span>}
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody>
                              {sizeTable.rows.filter(row => sizes.includes(row.size)).map(row => (
                                <tr
                                  key={row.size}
                                  className={`pdl-size-table-row ${size === row.size ? 'active' : ''}`}
                                  onClick={() => setSize(row.size)}
                                >
                                  <td className="pdl-size-table-maneq">{row.size}</td>
                                  {sizeTable.columns.map(col => <td key={col}>{row.values[col] ?? '—'}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <table className="pdl-size-table">
                            <thead>
                              <tr><th>tam.</th><th>tórax</th><th>cintura</th><th>compr.</th></tr>
                            </thead>
                            <tbody>
                              {TABELA_MEDIDAS.filter(row => sizes.includes(row.manequim)).map(row => (
                                <tr
                                  key={row.manequim}
                                  className={`pdl-size-table-row ${size === row.manequim ? 'active' : ''}`}
                                  onClick={() => setSize(row.manequim)}
                                >
                                  <td className="pdl-size-table-maneq">{row.manequim}</td>
                                  <td>{row.torax}</td>
                                  <td>{row.cintura}</td>
                                  <td>{row.comprimento}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                      <div className="pdl-size-chart-caption">medidas em centímetros · corpo da criança</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="pdl-acc">
                <div className="pdl-acc-head" onClick={() => toggle('compo')}>
                  <span>Composição e cuidado</span>
                  <span className={`pdl-acc-chevron${openAcc === 'compo' ? ' open' : ''}`}><IconChevronDown size={14} /></span>
                </div>
                {openAcc === 'compo' && (
                  <div className="pdl-acc-body">
                    100% musselina de algodão orgânico, certificado GOTS. Lavar à mão com água fria, secar à sombra.
                    Bordado feito à mão em ateliê parceiro em Minas Gerais.
                  </div>
                )}
              </div>
              <div className="pdl-acc">
                <div className="pdl-acc-head" onClick={() => toggle('feito')}>
                  <span>Feito à mão por</span>
                  <span className={`pdl-acc-chevron${openAcc === 'feito' ? ' open' : ''}`}><IconChevronDown size={14} /></span>
                </div>
                {openAcc === 'feito' && (
                  <div className="pdl-acc-body">
                    Cooperativa Flor de Lis, Pirapora — MG. Cada peça leva o nome bordado da artesã na etiqueta interna.
                  </div>
                )}
              </div>
              <div className="pdl-acc">
                <div className="pdl-acc-head" onClick={() => toggle('envio')}>
                  <span>Envio e trocas</span>
                  <span className={`pdl-acc-chevron${openAcc === 'envio' ? ' open' : ''}`}><IconChevronDown size={14} /></span>
                </div>
                {openAcc === 'envio' && (
                  <div className="pdl-acc-body">
                    Envio em até 3 dias úteis. Frete grátis em compras acima de R$ 250. Trocas em até 30 dias, sem perguntas.
                  </div>
                )}
              </div>
            </div>

            {/* Histórias da coleção */}
            {colIntro && (
              <div style={{ marginTop: 36, padding: '28px 0', borderTop: '1px solid var(--border-soft)', borderBottom: '1px solid var(--border-soft)' }}>
                <div className="pdl-eyebrow" style={{ marginBottom: 10 }}>histórias da coleção</div>
                <div style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 16, lineHeight: 1.4, color: 'var(--ink-soft)' }}>
                  {colIntro}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Combina com */}
      {related.length > 0 && (
        <div style={{ marginTop: 36, padding: '0 0 36px' }}>
          <div className="pdl-eyebrow" style={{ marginBottom: 14 }}>combina com</div>
          {isDesktop ? (
            <div className="pdl-related-desktop">
              <button
                className="pdl-related-nav"
                onClick={() => setRelIdx(i => Math.max(0, i - 1))}
                disabled={relIdx === 0}
                aria-label="Anterior"
              >‹</button>
              <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>
                {related.slice(relIdx, relIdx + 2).map(rp => (
                  <div
                    key={rp.id}
                    style={{ flex: '0 0 calc(50% - 8px)', cursor: 'pointer' }}
                    onClick={() => router.push(`/produto/${rp.id}`)}
                  >
                    <PdlImg tint={rp.tint} imageUrl={rp.imageUrl} style={{ aspectRatio: '3/4', borderRadius: 3, marginBottom: 8 }} />
                    <div style={{ fontFamily: 'var(--editorial)', fontSize: 13, color: 'var(--ink)' }}>{rp.name}</div>
                    <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>{rp.price?.startsWith('R$') ? rp.price : `R$ ${rp.price}`}</div>
                  </div>
                ))}
              </div>
              <button
                className="pdl-related-nav"
                onClick={() => setRelIdx(i => Math.min(related.length - 2, i + 1))}
                disabled={relIdx >= related.length - 2}
                aria-label="Próximo"
              >›</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {related.map(rp => (
                <div key={rp.id} style={{ flex: '0 0 48%' }} onClick={() => router.push(`/produto/${rp.id}`)}>
                  <PdlImg tint={rp.tint} imageUrl={rp.imageUrl} style={{ aspectRatio: '3/4', borderRadius: 3, marginBottom: 8 }} />
                  <div style={{ fontFamily: 'var(--editorial)', fontSize: 13, color: 'var(--ink)' }}>{rp.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>{rp.price?.startsWith('R$') ? rp.price : `R$ ${rp.price}`}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ height: 100 }} />

      {/* Sticky mobile CTA */}
      <div className="pdl-prodpage-cta">
        <button
          className={`pdl-cta-btn${size ? ' active' : ''}`}
          onClick={handleBuy}
          disabled={!size}
        >
          {size ? `Comprar · Tamanho ${formatSize(size)}` : 'escolha um tamanho'}
          {size && <IconArrowRight size={12} />}
        </button>
      </div>

      {/* Lightbox — desktop only */}
      {lightboxOpen && (
        <div className="pdl-lightbox-backdrop" onClick={() => setLightboxOpen(false)}>
          <button className="pdl-lightbox-close" onClick={() => setLightboxOpen(false)}>×</button>
          {galleryIdx > 0 && (
            <button
              className="pdl-lightbox-nav left"
              onClick={e => { e.stopPropagation(); setGalleryIdx(i => i - 1); }}
              aria-label="Foto anterior"
            >‹</button>
          )}
          <img
            src={imgs[galleryIdx]}
            alt={`${p.name} · ${labels[galleryIdx]}`}
            className="pdl-lightbox-img"
            onClick={e => e.stopPropagation()}
          />
          {galleryIdx < imgs.length - 1 && (
            <button
              className="pdl-lightbox-nav right"
              onClick={e => { e.stopPropagation(); setGalleryIdx(i => i + 1); }}
              aria-label="Próxima foto"
            >›</button>
          )}
        </div>
      )}

      <PdlFooter />
      <PdlDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
