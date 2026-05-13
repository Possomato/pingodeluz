'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PdlImg from '@/components/PdlImg';
import { IconChevronLeft, IconArrowRight, IconLock } from '@/components/Icons';
import { useCart } from '@/context/CartContext';
import { parsePrice, formatPrice } from '@/lib/data';

export default function CarrinhoPage() {
  const router = useRouter();
  const { cart, updateQty, removeItem } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [cep, setCep] = useState('');
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);

  const subtotal = cart.reduce((sum, it) => sum + parsePrice(it.price) * it.qty, 0);
  const shipping = subtotal === 0 ? 0 : subtotal >= 250 ? 0 : 24;
  const discount = couponApplied ? Math.round(subtotal * 0.1) : 0;
  const total = Math.max(0, subtotal + shipping - discount);
  const installment = (total / 3).toFixed(2).replace('.', ',');

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="pdl-app">
      <div className={`pdl-back-bar ${scrolled ? 'solid' : ''}`}>
        <button onClick={() => router.back()} aria-label="Voltar"><IconChevronLeft size={18} /></button>
        <span className="pdl-back-title">Sua sacola</span>
        <span style={{ width: 38 }} />
      </div>

      <div className="pdl-cart">
        <div className="pdl-cart-title">Sua <em>sacola</em></div>
        <div className="pdl-cart-sub">
          {cart.length === 0
            ? 'Ainda nada por aqui.'
            : `${cart.reduce((n, it) => n + it.qty, 0)} ${cart.reduce((n, it) => n + it.qty, 0) === 1 ? 'peça escolhida' : 'peças escolhidas'} com carinho`}
        </div>

        {cart.length === 0 ? (
          <div className="pdl-cart-empty">
            <div className="quote">"Sua sacola está esperando os primeiros pingos de luz."</div>
            <button
              onClick={() => router.push('/')}
              style={{ padding: '12px 22px', background: 'var(--ink)', color: 'var(--cream-warm)', borderRadius: 999, fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 12, letterSpacing: '0.04em' }}
            >
              começar a explorar
            </button>
          </div>
        ) : (
          <>
            <div className="pdl-cart-items">
              {cart.map((it, idx) => (
                <div key={idx} className="pdl-cart-item">
                  <PdlImg tint={it.tint} />
                  <div className="pdl-cart-item-info">
                    <div className="pdl-cart-item-name">{it.name}</div>
                    <div className="pdl-cart-item-col">{it.col}</div>
                    <div className="pdl-cart-item-size">tam. {it.size}</div>
                    <div className="pdl-cart-item-bot">
                      <div className="pdl-cart-qty">
                        <button onClick={() => updateQty(idx, -1)} aria-label="Diminuir">−</button>
                        <span className="val">{it.qty}</span>
                        <button onClick={() => updateQty(idx, +1)} aria-label="Aumentar">+</button>
                      </div>
                      <div className="pdl-cart-item-price">{formatPrice(parsePrice(it.price) * it.qty)}</div>
                    </div>
                    <button className="pdl-cart-item-remove" onClick={() => removeItem(idx)}>remover</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pdl-cart-extras">
              <div className="pdl-cart-field">
                <label>CEP</label>
                <input type="text" placeholder="calcular frete" value={cep} onChange={e => setCep(e.target.value)} />
                <button>calcular</button>
              </div>
              <div className="pdl-cart-field">
                <label>Cupom</label>
                <input
                  type="text"
                  placeholder={couponApplied ? 'PINGO10 aplicado · -10%' : 'tem um código?'}
                  value={coupon}
                  onChange={e => setCoupon(e.target.value)}
                  disabled={couponApplied}
                />
                {!couponApplied
                  ? <button onClick={() => coupon && setCouponApplied(true)}>aplicar</button>
                  : <button onClick={() => { setCouponApplied(false); setCoupon(''); }}>remover</button>
                }
              </div>
            </div>

            <div className="pdl-cart-summary">
              <div className="pdl-cart-summary-row">
                <span className="lbl">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="pdl-cart-summary-row" style={{ color: 'var(--terra)' }}>
                  <span className="lbl">Desconto <em>PINGO10</em></span>
                  <span>− {formatPrice(discount)}</span>
                </div>
              )}
              <div className="pdl-cart-summary-row">
                <span className="lbl">Frete <em>{shipping === 0 ? 'cortesia' : 'PAC'}</em></span>
                <span>{shipping === 0 ? 'grátis' : formatPrice(shipping)}</span>
              </div>
              <div className="pdl-cart-summary-row total">
                <span>Total</span>
                <span style={{ textAlign: 'right' }}>
                  {formatPrice(total)}
                  <span className="installments">ou 3x de R$ {installment} sem juros</span>
                </span>
              </div>
              {subtotal > 0 && subtotal < 250 && (
                <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--cream-warm)', border: '1px dashed var(--border)', borderRadius: 3, fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-soft)', textAlign: 'center' }}>
                  Faltam {formatPrice(250 - subtotal)} para o frete grátis.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {cart.length > 0 && (
        <div className="pdl-cart-cta">
          <button onClick={() => router.push('/checkout')}>
            ir para o pagamento <IconArrowRight size={12} />
          </button>
          <div className="pdl-cart-secure">
            <IconLock size={12} />
            compra segura · ssl criptografado
          </div>
        </div>
      )}
    </div>
  );
}
