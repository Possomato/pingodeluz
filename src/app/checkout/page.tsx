'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PdlImg from '@/components/PdlImg';
import { IconChevronLeft, IconArrowRight, IconLock } from '@/components/Icons';
import { useCart } from '@/context/CartContext';
import { parsePrice, formatPrice } from '@/lib/data';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [step, setStep] = useState(1);
  const [shipping, setShipping] = useState({
    email: 'marina@email.com', name: 'Marina Vasques',
    cep: '04546-001', address: 'Rua das Acácias, 128',
    complement: 'apto 42', neighborhood: 'Jardim Paulistano',
    city: 'São Paulo', state: 'SP',
  });
  const [payment, setPayment] = useState('pix');
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '', installments: '3x' });

  const subtotal = cart.reduce((sum, it) => sum + parsePrice(it.price) * it.qty, 0);
  const freight = subtotal >= 250 ? 0 : 24;
  const total = subtotal + freight;
  const pixDiscount = payment === 'pix' ? Math.round(total * 0.05) : 0;
  const finalTotal = total - pixDiscount;

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const placeOrder = () => {
    const orderNumber = 'PDL-' + String(Math.floor(Math.random() * 90000) + 10000);
    const params = new URLSearchParams({
      num: orderNumber,
      total: String(finalTotal),
      payment,
      email: shipping.email,
      name: shipping.name,
    });
    setTimeout(() => clearCart(), 100);
    router.push(`/confirmacao?${params.toString()}`);
  };

  return (
    <div className="pdl-app">
      <div className={`pdl-back-bar ${scrolled ? 'solid' : ''}`}>
        <button onClick={() => router.back()} aria-label="Voltar"><IconChevronLeft size={18} /></button>
        <span className="pdl-back-title">Finalizar compra</span>
        <span style={{ width: 38 }} />
      </div>

      <div className="pdl-checkout" style={{ paddingTop: 8 }}>
        <div className="pdl-cart-title" style={{ paddingTop: 16 }}>Finalizar <em>compra</em></div>
        <div className="pdl-cart-sub">Faltam alguns detalhes — e os pingos saem voando.</div>

        <div className="pdl-checkout-stepper">
          <div className={`pdl-checkout-step ${step > 1 ? 'done' : step === 1 ? 'active' : ''}`}>1 · entrega</div>
          <div className={`pdl-checkout-step ${step > 2 ? 'done' : step === 2 ? 'active' : ''}`}>2 · pagamento</div>
          <div className={`pdl-checkout-step ${step === 3 ? 'active' : ''}`}>3 · revisão</div>
        </div>

        {/* STEP 1 */}
        {step >= 1 && (
          <div className="pdl-checkout-section">
            <h3><span className="num">1</span> Entrega</h3>
            {step === 1 ? (
              <>
                <div className="pdl-form-row"><div className="pdl-input"><label>e-mail</label><input value={shipping.email} onChange={e => setShipping({ ...shipping, email: e.target.value })} /></div></div>
                <div className="pdl-form-row"><div className="pdl-input"><label>nome completo</label><input value={shipping.name} onChange={e => setShipping({ ...shipping, name: e.target.value })} /></div></div>
                <div className="pdl-form-row cep">
                  <div className="pdl-input"><label>CEP</label><input value={shipping.cep} onChange={e => setShipping({ ...shipping, cep: e.target.value })} /></div>
                  <div className="pdl-input"><label>UF</label><input value={shipping.state} onChange={e => setShipping({ ...shipping, state: e.target.value })} /></div>
                </div>
                <div className="pdl-form-row"><div className="pdl-input"><label>endereço</label><input value={shipping.address} onChange={e => setShipping({ ...shipping, address: e.target.value })} /></div></div>
                <div className="pdl-form-row two">
                  <div className="pdl-input"><label>complemento</label><input value={shipping.complement} onChange={e => setShipping({ ...shipping, complement: e.target.value })} placeholder="opcional" /></div>
                  <div className="pdl-input"><label>bairro</label><input value={shipping.neighborhood} onChange={e => setShipping({ ...shipping, neighborhood: e.target.value })} /></div>
                </div>
                <div className="pdl-form-row"><div className="pdl-input"><label>cidade</label><input value={shipping.city} onChange={e => setShipping({ ...shipping, city: e.target.value })} /></div></div>
                <button onClick={() => setStep(2)} style={{ marginTop: 16, padding: '12px 18px', background: 'var(--ink)', color: 'var(--cream-warm)', borderRadius: 999, fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 12, letterSpacing: '0.04em' }}>
                  continuar para pagamento
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontFamily: 'var(--editorial)', fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
                  {shipping.name}<br />{shipping.address} · {shipping.complement}<br />{shipping.neighborhood} · {shipping.city}/{shipping.state}<br />CEP {shipping.cep}<br />{shipping.email}
                </div>
                <button onClick={() => setStep(1)} style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--terra)', textDecoration: 'underline', textUnderlineOffset: 3 }}>editar</button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2 */}
        {step >= 2 && (
          <div className="pdl-checkout-section">
            <h3><span className="num">2</span> Pagamento</h3>
            {step === 2 ? (
              <>
                <div className="pdl-pay-options">
                  <div className={`pdl-pay ${payment === 'pix' ? 'selected' : ''}`} onClick={() => setPayment('pix')}>
                    <div className="pdl-pay-head">
                      <div className="name"><span className="pdl-pay-radio" />Pix</div>
                      <span className="badge">5% off</span>
                    </div>
                    {payment === 'pix' && <div className="pdl-pay-body"><div className="pdl-pay-desc">O QR Code é gerado na próxima tela. Pagamento confirmado em segundos.</div></div>}
                  </div>

                  <div className={`pdl-pay ${payment === 'card' ? 'selected' : ''}`} onClick={() => setPayment('card')}>
                    <div className="pdl-pay-head">
                      <div className="name"><span className="pdl-pay-radio" />Cartão <em>de crédito</em></div>
                      <span className="badge">até 3x s/ juros</span>
                    </div>
                    {payment === 'card' && (
                      <div className="pdl-pay-body">
                        <div className="pdl-form-row"><div className="pdl-input"><label>número do cartão</label><input value={card.number} onChange={e => setCard({ ...card, number: e.target.value })} placeholder="0000  0000  0000  0000" /></div></div>
                        <div className="pdl-form-row"><div className="pdl-input"><label>nome impresso</label><input value={card.name} onChange={e => setCard({ ...card, name: e.target.value })} placeholder="como está no cartão" /></div></div>
                        <div className="pdl-form-row two">
                          <div className="pdl-input"><label>validade</label><input value={card.expiry} onChange={e => setCard({ ...card, expiry: e.target.value })} placeholder="MM/AA" /></div>
                          <div className="pdl-input"><label>cvv</label><input value={card.cvv} onChange={e => setCard({ ...card, cvv: e.target.value })} placeholder="3 dígitos" /></div>
                        </div>
                        <div className="pdl-form-row"><div className="pdl-input"><label>parcelas</label><input value={card.installments} onChange={e => setCard({ ...card, installments: e.target.value })} /></div></div>
                      </div>
                    )}
                  </div>

                  <div className={`pdl-pay ${payment === 'boleto' ? 'selected' : ''}`} onClick={() => setPayment('boleto')}>
                    <div className="pdl-pay-head">
                      <div className="name"><span className="pdl-pay-radio" />Boleto</div>
                    </div>
                    {payment === 'boleto' && <div className="pdl-pay-body"><div className="pdl-pay-desc">Vence em 2 dias. Pedido é separado após a compensação.</div></div>}
                  </div>
                </div>
                <button onClick={() => setStep(3)} style={{ marginTop: 18, padding: '12px 18px', background: 'var(--ink)', color: 'var(--cream-warm)', borderRadius: 999, fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 12, letterSpacing: '0.04em' }}>
                  continuar para revisão
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontFamily: 'var(--editorial)', fontSize: 14, color: 'var(--ink-soft)' }}>
                  {payment === 'pix' && <span>Pix · pagamento à vista <em style={{ color: 'var(--terra)' }}>(5% off)</em></span>}
                  {payment === 'card' && <span>Cartão de crédito · {card.installments || '3x'} sem juros</span>}
                  {payment === 'boleto' && <span>Boleto bancário · vencimento em 2 dias</span>}
                </div>
                <button onClick={() => setStep(2)} style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--terra)', textDecoration: 'underline', textUnderlineOffset: 3 }}>editar</button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3 */}
        {step >= 3 && (
          <div className="pdl-checkout-section">
            <h3><span className="num">3</span> Revisão do pedido</h3>
            <div className="pdl-review">
              {cart.map((it, idx) => (
                <div key={idx} className="pdl-review-item">
                  <PdlImg tint={it.tint} />
                  <div>
                    <div className="n">{it.name}</div>
                    <div className="m">{it.col} · tam {it.size} · qtd {it.qty}</div>
                  </div>
                  <div className="p">{formatPrice(parsePrice(it.price) * it.qty)}</div>
                </div>
              ))}
              <div className="pdl-review-totals">
                <div className="pdl-cart-summary-row" style={{ padding: '4px 0' }}><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                <div className="pdl-cart-summary-row" style={{ padding: '4px 0' }}><span>Frete</span><span>{freight === 0 ? 'grátis' : formatPrice(freight)}</span></div>
                {pixDiscount > 0 && <div className="pdl-cart-summary-row" style={{ padding: '4px 0', color: 'var(--terra)' }}><span>Desconto pix</span><span>− {formatPrice(pixDiscount)}</span></div>}
                <div className="pdl-cart-summary-row total" style={{ marginTop: 8 }}><span>Total</span><span>{formatPrice(finalTotal)}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {step === 3 && (
        <div className="pdl-cart-cta">
          <button onClick={placeOrder}>
            finalizar pedido · {formatPrice(finalTotal)} <IconArrowRight size={12} />
          </button>
          <div className="pdl-cart-secure">
            <IconLock size={12} />
            compra segura · trocas em 30 dias
          </div>
        </div>
      )}
    </div>
  );
}
