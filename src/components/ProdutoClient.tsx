'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PdlImg from '@/components/PdlImg';
import { IconChevronLeft, IconBag, IconChevronDown, IconArrowRight } from '@/components/Icons';
import { TABELA_MEDIDAS, SIZES_MENINAS, fetchCatalog, calcInstallments } from '@/lib/data';
import type { Product, SizeTable, PaymentConfig } from '@/lib/data';
import { useCart } from '@/context/CartContext';

const TINT_BG: Record<string, string> = {
  rose: '#e8d7c8', sage: '#c8d2bf', ochre: '#d9c19a',
  clay: '#d6b89e', moss: '#b6c0a3', ink: '#4a3f30',
};

export default function ProdutoClient({
  p, id, sizeTable, paymentConfig,
}: {
  p: Product;
  id: string;
  sizeTable: SizeTable | null;
  paymentConfig: PaymentConfig;
}) {
  const router = useRouter();
  const { addToCart, cartCount } = useCart();
const [size, setSize] = useState<string | null>(null);
  const [related, setRelated] = useState<Product[]>([]);

  useEffect(() => {
    fetchCatalog().then(all => {
      setRelated(all.filter(r => r.id !== id).slice(0, 3));
    }).catch(() => {});
  }, [id]);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [openAcc, setOpenAcc] = useState<string | null>('compo');

  const sizes = p.sizes?.length ? p.sizes : SIZES_MENINAS;
  const imgs = p.imageUrls?.length ? p.imageUrls : (p.imageUrl ? [p.imageUrl] : []);
  const labels = p.galleryLabels?.length === imgs.length ? p.galleryLabels : imgs.map((_, i) => `foto ${i + 1}`);
  const nameParts = p.nameParts || [p.name, ''];

  const toggle = (k: string) => setOpenAcc(openAcc === k ? null : k);

  return (
    <div className="pdl-app" style={{ paddingBottom: 0 }}>
<div className="pdl-back-bar solid">
        <button onClick={() => router.back()} aria-label="Voltar"><IconChevronLeft size={18} /></button>
        <span className="pdl-back-title">{p.name}</span>
        <button onClick={() => router.push('/carrinho')} aria-label="Sacola" style={{ position: 'relative' }}>
          <IconBag size={16} />
          {cartCount > 0 && <span className="pdl-bag-count">{cartCount}</span>}
        </button>
      </div>

      <div className="pdl-prodpage-cols">
        <div>
          <div className="pdl-prodpage-gallery">
            <div className="pdl-prodpage-gallery-img">
              {(imgs[galleryIdx] ?? p.imageUrl) && (
                <img
                  src={imgs[galleryIdx] ?? p.imageUrl}
                  alt={`${p.name} · ${labels[galleryIdx]}`}
                  className="pdl-prodpage-gallery-photo"
                />
              )}
            </div>
            {imgs.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 5, padding: '8px 0 0' }}>
                {imgs.map((_, i) => (
                  <span
                    key={i}
                    onClick={() => setGalleryIdx(i)}
                    style={{ width: i === galleryIdx ? 18 : 5, height: 5, borderRadius: 999, background: i === galleryIdx ? 'var(--ink)' : 'var(--border)', transition: 'width .2s', cursor: 'pointer', display: 'block' }}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="pdl-prodpage-gallery-strip">
            {labels.map((l, i) => (
              <div key={i} onClick={() => setGalleryIdx(i)} className={`pdl-prodpage-thumb ${i === galleryIdx ? 'active' : ''}`}>
                <PdlImg tint={p.tint} imageUrl={imgs[i] ?? p.imageUrl} ratio="3/4" />
              </div>
            ))}
          </div>
        </div>

        <div className="pdl-prodpage-right">
          <div className="pdl-prodpage-info">
            <div className="pdl-prodpage-eyebrow">{p.col}</div>
            <div className="pdl-prodpage-title">
              {nameParts[0]} <em>{nameParts[1]}</em>
            </div>
            <div className="pdl-prodpage-price">
              <span className="now">{p.price}</span>
              {(() => { const inst = calcInstallments(p.price, paymentConfig); return inst ? <span className="installments">— {inst}</span> : null; })()}
            </div>
            {p.desc && <div className="pdl-prodpage-desc">{p.desc}</div>}

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

            <div className="pdl-prodpage-cta-desktop" style={{ marginTop: 16 }}>
              <button
                onClick={() => {
                  if (!size) return;
                  addToCart({ pid: id, id, name: p.name, col: p.col, price: p.price, tint: p.tint, size });
                  router.push('/carrinho');
                }}
                style={size ? { width: '100%', padding: '14px 20px', background: 'var(--ink)', color: 'var(--cream-warm)', borderRadius: 999, fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 } : { width: '100%', padding: '14px 20px', background: 'var(--border)', color: 'var(--muted)', borderRadius: 999, fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13 }}
              >
                {size ? `adicionar à sacola · tam ${size}` : 'escolha um tamanho'}
                {size && <IconArrowRight size={12} />}
              </button>
            </div>

            <div className="pdl-size-chart">
              <div className="pdl-size-chart-note">toque no tamanho para ver suas medidas</div>
              <div className="pdl-size-chart-scroll">
                {sizeTable ? (
                  <table className="pdl-size-table">
                    <thead>
                      <tr>
                        <th>tam.</th>
                        {sizeTable.columns.map(col => <th key={col}>{col}</th>)}
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

            <div className="pdl-prodpage-section">
              <h4><span>detalhes</span></h4>
              <div className="pdl-acc">
                <div className="pdl-acc-head" onClick={() => toggle('compo')}>
                  <span>Composição e cuidado</span>
                  <IconChevronDown size={14} />
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
                  <IconChevronDown size={14} />
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
                  <IconChevronDown size={14} />
                </div>
                {openAcc === 'envio' && (
                  <div className="pdl-acc-body">
                    Envio em até 3 dias úteis. Frete grátis em compras acima de R$ 250. Trocas em até 30 dias, sem perguntas.
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 36, padding: '28px 0', borderTop: '1px solid var(--border-soft)', borderBottom: '1px solid var(--border-soft)' }}>
              <div className="pdl-eyebrow" style={{ marginBottom: 10 }}>histórias da coleção</div>
              <div style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 16, lineHeight: 1.4, color: 'var(--ink-soft)' }}>
                "O bordado de margarida nasceu de uma manhã no jardim da minha avó, que dizia que cada flor era um recado."
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', letterSpacing: 0.1, textTransform: 'uppercase' }}>
                — Carolina Bastos, criadora
              </div>
            </div>
          </div>

        </div>
      </div>

      {related.length > 0 && (
        <div style={{ marginTop: 36, padding: '0 0 36px' }}>
          <div className="pdl-eyebrow" style={{ marginBottom: 14 }}>combina com</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {related.map(rp => (
              <div key={rp.id} style={{ flex: '0 0 48%' }} onClick={() => router.push(`/produto/${rp.id}`)}>
                <PdlImg tint={rp.tint} imageUrl={rp.imageUrl} style={{ aspectRatio: '3/4', borderRadius: 3, marginBottom: 8 }} />
                <div style={{ fontFamily: 'var(--editorial)', fontSize: 13, color: 'var(--ink)' }}>{rp.name}</div>
                <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>{rp.price?.startsWith('R$') ? rp.price : `R$ ${rp.price}`}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ height: 100 }} />

<div className="pdl-prodpage-cta">
        <button
          onClick={() => {
            if (!size) return;
            addToCart({ pid: id, id, name: p.name, col: p.col, price: p.price, tint: p.tint, size });
            router.push('/carrinho');
          }}
          style={size ? {} : { background: 'var(--border)', color: 'var(--muted)' }}
        >
          {size ? `adicionar à sacola · tam ${size}` : 'escolha um tamanho'}
          {size && <IconArrowRight size={12} />}
        </button>
      </div>
    </div>
  );
}
