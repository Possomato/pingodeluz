'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PdlHeader from '@/components/PdlHeader';
import PdlImg from '@/components/PdlImg';
import { IconArrowRight, IconLock, IconChevronDown, Sparkle } from '@/components/Icons';
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

const EMPTY_ADDRESS = {
  zip: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
};

type Step = 1 | 2;

export default function CheckoutClient({
  savedAddresses,
  profile,
  paymentFailed = false,
}: {
  savedAddresses: Address[];
  profile: Profile | null;
  /** Volta do provedor com pagamento recusado/abandonado (?error=pagamento). */
  paymentFailed?: boolean;
}) {
  const router = useRouter();
  const { cart, hydrated, couponCode, setCouponCode } = useCart();

  const [step, setStep] = useState<Step>(1);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(
    paymentFailed ? 'Não foi possível concluir o pagamento. Nada foi cobrado — tente novamente ou use outra forma de pagamento.' : null
  );

  // Quem recebe: vem do perfil, mas pode ser editado.
  const [contact, setContact] = useState({ name: profile?.name ?? '', email: profile?.email ?? '' });

  // Endereço: um dos salvos, ou um novo. Nada vem preenchido de fábrica.
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(savedAddresses[0]?.id ?? null);
  const [useNewAddress, setUseNewAddress] = useState(savedAddresses.length === 0);
  const [form, setForm] = useState({ ...EMPTY_ADDRESS });
  const [saveAddress, setSaveAddress] = useState(true);
  const [cepLoading, setCepLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [couponInput, setCouponInput] = useState('');
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);

  // O cupom vive no contexto do carrinho: é o mesmo que foi aplicado na
  // sacola, e some de lá também se o servidor o recusar aqui.
  const appliedCoupon = couponCode ?? undefined;

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
      if (result.couponError) setCouponCode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não conseguimos calcular seu pedido.');
    } finally {
      setQuoteLoading(false);
    }
  }, [cart, appliedCoupon, hydrated, setCouponCode]);

  // Recotar sempre que carrinho ou cupom mudarem. O estado só é gravado
  // depois do await, dentro de refreshQuote.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refreshQuote(); }, [refreshQuote]);

  const handleCEP = async (raw: string) => {
    const masked = formatCEP(raw);
    setForm((f) => ({ ...f, zip: masked }));
    setFieldErrors((e) => ({ ...e, zip: '' }));

    if (!isValidCEP(masked)) return;

    setCepLoading(true);
    try {
      const data = await fetchCEPData(masked);
      if (data) {
        const addr = extractAddressFromCEP(data);
        setForm((f) => ({ ...f, ...addr }));
        setFieldErrors((e) => ({ ...e, street: '', neighborhood: '', city: '', state: '' }));
        // Depois do CEP, o que falta é o número.
        document.getElementById('ck-number')?.focus();
      }
    } finally {
      setCepLoading(false);
    }
  };

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!contact.name.trim()) errs.name = 'Informe quem recebe';
    if (!contact.email.trim() || !contact.email.includes('@')) errs.email = 'Informe um e-mail válido';

    if (useNewAddress || !selectedAddressId) {
      if (!isValidCEP(form.zip)) errs.zip = 'CEP inválido';
      if (!form.street.trim()) errs.street = 'Informe a rua';
      if (!form.number.trim()) errs.number = 'Informe o número';
      if (!form.neighborhood.trim()) errs.neighborhood = 'Informe o bairro';
      if (!form.city.trim()) errs.city = 'Informe a cidade';
      if (!form.state.trim()) errs.state = 'UF';
    }

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      const first = Object.keys(errs)[0];
      document.getElementById(`ck-${first}`)?.focus();
      return false;
    }
    return true;
  };

  const chosenAddress = savedAddresses.find((a) => a.id === selectedAddressId);

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponCode(code);
    setCouponInput('');
  };

  const removeCoupon = () => {
    setCouponCode(null);
  };

  const goToReview = () => {
    if (!validateStep1()) return;
    setStep(2);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const placeOrder = async () => {
    setPlacing(true);
    setError(null);

    try {
      let address;

      if (useNewAddress || !chosenAddress) {
        address = { name: contact.name, email: contact.email, ...form };
        if (saveAddress) {
          await saveAddressAction({ label: 'Entrega', ...form })
            .catch(() => { /* salvar é conveniência; não bloqueia a compra */ });
        }
      } else {
        address = {
          name: contact.name,
          email: contact.email,
          zip: chosenAddress.zip,
          street: chosenAddress.street,
          number: chosenAddress.number,
          complement: chosenAddress.complement ?? '',
          neighborhood: chosenAddress.neighborhood,
          city: chosenAddress.city,
          state: chosenAddress.state,
        };
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

  const addressSummary = useNewAddress || !chosenAddress ? (
    <>
      {form.street}, {form.number}{form.complement ? ` · ${form.complement}` : ''}<br />
      {form.neighborhood} · {form.city}/{form.state} · CEP {form.zip}
    </>
  ) : (
    <>
      {chosenAddress.street}, {chosenAddress.number}{chosenAddress.complement ? ` · ${chosenAddress.complement}` : ''}<br />
      {chosenAddress.neighborhood} · {chosenAddress.city}/{chosenAddress.state} · CEP {chosenAddress.zip}
    </>
  );

  const field = (id: keyof typeof form, label: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="pdl-field-group">
      <label className="pdl-field-label" htmlFor={`ck-${id}`}>{label}</label>
      <input
        id={`ck-${id}`}
        className={`pdl-field${fieldErrors[id] ? ' pdl-field--error' : ''}`}
        value={form[id]}
        onChange={(e) => { setForm({ ...form, [id]: e.target.value }); setFieldErrors((er) => ({ ...er, [id]: '' })); }}
        aria-invalid={!!fieldErrors[id]}
        {...extra}
      />
      {fieldErrors[id] && <span className="pdl-field-error">{fieldErrors[id]}</span>}
    </div>
  );

  const summary = (
    <div className="pdl-summary-card">
      <div className="pdl-summary-head">
        <h4>Seu pedido</h4>
        <button className="pdl-link" onClick={() => router.push('/carrinho')}>editar sacola</button>
      </div>
      <div className="pdl-summary-items">
        {cart.map((it) => (
          <div key={`${it.pid}-${it.size}`} className="pdl-review-item">
            <PdlImg tint={it.tint} imageUrl={it.imageUrl} />
            <div>
              <div className="n">{it.name}</div>
              <div className="m">tam. {it.size} · {it.qty} {it.qty === 1 ? 'un.' : 'un.'}</div>
            </div>
            <div className="p">{formatCentavos(it.priceCentavos * it.qty)}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <div className="pdl-cart-field" style={{ height: 48 }}>
          <label htmlFor="ck-cupom">Cupom</label>
          <input
            id="ck-cupom"
            value={couponInput}
            placeholder={appliedCoupon ? `${appliedCoupon} aplicado` : 'tem um código?'}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
            disabled={!!appliedCoupon}
            autoComplete="off"
          />
          {appliedCoupon ? (
            <button onClick={removeCoupon}>remover</button>
          ) : (
            <button onClick={applyCoupon} disabled={!couponInput.trim()}>aplicar</button>
          )}
        </div>
        {quote?.couponError && (
          <div role="status" aria-live="polite" className="pdl-field-error" style={{ marginTop: 6 }}>
            {quote.couponError}
          </div>
        )}
      </div>

      <div className="pdl-review-totals">
        <div className="pdl-cart-summary-row">
          <span>Subtotal</span><span>{quote ? formatCentavos(quote.subtotalCentavos) : '…'}</span>
        </div>
        <div className="pdl-cart-summary-row">
          <span>Frete</span>
          <span>{quote ? (quote.freightCentavos === 0 ? 'grátis' : formatCentavos(quote.freightCentavos)) : '…'}</span>
        </div>
        {quote && quote.discountCentavos > 0 && (
          <div className="pdl-cart-summary-row" style={{ color: 'var(--terra-deep)' }}>
            <span>Desconto{appliedCoupon ? ` ${appliedCoupon}` : ''}</span>
            <span>− {formatCentavos(quote.discountCentavos)}</span>
          </div>
        )}
        <div className="pdl-cart-summary-row total">
          <span>Total</span><span>{quote ? formatCentavos(quote.totalCentavos) : '…'}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pdl-app">
      <PdlHeader variant="slim" backHref="/carrinho" backLabel="voltar para a sacola" />

      <div className="pdl-checkout">
        <div className="pdl-checkout-layout">
          <div className="pdl-checkout-main">
            <div className="pdl-steps" aria-label="Etapas">
              <button type="button" className={`step ${step === 1 ? 'active' : 'done'}`} onClick={() => setStep(1)} disabled={step === 1}>
                <i>{step > 1 ? '✓' : '1'}</i> entrega
              </button>
              <span className="sep" />
              <span className={`step ${step === 2 ? 'active' : ''}`}><i>2</i> revisão e pagamento</span>
            </div>

            {/* Resumo recolhível — só no mobile */}
            <details className="pdl-summary-mobile" style={{ margin: '12px 0 4px' }}>
              <summary>
                <span>Resumo do pedido · {cart.reduce((n, i) => n + i.qty, 0)} {cart.reduce((n, i) => n + i.qty, 0) === 1 ? 'peça' : 'peças'}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <strong>{quote ? formatCentavos(quote.totalCentavos) : '…'}</strong>
                  <span className="chev"><IconChevronDown size={16} /></span>
                </span>
              </summary>
              {summary}
            </details>

            {/* ─── 1. Entrega ───────────────────────────────── */}
            {step === 1 ? (
              <>
                <section className="pdl-checkout-section">
                  <h3>Quem <em>recebe</em></h3>
                  <div className="pdl-form-row two">
                    <div className="pdl-field-group">
                      <label className="pdl-field-label" htmlFor="ck-name">nome completo</label>
                      <input id="ck-name" className={`pdl-field${fieldErrors.name ? ' pdl-field--error' : ''}`} value={contact.name}
                        autoComplete="name"
                        onChange={(e) => { setContact({ ...contact, name: e.target.value }); setFieldErrors((er) => ({ ...er, name: '' })); }} />
                      {fieldErrors.name && <span className="pdl-field-error">{fieldErrors.name}</span>}
                    </div>
                    <div className="pdl-field-group">
                      <label className="pdl-field-label" htmlFor="ck-email">e-mail</label>
                      <input id="ck-email" className={`pdl-field${fieldErrors.email ? ' pdl-field--error' : ''}`} type="email" value={contact.email}
                        autoComplete="email" inputMode="email"
                        onChange={(e) => { setContact({ ...contact, email: e.target.value }); setFieldErrors((er) => ({ ...er, email: '' })); }} />
                      {fieldErrors.email && <span className="pdl-field-error">{fieldErrors.email}</span>}
                    </div>
                  </div>
                </section>

                <section className="pdl-checkout-section">
                  <h3>Onde <em>entregar</em></h3>

                  {savedAddresses.length > 0 && (
                    <div className="pdl-addr-options" role="radiogroup" aria-label="Endereço de entrega">
                      {savedAddresses.map((a) => {
                        const selected = !useNewAddress && selectedAddressId === a.id;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            className={`pdl-addr-option${selected ? ' selected' : ''}`}
                            onClick={() => { setSelectedAddressId(a.id); setUseNewAddress(false); }}
                          >
                            <span className="pdl-radio" aria-hidden />
                            <span>
                              <span className="label">{a.label}</span>
                              <div className="body">
                                {a.street}, {a.number}{a.complement ? ` · ${a.complement}` : ''}<br />
                                {a.neighborhood} · {a.city}/{a.state} · CEP {a.zip}
                              </div>
                            </span>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        role="radio"
                        aria-checked={useNewAddress}
                        className={`pdl-addr-option new${useNewAddress ? ' selected' : ''}`}
                        onClick={() => setUseNewAddress(true)}
                      >
                        <span className="pdl-radio" aria-hidden />
                        <span className="body">entregar em outro endereço</span>
                      </button>
                    </div>
                  )}

                  {useNewAddress && (
                    <>
                      <div className="pdl-form-row cep">
                        {field('zip', cepLoading ? 'CEP · buscando…' : 'CEP', { inputMode: 'numeric', autoComplete: 'postal-code', onChange: (e) => handleCEP(e.target.value), placeholder: '00000-000' })}
                        {field('state', 'UF', { maxLength: 2, autoComplete: 'address-level1', onChange: (e) => { setForm({ ...form, state: e.target.value.toUpperCase() }); setFieldErrors((er) => ({ ...er, state: '' })); } })}
                      </div>
                      <div className="pdl-form-row street">
                        {field('street', 'endereço', { autoComplete: 'address-line1' })}
                        {field('number', 'número', { inputMode: 'numeric' })}
                      </div>
                      <div className="pdl-form-row two">
                        {field('complement', 'complemento', { placeholder: 'opcional', autoComplete: 'address-line2' })}
                        {field('neighborhood', 'bairro')}
                      </div>
                      <div className="pdl-form-row">
                        {field('city', 'cidade', { autoComplete: 'address-level2' })}
                      </div>
                      <label className="pdl-check" style={{ marginTop: 4 }}>
                        <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                        salvar este endereço para a próxima compra
                      </label>
                    </>
                  )}

                  <button className="pdl-btn pdl-btn--primary pdl-btn--lg pdl-btn--block" style={{ marginTop: 22 }} onClick={goToReview}>
                    revisar pedido <IconArrowRight size={13} />
                  </button>
                </section>
              </>
            ) : (
              <>
                <div className="pdl-checkout-done">
                  <div>
                    <div className="lbl"><Sparkle size={9} /> entrega</div>
                    <div className="body">
                      <strong style={{ fontWeight: 500, color: 'var(--ink)' }}>{contact.name}</strong> · {contact.email}<br />
                      {addressSummary}
                    </div>
                  </div>
                  <button className="pdl-link" onClick={() => setStep(1)}>editar</button>
                </div>

                {/* ─── 2. Revisão e pagamento ───────────────── */}
                <section className="pdl-checkout-section" style={{ borderBottom: 'none' }}>
                  <h3>Como <em>pagar</em></h3>
                  <div className="pdl-pay-card">
                    <div className="name"><IconLock size={15} /> Pix, cartão <em>ou boleto</em></div>
                    <div className="desc">
                      Você escolhe a forma de pagamento no ambiente seguro do Mercado Pago, na próxima tela.
                      Seus dados de cartão não passam pela nossa loja.
                    </div>
                    <div className="pdl-pay-methods">
                      <span>Pix</span><span>Crédito</span><span>Débito</span><span>Boleto</span>
                    </div>
                  </div>

                  {error && (
                    <div role="alert" className="pdl-note pdl-note--error" style={{ marginTop: 16 }}>
                      {error}
                    </div>
                  )}

                  <div className="pdl-cart-cta pdl-cart-cta--checkout">
                    <button
                      className="pdl-btn pdl-btn--primary pdl-btn--lg pdl-btn--block"
                      onClick={placeOrder}
                      disabled={placing || quoteLoading || !quote}
                    >
                      {placing ? 'preparando o pagamento…' : (
                        <>ir para o pagamento seguro · {quote ? formatCentavos(quote.totalCentavos) : '…'} <IconArrowRight size={13} /></>
                      )}
                    </button>
                    <div className="pdl-cart-secure">
                      <IconLock size={12} />
                      você só paga na próxima tela · trocas em 30 dias
                    </div>
                  </div>
                </section>
              </>
            )}

            {error && step === 1 && (
              <div role="alert" className="pdl-note pdl-note--error" style={{ marginTop: 16 }}>
                {error}
              </div>
            )}
          </div>

          <aside className="pdl-summary" aria-label="Resumo do pedido">
            <div className="pdl-summary-desktop">{summary}</div>
          </aside>
        </div>
      </div>
    </div>
  );
}
