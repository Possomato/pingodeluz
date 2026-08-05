'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PdlImg from '@/components/PdlImg';
import { IconChevronLeft, IconArrowRight, IconLock } from '@/components/Icons';
import { useCart } from '@/context/CartContext';
import { formatCentavos } from '@/lib/money';
import { formatCEP, isValidCEP, fetchCEPData, extractAddressFromCEP } from '@/lib/cep';
import { createOrderAction, quoteCheckoutAction, type QuoteResult } from '@/app/actions/checkout';
import { saveAddressAction, type Address } from '@/app/actions/addresses';

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
}

const EMPTY_FORM = {
  name: '',
  email: '',
  zip: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
};

export default function CheckoutClient({
  savedAddresses,
  profile,
}: {
  savedAddresses: Address[];
  profile: Profile | null;
}) {
  const router = useRouter();
  const { cart, hydrated } = useCart();

  const [scrolled, setScrolled] = useState(false);
  const [step, setStep] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Endereço: um dos salvos, ou um novo. Nada vem preenchido de fábrica.
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    savedAddresses[0]?.id ?? null
  );
  const [useNewAddress, setUseNewAddress] = useState(savedAddresses.length === 0);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    name: profile?.name ?? '',
    email: profile?.email ?? '',
  });
  const [saveAddress, setSaveAddress] = useState(true);
  const [cepLoading, setCepLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>();
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (hydrated && cart.length === 0 && !placing) router.replace('/carrinho');
  }, [hydrated, cart.length, placing, router]);

  // Os totais vêm do servidor — é a mesma conta usada para gravar o
  // pedido, então o que aparece aqui é exatamente o que será cobrado.
  const refreshQuote = useCallback(async () => {
    if (!hydrated || cart.length === 0) return;
    try {
      const result = await quoteCheckoutAction(
        cart.map((i) => ({ id: i.pid, size: i.size, qty: i.qty })),
        appliedCoupon
      );
      setQuote(result);
      if (result.couponError) setAppliedCoupon(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não conseguimos calcular seu pedido.');
    } finally {
      setQuoteLoading(false);
    }
  }, [cart, appliedCoupon, hydrated]);

  // Recotar sempre que carrinho ou cupom mudarem. O estado só é gravado
  // depois do await, dentro de refreshQuote.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refreshQuote(); }, [refreshQuote]);

  const handleCEP = async (raw: string) => {
    const masked = formatCEP(raw);
    setForm((f) => ({ ...f, zip: masked }));

    if (!isValidCEP(masked)) return;

    setCepLoading(true);
    try {
      const data = await fetchCEPData(masked);
      if (data) {
        const addr = extractAddressFromCEP(data);
        setForm((f) => ({ ...f, ...addr }));
      }
    } finally {
      setCepLoading(false);
    }
  };

  const validateAddress = (): boolean => {
    if (!useNewAddress && selectedAddressId) return true;

    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Informe seu nome';
    if (!form.email.trim()) errs.email = 'Informe seu e-mail';
    if (!isValidCEP(form.zip)) errs.zip = 'CEP inválido';
    if (!form.street.trim()) errs.street = 'Informe a rua';
    if (!form.number.trim()) errs.number = 'Informe o número';
    if (!form.neighborhood.trim()) errs.neighborhood = 'Informe o bairro';
    if (!form.city.trim()) errs.city = 'Informe a cidade';
    if (!form.state.trim()) errs.state = 'Informe o estado';

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const chosenAddress = savedAddresses.find((a) => a.id === selectedAddressId);

  const applyCoupon = () => {
    const code = couponInput.trim();
    if (code) setAppliedCoupon(code);
  };

  const placeOrder = async () => {
    setPlacing(true);
    setError(null);

    try {
      let address;

      if (useNewAddress) {
        address = {
          name: form.name,
          email: form.email,
          zip: form.zip,
          street: form.street,
          number: form.number,
          complement: form.complement,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
        };
        if (saveAddress) {
          await saveAddressAction({
            label: 'Entrega',
            zip: form.zip,
            street: form.street,
            number: form.number,
            complement: form.complement,
            neighborhood: form.neighborhood,
            city: form.city,
            state: form.state,
          }).catch(() => { /* salvar é conveniência; não bloqueia a compra */ });
        }
      } else if (chosenAddress) {
        address = {
          name: form.name || profile?.name || '',
          email: form.email || profile?.email || '',
          zip: chosenAddress.zip,
          street: chosenAddress.street,
          number: chosenAddress.number,
          complement: chosenAddress.complement ?? '',
          neighborhood: chosenAddress.neighborhood,
          city: chosenAddress.city,
          state: chosenAddress.state,
        };
      } else {
        throw new Error('Escolha um endereço de entrega.');
      }

      const { redirectUrl } = await createOrderAction(
        cart.map((i) => ({ id: i.pid, size: i.size, qty: i.qty })),
        address,
        appliedCoupon
      );

      // O carrinho só é limpo na confirmação: se a pessoa desistir no
      // provedor e voltar, a sacola ainda está lá.
      window.location.href = redirectUrl;
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erro ao criar o pedido';
      setError(
        raw.startsWith('ESTOQUE_INSUFICIENTE')
          ? 'Uma das peças acabou de esgotar. Revise sua sacola.'
          : raw.startsWith('CUPOM_INVALIDO')
            ? raw.replace('CUPOM_INVALIDO:', '')
            : 'Não conseguimos iniciar o pagamento. Tente novamente.'
      );
      setPlacing(false);
    }
  };

  if (!hydrated) return <div className="pdl-app" style={{ minHeight: '60vh' }} />;

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

        {/* ─── 1. Entrega ─────────────────────────────────── */}
        <div className="pdl-checkout-section">
          <h3><span className="num">1</span> Entrega</h3>

          {step === 1 ? (
            <>
              {savedAddresses.length > 0 && (
                <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                  {savedAddresses.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => { setSelectedAddressId(a.id); setUseNewAddress(false); }}
                      style={{
                        textAlign: 'left',
                        padding: '12px 14px',
                        border: `1px solid ${!useNewAddress && selectedAddressId === a.id ? 'var(--terra)' : 'var(--border)'}`,
                        borderRadius: 3,
                        background: 'transparent',
                        cursor: 'pointer',
                      }}
                      aria-pressed={!useNewAddress && selectedAddressId === a.id}
                    >
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{a.label}</div>
                      <div style={{ fontFamily: 'var(--editorial)', fontSize: 13, color: 'var(--ink-soft)' }}>
                        {a.street}, {a.number}{a.complement ? ` · ${a.complement}` : ''}<br />
                        {a.neighborhood} · {a.city}/{a.state} · CEP {a.zip}
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setUseNewAddress(true)}
                    style={{
                      textAlign: 'left',
                      padding: '12px 14px',
                      border: `1px dashed ${useNewAddress ? 'var(--terra)' : 'var(--border)'}`,
                      borderRadius: 3,
                      background: 'transparent',
                      fontFamily: 'var(--editorial)',
                      fontStyle: 'italic',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                    aria-pressed={useNewAddress}
                  >
                    usar outro endereço
                  </button>
                </div>
              )}

              {useNewAddress && (
                <>
                  <div className="pdl-form-row">
                    <div className="pdl-input">
                      <label htmlFor="ck-email">e-mail</label>
                      <input id="ck-email" type="email" value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      {fieldErrors.email && <span style={{ fontSize: 11, color: 'var(--terra)' }}>{fieldErrors.email}</span>}
                    </div>
                  </div>
                  <div className="pdl-form-row">
                    <div className="pdl-input">
                      <label htmlFor="ck-name">nome completo</label>
                      <input id="ck-name" value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      {fieldErrors.name && <span style={{ fontSize: 11, color: 'var(--terra)' }}>{fieldErrors.name}</span>}
                    </div>
                  </div>
                  <div className="pdl-form-row cep">
                    <div className="pdl-input">
                      <label htmlFor="ck-zip">CEP {cepLoading && <span style={{ opacity: 0.6 }}>buscando…</span>}</label>
                      <input id="ck-zip" value={form.zip} inputMode="numeric"
                        onChange={(e) => handleCEP(e.target.value)} />
                      {fieldErrors.zip && <span style={{ fontSize: 11, color: 'var(--terra)' }}>{fieldErrors.zip}</span>}
                    </div>
                    <div className="pdl-input">
                      <label htmlFor="ck-state">UF</label>
                      <input id="ck-state" value={form.state} maxLength={2}
                        onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
                    </div>
                  </div>
                  <div className="pdl-form-row two">
                    <div className="pdl-input">
                      <label htmlFor="ck-street">endereço</label>
                      <input id="ck-street" value={form.street}
                        onChange={(e) => setForm({ ...form, street: e.target.value })} />
                      {fieldErrors.street && <span style={{ fontSize: 11, color: 'var(--terra)' }}>{fieldErrors.street}</span>}
                    </div>
                    <div className="pdl-input">
                      <label htmlFor="ck-number">número</label>
                      <input id="ck-number" value={form.number}
                        onChange={(e) => setForm({ ...form, number: e.target.value })} />
                      {fieldErrors.number && <span style={{ fontSize: 11, color: 'var(--terra)' }}>{fieldErrors.number}</span>}
                    </div>
                  </div>
                  <div className="pdl-form-row two">
                    <div className="pdl-input">
                      <label htmlFor="ck-comp">complemento</label>
                      <input id="ck-comp" value={form.complement} placeholder="opcional"
                        onChange={(e) => setForm({ ...form, complement: e.target.value })} />
                    </div>
                    <div className="pdl-input">
                      <label htmlFor="ck-hood">bairro</label>
                      <input id="ck-hood" value={form.neighborhood}
                        onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
                      {fieldErrors.neighborhood && <span style={{ fontSize: 11, color: 'var(--terra)' }}>{fieldErrors.neighborhood}</span>}
                    </div>
                  </div>
                  <div className="pdl-form-row">
                    <div className="pdl-input">
                      <label htmlFor="ck-city">cidade</label>
                      <input id="ck-city" value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })} />
                      {fieldErrors.city && <span style={{ fontSize: 11, color: 'var(--terra)' }}>{fieldErrors.city}</span>}
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12, fontFamily: 'var(--editorial)' }}>
                    <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                    salvar este endereço para a próxima compra
                  </label>
                </>
              )}

              <button
                onClick={() => { if (validateAddress()) setStep(2); }}
                style={{ marginTop: 16, padding: '12px 18px', background: 'var(--ink)', color: 'var(--cream-warm)', borderRadius: 999, fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 12, letterSpacing: '0.04em' }}
              >
                continuar para pagamento
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontFamily: 'var(--editorial)', fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
                {useNewAddress ? (
                  <>
                    {form.name}<br />{form.street}, {form.number}{form.complement ? ` · ${form.complement}` : ''}<br />
                    {form.neighborhood} · {form.city}/{form.state}<br />CEP {form.zip}<br />{form.email}
                  </>
                ) : chosenAddress ? (
                  <>
                    {chosenAddress.label}<br />{chosenAddress.street}, {chosenAddress.number}<br />
                    {chosenAddress.neighborhood} · {chosenAddress.city}/{chosenAddress.state}<br />CEP {chosenAddress.zip}
                  </>
                ) : null}
              </div>
              <button onClick={() => setStep(1)} style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--terra)', textDecoration: 'underline', textUnderlineOffset: 3 }}>editar</button>
            </div>
          )}
        </div>

        {/* ─── 2. Pagamento ───────────────────────────────── */}
        {step >= 2 && (
          <div className="pdl-checkout-section">
            <h3><span className="num">2</span> Pagamento</h3>

            {step === 2 ? (
              <>
                <div className="pdl-pay-options">
                  <div className="pdl-pay selected">
                    <div className="pdl-pay-head">
                      <div className="name">Pix, cartão <em>ou boleto</em></div>
                    </div>
                    <div className="pdl-pay-body">
                      <div className="pdl-pay-desc">
                        Você escolhe a forma de pagamento no ambiente seguro do Mercado Pago,
                        na próxima etapa. Seus dados de cartão não passam pela nossa loja.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pdl-cart-field" style={{ marginTop: 16 }}>
                  <label htmlFor="ck-cupom">Cupom</label>
                  <input
                    id="ck-cupom"
                    value={couponInput}
                    placeholder={appliedCoupon ? `${appliedCoupon} aplicado` : 'tem um código?'}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                    disabled={!!appliedCoupon}
                  />
                  {appliedCoupon ? (
                    <button onClick={() => { setAppliedCoupon(undefined); setCouponInput(''); }}>remover</button>
                  ) : (
                    <button onClick={applyCoupon} disabled={!couponInput.trim()}>aplicar</button>
                  )}
                </div>
                {quote?.couponError && (
                  <div role="status" aria-live="polite" style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 12, color: 'var(--terra)', marginTop: 6 }}>
                    {quote.couponError}
                  </div>
                )}

                <button
                  onClick={() => setStep(3)}
                  style={{ marginTop: 18, padding: '12px 18px', background: 'var(--ink)', color: 'var(--cream-warm)', borderRadius: 999, fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 12, letterSpacing: '0.04em' }}
                >
                  continuar para revisão
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontFamily: 'var(--editorial)', fontSize: 14, color: 'var(--ink-soft)' }}>
                  Pix, cartão ou boleto · no Mercado Pago
                </div>
                <button onClick={() => setStep(2)} style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--terra)', textDecoration: 'underline', textUnderlineOffset: 3 }}>editar</button>
              </div>
            )}
          </div>
        )}

        {/* ─── 3. Revisão ─────────────────────────────────── */}
        {step >= 3 && (
          <div className="pdl-checkout-section">
            <h3><span className="num">3</span> Revisão do pedido</h3>
            <div className="pdl-review">
              {cart.map((it) => (
                <div key={`${it.pid}-${it.size}`} className="pdl-review-item">
                  <PdlImg tint={it.tint} imageUrl={it.imageUrl} />
                  <div>
                    <div className="n">{it.name}</div>
                    <div className="m">{it.col} · tam {it.size} · qtd {it.qty}</div>
                  </div>
                  <div className="p">{formatCentavos(it.priceCentavos * it.qty)}</div>
                </div>
              ))}

              {quote && (
                <div className="pdl-review-totals">
                  <div className="pdl-cart-summary-row" style={{ padding: '4px 0' }}>
                    <span>Subtotal</span><span>{formatCentavos(quote.subtotalCentavos)}</span>
                  </div>
                  <div className="pdl-cart-summary-row" style={{ padding: '4px 0' }}>
                    <span>Frete</span>
                    <span>{quote.freightCentavos === 0 ? 'grátis' : formatCentavos(quote.freightCentavos)}</span>
                  </div>
                  {quote.discountCentavos > 0 && (
                    <div className="pdl-cart-summary-row" style={{ padding: '4px 0', color: 'var(--terra)' }}>
                      <span>Desconto{appliedCoupon ? ` ${appliedCoupon}` : ''}</span>
                      <span>− {formatCentavos(quote.discountCentavos)}</span>
                    </div>
                  )}
                  <div className="pdl-cart-summary-row total" style={{ marginTop: 8 }}>
                    <span>Total</span><span>{formatCentavos(quote.totalCentavos)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{ margin: '16px 0', padding: '12px 14px', border: '1px solid var(--terra)', borderRadius: 3, fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--terra)' }}
          >
            {error}
          </div>
        )}
      </div>

      {step === 3 && (
        <div className="pdl-cart-cta">
          <button onClick={placeOrder} disabled={placing || quoteLoading || !quote}>
            {placing ? 'processando...' : (
              <>finalizar pedido · {quote ? formatCentavos(quote.totalCentavos) : '…'} <IconArrowRight size={12} /></>
            )}
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
