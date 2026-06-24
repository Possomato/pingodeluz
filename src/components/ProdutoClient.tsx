'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PdlImg from '@/components/PdlImg';
import { IconChevronLeft, IconBag, IconChevronDown, IconArrowRight } from '@/components/Icons';
import type { Product } from '@/lib/data';
import { HOME_PRODUCTS, TABELA_MEDIDAS, SIZES_MENINAS } from '@/lib/data';
import { useCart } from '@/context/CartContext';

export default function ProdutoClient({ p, id }: { p: Product; id: string }) {
  const router = useRouter();
  const { addToCart, cartCount } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [size, setSize] = useState<string | null>(null);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [openAcc, setOpenAcc] = useState<string | null>('compo');

  const sizes = p.sizes || SIZES_MENINAS;
  const unavail = p.unavail || [];
  const labels = p.galleryLabels || ['frente', 'costas', 'detalhe'];
  const nameParts = p.nameParts || [p.name, ''];

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const toggle = (k: string) => setOpenAcc(openAcc === k ? null : k);

  return (
    <div className="pdl-app" style={{ paddingBottom: 0 }}>
      <div className={`pdl-back-bar ${scrolled ? 'solid' : ''}`} style={{ marginBottom: -54 }}>
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
            <PdlImg tint={p.tint} imageUrl={p.imageUrl} label={`foto · ${p.name.toLowerCase()} · ${labels[galleryIdx]}`} />
            <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
              {labels.map((_, i) => (
                <span key={i} style={{ width: i === galleryIdx ? 18 : 5, height: 5, borderRadius: 999, background: i === galleryIdx ? 'rgba(251,246,233,0.95)' : 'rgba(251,246,233,0.45)', transition: 'width .2s' }} />
              ))}
            </div>
          </div>
          <div className="pdl-prodpage-gallery-strip">
            {labels.map((l, i) => (
              <div key={i} onClick={() => setGalleryIdx(i)} className={`pdl-prodpage-thumb ${i === galleryIdx ? 'active' : ''}`}>
                <PdlImg tint={p.tint} imageUrl={p.imageUrl} ratio="3/4" />
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
              {p.installments && <span className="installments">— {p.installments}</span>}
            </div>
            {p.desc && <div className="pdl-prodpage-desc">{p.desc}</div>}

            <div className="pdl-prodpage-section">
              <h4><span>tamanho</span></h4>
              <div className="pdl-prodpage-sizes">
                {sizes.map(s => {
                  const ua = unavail.includes(s);
                  return (
                    <div
                      key={s}
                      className={`pdl-size ${size === s ? 'selected' : ''} ${ua ? 'unavail' : ''}`}
                      onClick={() => !ua && setSize(s)}
                    >
                      {s}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pdl-size-chart">
              <div className="pdl-size-chart-note">toque no tamanho para ver suas medidas</div>
              <div className="pdl-size-chart-scroll">
                <table className="pdl-size-table">
                  <thead>
                    <tr>
                      <th>tam.</th>
                      <th>tórax</th>
                      <th>cintura</th>
                      <th>compr.</th>
                    </tr>
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

          <div className="pdl-prodpage-cta-desktop" style={{ marginTop: 24 }}>
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
        </div>
      </div>

      <div style={{ marginTop: 36, padding: '0 0 36px' }}>
        <div className="pdl-eyebrow" style={{ marginBottom: 14 }}>combina com</div>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {HOME_PRODUCTS.slice(1, 4).map(rp => (
            <div key={rp.id} style={{ flex: '0 0 48%' }} onClick={() => router.push(`/produto/${rp.id}`)}>
              <PdlImg tint={rp.tint} imageUrl={rp.imageUrl} style={{ aspectRatio: '3/4', borderRadius: 3, marginBottom: 8 }} />
              <div style={{ fontFamily: 'var(--editorial)', fontSize: 13, color: 'var(--ink)' }}>{rp.name}</div>
              <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>{rp.price}</div>
            </div>
          ))}
        </div>
      </div>

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
