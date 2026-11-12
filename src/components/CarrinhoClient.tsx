'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageWrapper from '@/components/PageWrapper';
import PdlImg from '@/components/PdlImg';
import { IconArrowRight, IconLock } from '@/components/Icons';
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
  const {
    cart, cartCount, subtotalCentavos, hydrated, updateQty, removeItem,
    couponCode, setCouponCode,
  } = useCart();

  const [couponInput, setCouponInput] = useState('');
  const [appliedResult, setApplied] = useState<{ code: string; discountCentavos: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // O cupom fica guardado junto do carrinho. Toda vez que o subtotal muda
  // ele é revalidado: um cupom "válido acima de R$ 300" pode deixar de
  // valer quando a sacola encolhe — e nesse caso sai do carrinho também.
  useEffect(() => {
    if (!hydrated) return;
    if (!couponCode || cart.length === 0) return;
    let cancelled = false;
    checkCouponAction(couponCode, subtotalCentavos).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setApplied({ code: result.code, discountCentavos: result.discountCentavos });
        setCouponError(null);
      } else {
        setApplied(null);
        setCouponError(result.message);
        setCouponCode(null);
      }
    }).catch(() => { /* fica como estava; o checkout recalcula */ });
    return () => { cancelled = true; };
  }, [hydrated, couponCode, subtotalCentavos, cart.length, setCouponCode]);

  const freightCentavos = computeFreight(subtotalCentavos, shipping);
  // Sem cupom no carrinho, nenhum desconto vale — mesmo que o último
  // resultado validado ainda esteja em memória.
  const applied = couponCode && cart.length > 0 ? appliedResult : null;
  const discountCentavos = applied?.discountCentavos ?? 0;
  const totalCentavos = Math.max(0, subtotalCentavos + freightCentavos - discountCentavos);
  const missingForFree = amountUntilFreeShipping(subtotalCentavos, shipping);
  const progress = shipping.freeAboveCentavos > 0
    ? Math.min(100, Math.round((subtotalCentavos / shipping.freeAboveCentavos) * 100))
    : 100;
  const installments = calcInstallments(totalCentavos, payment);

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    setChecking(true);
    setCouponError(null);
    try {
      const result = await checkCouponAction(code, subtotalCentavos);
      if (result.ok) {
        setApplied({ code: result.code, discountCentavos: result.discountCentavos });
        setCouponCode(result.code);
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
    setCouponCode(null);
    setCouponError(null);
    setCouponInput('');
  };

  // Antes da hidratação o carrinho é sempre vazio; mostrar o estado
  // "sacola vazia" nesse instante faria a tela piscar.
  const showEmpty = hydrated && cart.length === 0;

  return (
    <PageWrapper>
      <div className="pdl-cart">
        <div className="pdl-cart-head">
          <h1 className="pdl-cart-title">Sua <em>sacola</em></h1>
          <div className="pdl-cart-sub">
            {!hydrated
              ? ' '
              : cart.length === 0
                ? 'Ainda nada por aqui.'
                : `${cartCount} ${cartCount === 1 ? 'peça escolhida' : 'peças escolhidas'} com carinho`}
          </div>
        </div>

        {showEmpty ? (
          <div className="pdl-cart-empty">
            <div className="quote">&ldquo;Sua sacola está esperando os primeiros pingos de luz.&rdquo;</div>
            <Link href="/" className="pdl-btn pdl-btn--primary pdl-btn--lg">começar a explorar</Link>
          </div>
        ) : cart.length > 0 ? (
          <div className="pdl-cart-layout">
            <div>
              <div className="pdl-cart-items">
                {cart.map((it) => (
                  <div key={`${it.pid}-${it.size}`} className="pdl-cart-item">
                    <Link href={`/produto/${it.pid}`} aria-label={it.name}>
                      <PdlImg tint={it.tint} imageUrl={it.imageUrl} />
                    </Link>
                    <div className="pdl-cart-item-info">
                      <div className="pdl-cart-item-top">
                        <div>
                          <Link href={`/produto/${it.pid}`} className="pdl-cart-item-name">{it.name}</Link>
                          <div className="pdl-cart-item-col">{it.col}</div>
                        </div>
                        <button
                          className="pdl-cart-item-remove"
                          onClick={() => removeItem(it.pid, it.size)}
                          aria-label={`Remover ${it.name}`}
                        >
                          remover
                        </button>
                      </div>
                      <div className="pdl-cart-item-size">tam. {it.size}</div>
                      <div className="pdl-cart-item-bot">
                        <div className="pdl-qty">
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
                    </div>
                  </div>
                ))}
              </div>
              <div className="pdl-cart-continue">
                <Link href="/" className="pdl-link">continuar comprando</Link>
              </div>
            </div>

            <aside className="pdl-cart-side" aria-label="Resumo">
              <div className="pdl-ship">
                {missingForFree > 0
                  ? <>Faltam <strong>{formatCentavos(missingForFree)}</strong> para o frete grátis.</>
                  : <>Frete <strong>por nossa conta</strong> neste pedido.</>}
                <div className={`pdl-ship-bar ${missingForFree === 0 ? 'full' : ''}`}><i style={{ width: `${progress}%` }} /></div>
              </div>

              <div>
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
                    autoComplete="off"
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
                  <div role="status" aria-live="polite" className="pdl-field-error" style={{ marginTop: 6 }}>
                    {couponError}
                  </div>
                )}
              </div>

              <div className="pdl-card pdl-cart-summary">
                <div className="pdl-cart-summary-row">
                  <span className="lbl">Subtotal</span>
                  <span>{formatCentavos(subtotalCentavos)}</span>
                </div>
                {discountCentavos > 0 && applied && (
                  <div className="pdl-cart-summary-row" style={{ color: 'var(--terra-deep)' }}>
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
              </div>

              <div className="pdl-cart-cta">
                <button className="pdl-btn pdl-btn--primary pdl-btn--lg pdl-btn--block" onClick={() => router.push('/checkout')}>
                  finalizar compra <IconArrowRight size={13} />
                </button>
                <div className="pdl-cart-secure">
                  <IconLock size={12} />
                  compra segura · pix, cartão ou boleto
                </div>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </PageWrapper>
  );
}
