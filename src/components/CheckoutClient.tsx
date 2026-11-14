'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PdlHeader from '@/components/PdlHeader';
import PdlImg from '@/components/PdlImg';
import CardFields, { type CardFieldsHandle } from '@/components/CardFields';
import { IconArrowRight, IconLock, IconChevronDown, Sparkle } from '@/components/Icons';
import { useCart } from '@/context/CartContext';
import { formatCentavos } from '@/lib/money';
import { formatCEP, isValidCEP, fetchCEPData, extractAddressFromCEP } from '@/lib/cep';
import { formatCPF, isValidCPF, onlyDigits } from '@/lib/cpf';
import { createOrderAction, quoteCheckoutAction, type QuoteResult, type CheckoutPayment } from '@/app/actions/checkout';
import type { PaymentRejection } from '@/lib/payments';
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
type Method = 'pix' | 'card' | 'boleto';

// Chave pública: identifica a loja no navegador e só serve para gerar o
// token do cartão. Pode (e precisa) ir no bundle do cliente.
const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? '';

const METHODS: { id: Method; name: string; desc: string; tag?: string }[] = [
  { id: 'pix', name: 'Pix', desc: 'Você paga pelo aplicativo do seu banco.', tag: 'aprovação na hora' },
  { id: 'card', name: 'Cartão de crédito', desc: 'Pague à vista ou parcele, direto aqui na loja.' },
  { id: 'boleto', name: 'Boleto', desc: 'Pague no banco, na lotérica ou pelo aplicativo. Aprovação em até 2 dias úteis.' },
];

// Toda recusa termina dizendo o que a pessoa mais quer saber: nada foi cobrado.
const REJECTION_MESSAGE: Record<PaymentRejection, string> = {
  insufficient_funds: 'O cartão não tem limite disponível para esta compra. Tente outro cartão ou pague com Pix.',
  card_data: 'Algum dado do cartão não confere. Confira o número, a validade e o código de segurança.',
  issuer: 'O banco do cartão não autorizou a compra. Você pode ligar para o banco, tentar outro cartão ou pagar com Pix.',
  risk: 'O pagamento não foi autorizado por segurança. Tente outro cartão ou pague com Pix.',
  installments: 'Esse parcelamento não está disponível para este cartão. Escolha menos parcelas ou pague à vista.',
  other: 'O pagamento não foi aprovado. Tente outro cartão ou pague com Pix.',
};

