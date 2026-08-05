'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PdlImg from '@/components/PdlImg';
import { IconChevronLeft, IconArrowRight, IconLock } from '@/components/Icons';
import { useCart } from '@/context/CartContext';
import { formatCentavos } from '@/lib/money';
import { computeFreight, amountUntilFreeShipping, type ShippingConfig } from '@/lib/pricing';
import { calcInstallments, type PaymentConfig } from '@/lib/data';
import { checkCouponAction } from '@/app/actions/coupons';

export default function CarrinhoClient({
  shipping,
  payment,
}: {
  shipping: ShippingConfig;
  payment: PaymentConfig;
}) {
  const router = useRouter();
  const { cart, cartCount, subtotalCentavos, hydrated, updateQty, removeItem } = useCart();
  const [scrolled, setScrolled] = useState(false);

  const [couponInput, setCouponInput] = useState('');
  const [applied, setApplied] = useState<{ code: string; discountCentavos: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Um cupom validado para R$ 300 pode deixar de valer se o carrinho
  // encolher, então a validação é refeita quando o subtotal muda.
  useEffect(() => {
    if (!applied) return;
    let cancelled = false;
    checkCouponAction(applied.code, subtotalCentavos).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setApplied({ code: result.code, discountCentavos: result.discountCentavos });
      } else {
        setApplied(null);
        setCouponError(result.message);
      }
    });
    return () => { cancelled = true; };
    // `applied.code` basta: reagir ao objeto inteiro entraria em laço.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalCentavos, applied?.code]);

  const freightCentavos = computeFreight(subtotalCentavos, shipping);
  const discountCentavos = applied?.discountCentavos ?? 0;
  const totalCentavos = Math.max(0, subtotalCentavos + freightCentavos - discountCentavos);
  const missingForFree = amountUntilFreeShipping(subtotalCentavos, shipping);
  const installments = calcInstallments(totalCentavos, payment);

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;

    setChecking(true);
    setCouponError(null);
    try {
      const result = await checkCouponAction(code, subtotalCentavos);
      if (result.ok) {
        setApplied({ code: result.code, discountCentavos: result.discountCentavos });
        setCouponInput('');
      } else {
        setCouponError(result.message);
      }
    } catch {
      setCouponError('Não conseguimos validar o cupom agora.');
    } finally {
      setChecking(false);
    }
  };

  const removeCoupon = () => {
    setApplied(null);
    setCouponError(null);
    setCouponInput('');
  };

  // Antes da hidratação o carrinho é sempre vazio; mostrar o estado
  // "sacola vazia" nesse instante faria a tela piscar.
  const showEmpty = hydrated && cart.length === 0;

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
          {!hydrated
            ? ' '
            : cart.length === 0
              ? 'Ainda nada por aqui.'
              : `${cartCount} ${cartCount === 1 ? 'peça escolhida' : 'peças escolhidas'} com carinho`}
        </div>

        {showEmpty ? (
          <div className="pdl-cart-empty">
            <div className="quote">&ldquo;Sua sacola está esperando os primeiros pingos de luz.&rdquo;</div>
            <button
              onClick={() => router.push('/')}
              style={{ padding: '12px 22px', background: 'var(--ink)', color: 'var(--cream-warm)', borderRadius: 999, fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 12, letterSpacing: '0.04em' }}
            >
              começar a explorar
            </button>
          </div>
        ) : cart.length > 0 ? (
          <>
            <div className="pdl-cart-items">
              {cart.map((it) => (
                <div key={`${it.pid}-${it.size}`} className="pdl-cart-item">
                  <PdlImg tint={it.tint} imageUrl={it.imageUrl} />
                  <div className="pdl-cart-item-info">
                    <div className="pdl-cart-item-name">{it.name}</div>
                    <div className="pdl-cart-item-col">{it.col}</div>
                    <div className="pdl-cart-item-size">tam. {it.size}</div>
                    <div className="pdl-cart-item-bot">
                      <div className="pdl-cart-qty">
                        <button
                          onClick={() => updateQty(it.pid, it.size, -1)}
                          aria-label={`Diminuir quantidade de ${it.name}`}
                        >−</button>
                        <span className="val">{it.qty}</span>
                        <button
                          onClick={() => updateQty(it.pid, it.size, +1)}
                          aria-label={`Aumentar quantidade de ${it.name}`}
                        >+</button>
                      </div>
                      <div className="pdl-cart-item-price">
                        {formatCentavos(it.priceCentavos * it.qty)}
                      </div>
                    </div>
                    <button
                      className="pdl-cart-item-remove"
                      onClick={() => removeItem(it.pid, it.size)}
                    >
                      remover
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pdl-cart-extras">
              <div className="pdl-cart-field">
                <label htmlFor="cupom">Cupom</label>
                <input
                  id="cupom"
                  type="text"
                  placeholder={applied ? `${applied.code} aplicado` : 'tem um código?'}
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                  disabled={!!applied || checking}
                />
                {applied ? (
                  <button onClick={removeCoupon}>remover</button>
                ) : (
                  <button onClick={applyCoupon} disabled={checking || !couponInput.trim()}>
                    {checking ? '...' : 'aplicar'}
                  </button>
                )}
              </div>
              {couponError && (
                <div
                  role="status"
                  aria-live="polite"
                  style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 12, color: 'var(--terra)', marginTop: 6 }}
                >
                  {couponError}
                </div>
              )}
            </div>

            <div className="pdl-cart-summary">
              <div className="pdl-cart-summary-row">
                <span className="lbl">Subtotal</span>
                <span>{formatCentavos(subtotalCentavos)}</span>
              </div>
              {discountCentavos > 0 && applied && (
                <div className="pdl-cart-summary-row" style={{ color: 'var(--terra)' }}>
                  <span className="lbl">Desconto <em>{applied.code}</em></span>
                  <span>− {formatCentavos(discountCentavos)}</span>
                </div>
              )}
              <div className="pdl-cart-summary-row">
                <span className="lbl">Frete <em>{freightCentavos === 0 ? 'cortesia' : 'PAC'}</em></span>
                <span>{freightCentavos === 0 ? 'grátis' : formatCentavos(freightCentavos)}</span>
              </div>
              <div className="pdl-cart-summary-row total">
                <span>Total</span>
                <span style={{ textAlign: 'right' }}>
                  {formatCentavos(totalCentavos)}
                  {installments && <span className="installments">ou {installments}</span>}
                </span>
              </div>
              {missingForFree > 0 && subtotalCentavos > 0 && (
                <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--cream-warm)', border: '1px dashed var(--border)', borderRadius: 3, fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-soft)', textAlign: 'center' }}>
                  Faltam {formatCentavos(missingForFree)} para o frete grátis.
                </div>
              )}
            </div>
          </>
        ) : null}
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
