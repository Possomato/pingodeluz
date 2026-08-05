'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import PdlImg from '@/components/PdlImg';
import PdlHeader from '@/components/PdlHeader';
import PdlDrawer from '@/components/PdlDrawer';
import PdlFooter from '@/components/PdlFooter';
import { IconChevronDown, IconArrowRight } from '@/components/Icons';
import { calcInstallments, isSizeAvailable, isSoldOut } from '@/lib/data';
import { formatCentavos } from '@/lib/money';
import type { Product, SizeTable, PaymentConfig } from '@/lib/data';
import { useCart } from '@/context/CartContext';
import HeartButton from '@/components/HeartButton';
import { isFavoritedAction } from '@/app/actions/favorites';

function formatSize(s: string): string {
  if (s.endsWith('m')) {
    const n = parseInt(s);
    return n === 1 ? '1 mês' : `${n} meses`;
  }
  const n = parseInt(s);
  return n === 1 ? '1 ano' : `${n} anos`;
}

/**
 * Largura da janela lida como sistema externo, que é o que ela é.
 * `useSyncExternalStore` evita o estado duplicado que um efeito criaria
 * e já entrega o valor certo na primeira renderização do cliente.
 */
const DESKTOP_QUERY = '(min-width: 1024px)';

function subscribeToDesktop(callback: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function useIsDesktop() {
  return useSyncExternalStore(
    subscribeToDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,  // no servidor, assume mobile
  );
}

export default function ProdutoClient({
  p, id, sizeTable, paymentConfig, colIntro, related, shippingInfo,
}: {
  p: Product;
  id: string;
  sizeTable: SizeTable | null;
  paymentConfig: PaymentConfig;
  colIntro: string;
  related: Product[];
  shippingInfo: string;
}) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [size, setSize] = useState<string | null>(null);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [openAcc, setOpenAcc] = useState<string | null>('medidas');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [relIdx, setRelIdx] = useState(0);
  const isDesktop = useIsDesktop();
  const [isFavorited, setIsFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(true);

  const imgs = p.imageUrls?.length ? p.imageUrls : (p.imageUrl ? [p.imageUrl] : []);
  const labels = p.galleryLabels?.length === imgs.length ? p.galleryLabels : imgs.map((_, i) => `foto ${i + 1}`);
  const nameParts = p.nameParts || [p.name, ''];
  const sizeOrder = sizeTable ? sizeTable.rows.map(r => r.size) : [];
  const sizes = [...(p.sizes ?? [])].sort((a, b) => {
    const ia = sizeOrder.indexOf(a);
    const ib = sizeOrder.indexOf(b);
    // Tamanhos fora da tabela vão para o fim, preservando a ordem original.
    return (ia === -1 ? Number.MAX_SAFE_INTEGER : ia) - (ib === -1 ? Number.MAX_SAFE_INTEGER : ib);
  });
  const soldOut = isSoldOut(p);

  useEffect(() => {
    const checkFavorite = async () => {
      const result = await isFavoritedAction(id);
      setIsFavorited(result);
      setFavLoading(false);
    };
    checkFavorite();
  }, [id]);

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
    addToCart({
      pid: id,
      name: p.name,
      col: p.col,
      priceCentavos: p.priceCentavos,
      tint: p.tint,
      size,
      imageUrl: p.imageUrl,
    });
    router.push('/carrinho');
  };

  return (
    <div className="pdl-app" style={{ paddingBottom: 0 }}>
      <PdlHeader onMenu={() => setMenuOpen(true)} />

      {/* Breadcrumb */}
      <nav className="pdl-breadcrumb">
        <span className="pdl-breadcrumb-link" onClick={() => router.push('/')}>Pingo de Luz</span>
        <span className="pdl-breadcrumb-sep">›</span>
        {p.collectionId && (
          <>
            <span className="pdl-breadcrumb-link" onClick={() => router.push(`/colecao/${p.collectionId}`)}>{p.col}</span>
            <span className="pdl-breadcrumb-sep">›</span>
          </>
        )}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="pdl-prodpage-title">
                {nameParts[0]} <em>{nameParts[1]}</em>
              </div>
              {!favLoading && <HeartButton productId={id} initialFavorited={isFavorited} />}
            </div>
            <div className="pdl-prodpage-price">
              <span className="now">{formatCentavos(p.priceCentavos)}</span>
              {(() => {
                const inst = calcInstallments(p.priceCentavos, paymentConfig);
                return inst ? <span className="installments">— {inst}</span> : null;
              })()}
            </div>

            {/* Size selector */}
            <div className="pdl-prodpage-section">
              <h4><span>tamanho</span></h4>
              <div className="pdl-prodpage-sizes">
                {sizes.map(s => {
                  const available = isSizeAvailable(p, s);
                  return (
                    <button
                      key={s}
                      type="button"
                      className={`pdl-size ${size === s ? 'selected' : ''}${available ? '' : ' unavail'}`}
                      onClick={() => available && setSize(s)}
                      disabled={!available}
                      aria-pressed={size === s}
                      aria-label={`Tamanho ${s}${available ? '' : ' — esgotado'}`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTA — desktop (immediately after sizes) */}
            <div className="pdl-prodpage-cta-desktop" style={{ marginTop: 16 }}>
              <button
                className={`pdl-cta-btn${size ? ' active' : ''}`}
                onClick={handleBuy}
                disabled={!size || soldOut}
              >
                {soldOut ? 'esgotado' : size ? `Comprar · Tamanho ${formatSize(size)}` : 'escolha um tamanho'}
                {size && !soldOut && <IconArrowRight size={12} />}
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
                          <div style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>
                            Tabela de medidas em breve para esta peça.
                          </div>
                        )}
                      </div>
                      <div className="pdl-size-chart-caption">medidas em centímetros · corpo da criança</div>
                    </div>
                  </div>
                )}
              </div>
              {(p.composition || p.careInfo) && (
              <div className="pdl-acc">
                <div className="pdl-acc-head" onClick={() => toggle('compo')}>
                  <span>Composição e cuidado</span>
                  <span className={`pdl-acc-chevron${openAcc === 'compo' ? ' open' : ''}`}><IconChevronDown size={14} /></span>
                </div>
                {openAcc === 'compo' && (
                  <div className="pdl-acc-body">
                    {[p.composition, p.careInfo].filter(Boolean).join(' ')}
                  </div>
                )}
              </div>
              )}
              {p.madeBy && (
              <div className="pdl-acc">
                <div className="pdl-acc-head" onClick={() => toggle('feito')}>
                  <span>Feito à mão por</span>
                  <span className={`pdl-acc-chevron${openAcc === 'feito' ? ' open' : ''}`}><IconChevronDown size={14} /></span>
                </div>
                {openAcc === 'feito' && (
                  <div className="pdl-acc-body">{p.madeBy}</div>
                )}
              </div>
              )}
              <div className="pdl-acc">
                <div className="pdl-acc-head" onClick={() => toggle('envio')}>
                  <span>Envio e trocas</span>
                  <span className={`pdl-acc-chevron${openAcc === 'envio' ? ' open' : ''}`}><IconChevronDown size={14} /></span>
                </div>
                {openAcc === 'envio' && (
                  <div className="pdl-acc-body">{shippingInfo}</div>
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
                    <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>{formatCentavos(rp.priceCentavos)}</div>
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
                  <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>{formatCentavos(rp.priceCentavos)}</div>
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
          disabled={!size || soldOut}
        >
          {soldOut ? 'esgotado' : size ? `Comprar · Tamanho ${formatSize(size)}` : 'escolha um tamanho'}
          {size && !soldOut && <IconArrowRight size={12} />}
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