export default function CheckoutClient({
  savedAddresses,
  profile,
  maxInstallments,
  paymentFailed = false,
}: {
  savedAddresses: Address[];
  profile: Profile | null;
  /** Máximo de parcelas definido no admin. */
  maxInstallments: number;
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

  // Pagamento. Pix vem escolhido: é o caminho mais curto e sem digitação.
  const [method, setMethod] = useState<Method>('pix');
  const [cpf, setCpf] = useState('');
  const [cpfError, setCpfError] = useState<string | null>(null);
  const cardRef = useRef<CardFieldsHandle>(null);
  const errorRef = useRef<HTMLDivElement>(null);

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

  const fail = (message: string) => {
    setError(message);
    setPlacing(false);
    // A mensagem aparece acima do botão; garante que ela esteja à vista.
    requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const placeOrder = async () => {
    setError(null);

    if (!isValidCPF(cpf)) {
      setCpfError('Confira o CPF: são 11 números.');
      document.getElementById('ck-cpf')?.focus();
      return;
    }

    setPlacing(true);

    try {
      const payment: CheckoutPayment = { cpf: onlyDigits(cpf), method };

      if (method === 'card') {
        const card = await cardRef.current?.submit(onlyDigits(cpf));
        if (!card) return fail('O formulário do cartão ainda está carregando. Aguarde um instante e tente de novo.');
        if (!card.ok) return fail(card.message);
        const { deviceId, ...rest } = card.card;
        payment.card = rest;
        payment.deviceId = deviceId;
      }

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

      const result = await createOrderAction(
        cart.map((i) => ({ id: i.pid, size: i.size, qty: i.qty })),
        address,
        payment,
        appliedCoupon
      );

      if (result.status !== 'rejected' && result.status !== 'error') {
        // A sacola é esvaziada na confirmação. `placing` segue ligado para
        // o botão não voltar a ficar clicável durante a navegação.
        router.push(`/confirmacao?order_id=${result.orderId}`);
        return;
      }

      if (result.status === 'rejected') {
        return fail(`${REJECTION_MESSAGE[result.reason]} Nada foi cobrado.`);
      }

      if (result.code === 'cpf') {
        setCpfError(result.message);
        setPlacing(false);
        document.getElementById('ck-cpf')?.focus();
        return;
      }
      if (result.code === 'coupon') setCouponCode(null);
      fail(result.message);
    } catch {
      fail('Não conseguimos concluir o pagamento agora. Nada foi cobrado — tente de novo em instantes.');
    }
  };

  const total = quote ? formatCentavos(quote.totalCentavos) : '…';
  const ctaLabel = method === 'pix' ? `Gerar código Pix · ${total}` : method === 'boleto' ? `Gerar boleto · ${total}` : `Pagar ${total}`;
  const placingLabel = method === 'pix' ? 'gerando seu Pix…' : method === 'boleto' ? 'gerando seu boleto…' : 'processando o pagamento…';

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
              <span className={`step ${step === 2 ? 'active' : ''}`}><i>2</i> pagamento</span>
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
                    continuar para o pagamento <IconArrowRight size={13} />
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

                {/* ─── 2. Pagamento ─────────────────────────── */}
                <section className="pdl-checkout-section pdl-pay" style={{ borderBottom: 'none' }}>
                  <h3><span>Como você prefere <em>pagar?</em></span></h3>

                  <div className="pdl-pay-options" role="radiogroup" aria-label="Forma de pagamento">
                    {METHODS.map((m) => {
                      const selected = method === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          className={`pdl-pay-option${selected ? ' selected' : ''}`}
                          onClick={() => { setMethod(m.id); setError(null); }}
                          disabled={placing}
                        >
                          <span className="pdl-radio" aria-hidden />
                          <span className="text">
                            <span className="name">
                              {m.name}
                              {m.tag && <span className="tag">{m.tag}</span>}
                            </span>
                            <span className="desc">
                              {m.id === 'card' && maxInstallments > 1 ? `Pague à vista ou em até ${maxInstallments}x, direto aqui na loja.` : m.desc}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pdl-pay-form">
                    {method === 'card' && (
                      MP_PUBLIC_KEY ? (
                        <CardFields
                          ref={cardRef}
                          publicKey={MP_PUBLIC_KEY}
                          amountCentavos={quote?.totalCentavos ?? 0}
                          maxInstallments={maxInstallments}
                          disabled={placing}
                        />
                      ) : (
                        <div className="pdl-note" role="status">
                          O pagamento com cartão está indisponível no momento. Você pode pagar com Pix ou boleto.
                        </div>
                      )
                    )}

                    <div className="pdl-field-group">
                      <label className="pdl-pay-label" htmlFor="ck-cpf">
                        {method === 'card' ? 'CPF do titular do cartão' : 'CPF de quem vai pagar'}
                      </label>
                      <input
                        id="ck-cpf"
                        className={`pdl-field${cpfError ? ' pdl-field--error' : ''}`}
                        value={cpf}
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="000.000.000-00"
                        onChange={(e) => { setCpf(formatCPF(e.target.value)); setCpfError(null); }}
                        onBlur={() => { if (cpf && !isValidCPF(cpf)) setCpfError('Confira o CPF: são 11 números.'); }}
                        aria-invalid={!!cpfError}
                        aria-describedby="ck-cpf-hint"
                        disabled={placing}
                      />
                      {cpfError
                        ? <span className="pdl-field-error" id="ck-cpf-hint" role="alert">{cpfError}</span>
                        : <span className="pdl-pay-hint" id="ck-cpf-hint">O banco pede o CPF para identificar o pagamento.</span>}
                    </div>

                    {method === 'pix' && (
                      <p className="pdl-pay-explain">
                        Na próxima tela mostramos um <strong>código</strong> para você pagar no aplicativo do seu banco.
                        A confirmação chega em poucos segundos.
                      </p>
                    )}
                    {method === 'boleto' && (
                      <p className="pdl-pay-explain">
                        Na próxima tela você recebe o <strong>boleto</strong> para pagar onde preferir.
                        O pedido é enviado depois que o banco confirmar o pagamento.
                      </p>
                    )}
                  </div>

                  {error && (
                    <div ref={errorRef} role="alert" className="pdl-note pdl-note--error" style={{ marginTop: 16, fontSize: 15 }}>
                      {error}
                    </div>
                  )}

                  <div className="pdl-cart-cta pdl-cart-cta--checkout">
                    <button
                      className="pdl-btn pdl-btn--primary pdl-btn--lg pdl-btn--block pdl-pay-submit"
                      onClick={placeOrder}
                      disabled={placing || quoteLoading || !quote || (method === 'card' && !MP_PUBLIC_KEY)}
                    >
                      {placing ? placingLabel : ctaLabel}
                    </button>
                    <div className="pdl-cart-secure">
                      <IconLock size={12} />
                      pagamento seguro · processado pelo Mercado Pago
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
