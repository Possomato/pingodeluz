'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import PageWrapper from '@/components/PageWrapper';
import PdlImg from '@/components/PdlImg';
import ProductCard from '@/components/ProductCard';
import HeartButton from '@/components/HeartButton';
import { IconChevronDown, IconChevronLeft, IconArrowRight, IconBag, IconLock } from '@/components/Icons';
import { calcInstallments, isSizeAvailable, isSoldOut } from '@/lib/data';
import { formatCentavos } from '@/lib/money';
import type { Product, SizeTable, PaymentConfig } from '@/lib/data';
import { pixPriceCentavos, type ShippingConfig } from '@/lib/pricing';
import { useCart } from '@/context/CartContext';
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
  p, id, sizeTable, paymentConfig, colIntro, related, shipping,
}: {
  p: Product;
  id: string;
  sizeTable: SizeTable | null;
  paymentConfig: PaymentConfig;
  colIntro: string;
  related: Product[];
  shipping: ShippingConfig;
}) {
  const { addToCart, openBag } = useCart();
  const [size, setSize] = useState<string | null>(null);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [openAcc, setOpenAcc] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [sizeHint, setSizeHint] = useState(false);
  const [nudge, setNudge] = useState(false);
  const isDesktop = useIsDesktop();
  const [isFavorited, setIsFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(true);
  const sizesRef = useRef<HTMLDivElement>(null);
  const medidasRef = useRef<HTMLDivElement>(null);
  const relatedRef = useRef<HTMLDivElement>(null);

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
  const installments = calcInstallments(p.priceCentavos, paymentConfig);

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

  const chooseSize = (s: string) => {
    setSize(s);
    setSizeHint(false);
  };

  const openMedidas = () => {
    setOpenAcc('medidas');
    setTimeout(() => medidasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  const handleBuy = () => {
    if (soldOut) return;
    if (!size) {
      // O botão nunca fica "morto": sem tamanho, ele mostra o que falta.
      setSizeHint(true);
      setNudge(true);
      sizesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setNudge(false), 400);
      return;
    }
    addToCart({
      pid: id,
      name: p.name,
      col: p.col,
      priceCentavos: p.priceCentavos,
      tint: p.tint,
      size,
      imageUrl: p.imageUrl,
    });
    openBag();
  };

  const scrollRelated = (dir: 1 | -1) => {
    const el = relatedRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  const ctaLabel = soldOut
    ? 'esgotado'
    : size
      ? <>adicionar à sacola <span className="price">· {formatCentavos(p.priceCentavos)}</span></>
      : 'escolher tamanho';

  const Cta = (
    <button
      className={`pdl-cta-btn${size && !soldOut ? ' active' : ''}`}
      onClick={handleBuy}
      disabled={soldOut}
      aria-describedby={sizeHint ? 'pdl-size-hint' : undefined}
    >
      {size && !soldOut && <IconBag size={16} />}
      {ctaLabel}
      {!size && !soldOut && <IconChevronDown size={14} />}
    </button>
  );

  return (
    <PageWrapper>
      {/* Breadcrumb */}
      <nav className="pdl-breadcrumb" aria-label="Você está em">
        <Link href="/" className="pdl-breadcrumb-link">Início</Link>
        <span className="pdl-breadcrumb-sep">›</span>
        {p.collectionId && (
          <>
            <Link href={`/colecao/${p.collectionId}`} className="pdl-breadcrumb-link">{p.col}</Link>
            <span className="pdl-breadcrumb-sep">›</span>
          </>
        )}
        <span className="pdl-breadcrumb-current">{p.name}</span>
      </nav>

      <div className="pdl-prodpage-cols">
        {/* Galeria */}
        <div>
          <div className="pdl-prodpage-gallery-wrap">
            {imgs.length > 1 && (
              <div className="pdl-prodpage-gallery-strip" role="tablist" aria-label="Fotos">
                {labels.map((lbl, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === galleryIdx}
                    aria-label={lbl}
                    onClick={() => setGalleryIdx(i)}
                    className={`pdl-prodpage-thumb ${i === galleryIdx ? 'active' : ''}`}
                  >
                    <PdlImg tint={p.tint} imageUrl={imgs[i] ?? p.imageUrl} ratio="3/4" />
                  </button>
                ))}
              </div>
            )}

            <div className="pdl-prodpage-gallery-main">
              <div
                className="pdl-prodpage-gallery-img pdl-prodpage-gallery-clickable"
                onClick={() => isDesktop && setLightboxOpen(true)}
              >
                {(imgs[galleryIdx] ?? p.imageUrl) ? (
                  <img
                    key={galleryIdx}
                    src={imgs[galleryIdx] ?? p.imageUrl}
                    alt={`${p.name} · ${labels[galleryIdx]}`}
                    className="pdl-prodpage-gallery-photo"
                  />
                ) : (
                  <PdlImg tint={p.tint} ratio="3/4" style={{ width: '100%' }} label={p.label} />
                )}
              </div>
              {imgs.length > 1 && (
                <div className="pdl-prodpage-dots">
                  {imgs.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Foto ${i + 1}`}
                      onClick={() => setGalleryIdx(i)}
                      className={`pdl-prodpage-dot ${i === galleryIdx ? 'active' : ''}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Informações */}
        <div className="pdl-prodpage-right">
          <div className="pdl-prodpage-info">
            <div className="pdl-prodpage-eyebrow">{p.col}</div>
            <div className="pdl-prodpage-top">
              <h1 className="pdl-prodpage-title">
                {nameParts[0]} <em>{nameParts[1]}</em>
              </h1>
              {!favLoading && <HeartButton productId={id} initialFavorited={isFavorited} />}
            </div>
            <div className="pdl-prodpage-price">
              <span className="now">{formatCentavos(p.priceCentavos)}</span>
              {installments && <span className="installments">ou {installments}</span>}
            </div>
            {shipping.pixDiscountPercent > 0 && (
              <div className="pdl-pix-badge">
                <strong>{formatCentavos(pixPriceCentavos(p.priceCentavos, shipping))}</strong> no Pix
                <span>{shipping.pixDiscountPercent}% de desconto</span>
              </div>
            )}

            {/* Tamanho */}
            <div className="pdl-prodpage-section" ref={sizesRef}>
              <h4>
                <span>
                  tamanho{size && <span className="chosen"> · {formatSize(size)}</span>}
                </span>
                {sizeTable && (
                  <button type="button" className="pdl-link" onClick={openMedidas}>guia de medidas</button>
                )}
              </h4>
              <div className={`pdl-prodpage-sizes${nudge ? ' nudge' : ''}`} role="radiogroup" aria-label="Tamanho">
                {sizes.map(s => {
                  const available = isSizeAvailable(p, s);
                  return (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      className={`pdl-size ${size === s ? 'selected' : ''}${available ? '' : ' unavail'}`}
                      onClick={() => available && chooseSize(s)}
                      disabled={!available}
                      aria-checked={size === s}
                      aria-label={`Tamanho ${formatSize(s)}${available ? '' : ', esgotado'}`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              {sizeHint && !size && (
                <div id="pdl-size-hint" className="pdl-size-hint" role="status">
                  Escolha um tamanho para continuar.
                </div>
              )}
            </div>

            {/* CTA — desktop */}
            <div className="pdl-prodpage-cta-desktop" style={{ marginTop: 20 }}>
              {Cta}
            </div>

            <div className="pdl-prodpage-trust">
              {shipping.freeAboveCentavos > 0 && (
                <span><IconArrowRight size={11} /> frete grátis a partir de {formatCentavos(shipping.freeAboveCentavos)}</span>
              )}
              <span><IconLock size={11} /> pagamento seguro</span>
              <span><IconChevronLeft size={11} /> troca fácil</span>
            </div>

            {p.desc && <div className="pdl-prodpage-desc">{p.desc}</div>}

            {/* Detalhes */}
            <div className="pdl-prodpage-section">
              <h4><span>detalhes</span></h4>
              <div className="pdl-acc" ref={medidasRef}>
                <button type="button" className="pdl-acc-head" onClick={() => toggle('medidas')} aria-expanded={openAcc === 'medidas'}>
                  <span>Medidas</span>
                  <span className={`pdl-acc-chevron${openAcc === 'medidas' ? ' open' : ''}`}><IconChevronDown size={16} /></span>
                </button>
                {openAcc === 'medidas' && (
                  <div className="pdl-acc-body">
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
                                onClick={() => isSizeAvailable(p, row.size) && chooseSize(row.size)}
                              >
                                <td className="pdl-size-table-maneq">{row.size}</td>
                                {sizeTable.columns.map(col => <td key={col}>{row.values[col] ?? '—'}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div style={{ padding: '12px 14px', fontStyle: 'italic', color: 'var(--muted)' }}>
                          Tabela de medidas em breve para esta peça.
                        </div>
                      )}
                    </div>
                    <div className="pdl-size-chart-caption">medidas em centímetros · toque numa linha para escolher o tamanho</div>
                  </div>
                )}
              </div>
              {(p.composition || p.careInfo) && (
                <div className="pdl-acc">
                  <button type="button" className="pdl-acc-head" onClick={() => toggle('compo')} aria-expanded={openAcc === 'compo'}>
                    <span>Composição e cuidado</span>
                    <span className={`pdl-acc-chevron${openAcc === 'compo' ? ' open' : ''}`}><IconChevronDown size={16} /></span>
                  </button>
                  {openAcc === 'compo' && (
                    <div className="pdl-acc-body">{[p.composition, p.careInfo].filter(Boolean).join(' ')}</div>
                  )}
                </div>
              )}
              {p.madeBy && (
                <div className="pdl-acc">
                  <button type="button" className="pdl-acc-head" onClick={() => toggle('feito')} aria-expanded={openAcc === 'feito'}>
                    <span>Feito à mão por</span>
                    <span className={`pdl-acc-chevron${openAcc === 'feito' ? ' open' : ''}`}><IconChevronDown size={16} /></span>
                  </button>
                  {openAcc === 'feito' && <div className="pdl-acc-body">{p.madeBy}</div>}
                </div>
              )}
              <div className="pdl-acc">
                <button type="button" className="pdl-acc-head" onClick={() => toggle('envio')} aria-expanded={openAcc === 'envio'}>
                  <span>Envio e trocas</span>
                  <span className={`pdl-acc-chevron${openAcc === 'envio' ? ' open' : ''}`}><IconChevronDown size={16} /></span>
                </button>
                {openAcc === 'envio' && (
                  <div className="pdl-acc-body">
                    {shipping.shippingInfo}{' '}
                    <Link href="/trocas" className="pdl-link">saiba mais</Link>
                  </div>
                )}
              </div>
            </div>

            {colIntro && (
              <div style={{ marginTop: 32, padding: '24px 0 0', borderTop: '1px solid var(--border-soft)' }}>
                <div className="pdl-eyebrow" style={{ marginBottom: 10 }}>histórias da coleção</div>
                <div className="pdl-lead" style={{ fontSize: 16 }}>{colIntro}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Combina com */}
      {related.length > 0 && (
        <section className="pdl-related" aria-label="Combina com">
          <div className="pdl-related-head">
            <h2 className="pdl-h2" style={{ fontSize: 22 }}>Combina <em>com</em></h2>
            {related.length > 4 && (
              <div className="pdl-related-nav-group">
                <button className="pdl-related-nav" onClick={() => scrollRelated(-1)} aria-label="Anterior"><IconChevronLeft size={16} /></button>
                <button className="pdl-related-nav" onClick={() => scrollRelated(1)} aria-label="Próximo" style={{ transform: 'scaleX(-1)' }}><IconChevronLeft size={16} /></button>
              </div>
            )}
          </div>
          <div className="pdl-related-track" ref={relatedRef}>
            {related.map(rp => <ProductCard key={rp.id} p={rp} />)}
          </div>
        </section>
      )}

      {/* CTA fixo — mobile */}
      <div className="pdl-prodpage-cta">
        {Cta}
      </div>

      {/* Lightbox — desktop */}
      {lightboxOpen && (
        <div className="pdl-lightbox-backdrop" onClick={() => setLightboxOpen(false)}>
          <button className="pdl-lightbox-close" onClick={() => setLightboxOpen(false)} aria-label="Fechar">×</button>
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
    </PageWrapper>
  );
}
