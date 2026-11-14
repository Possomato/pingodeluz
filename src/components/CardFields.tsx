'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { formatCentavos } from '@/lib/money';

/**
 * Campos de cartão do checkout transparente.
 *
 * Número, validade e código de segurança são iframes do Mercado Pago
 * ("campos seguros"): o que a pessoa digita vai direto para o provedor
 * e a loja só recebe um token. Nenhum dado de cartão toca o nosso
 * servidor nem o nosso JavaScript (ADR-4).
 *
 * As parcelas vêm do Mercado Pago para o cartão digitado — é a conta
 * da loja lá que define quantas existem e se têm juros. A loja só
 * limita ao máximo configurado no admin.
 */

// ─── Tipos mínimos do SDK (carregado por <script>) ───────────

interface MpField {
  mount(containerId: string): MpField;
  unmount(): void;
  update(props: { settings?: unknown; placeholder?: string; invalid?: boolean }): MpField;
  on(event: string, cb: (e: MpFieldEvent) => void): MpField;
}
interface MpFieldEvent {
  field: string;
  bin?: string | null;
  errorMessages?: { message: string; cause: string }[];
}
interface MpPayerCost {
  installments: number;
  installment_rate: number;
  installment_amount: number;
  total_amount: number;
}
interface MpInstance {
  fields: {
    create(type: string, options?: Record<string, unknown>): MpField;
    createCardToken(data: {
      cardholderName: string;
      identificationType: string;
      identificationNumber: string;
    }): Promise<{ id: string } | void>;
  };
  getPaymentMethods(p: { bin: string }): Promise<{
    results: { id: string; payment_type_id: string; settings: { card_number: unknown; security_code: unknown }[] }[];
  }>;
  getInstallments(p: { amount: string; bin: string; locale?: string }): Promise<{ payer_costs: MpPayerCost[] }[]>;
}
declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: Record<string, unknown>) => MpInstance;
    MP_DEVICE_SESSION_ID?: string;
  }
}

const SDK_URL = 'https://sdk.mercadopago.com/js/v2';
let sdkPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('sem janela'));
  if (window.MercadoPago) return Promise.resolve();
  if (!sdkPromise) {
    sdkPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        sdkPromise = null; // permite tentar de novo
        reject(new Error('Falha ao carregar o SDK do Mercado Pago'));
      };
      document.head.appendChild(script);
    });
  }
  return sdkPromise;
}

// ─── Componente ──────────────────────────────────────────────

export interface CardSubmission {
  token: string;
  brand: string;
  cardType: 'credit_card' | 'debit_card';
  installments: number;
  deviceId?: string;
}

export interface CardFieldsHandle {
  /** Valida, gera o token e devolve o que o servidor precisa — ou a mensagem de erro. */
  submit(cpfDigits: string): Promise<{ ok: true; card: CardSubmission } | { ok: false; message: string }>;
}

type SecureField = 'cardNumber' | 'expirationDate' | 'securityCode';

const FIELD_MESSAGE: Record<SecureField, string> = {
  cardNumber: 'Confira o número do cartão.',
  expirationDate: 'Confira a validade (mês e ano).',
  securityCode: 'Confira o código de segurança.',
};

const BRAND_LABEL: Record<string, string> = {
  visa: 'Visa', master: 'Mastercard', elo: 'Elo', amex: 'American Express', hipercard: 'Hipercard',
  debvisa: 'Visa débito', debmaster: 'Mastercard débito', debelo: 'Elo débito',
};

const FIELD_STYLE = {
  fontSize: '17px',
  color: '#2a2419',
  placeholderColor: '#b6a78a',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
};

const CardFields = forwardRef<CardFieldsHandle, {
  publicKey: string;
  amountCentavos: number;
  /** Máximo de parcelas permitido pela loja (admin → pagamentos). */
  maxInstallments: number;
  disabled?: boolean;
}>(function CardFields({ publicKey, amountCentavos, maxInstallments, disabled }, ref) {
  const mpRef = useRef<MpInstance | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  const [holder, setHolder] = useState('');
  const [holderError, setHolderError] = useState(false);
  const [invalid, setInvalid] = useState<Partial<Record<SecureField, boolean>>>({});
  const [touched, setTouched] = useState<Partial<Record<SecureField, boolean>>>({});
  const [focused, setFocused] = useState<SecureField | null>(null);

  const [bin, setBin] = useState<string | null>(null);
  const [brand, setBrand] = useState<{ id: string; type: string } | null>(null);
  const [costs, setCosts] = useState<MpPayerCost[]>([]);
  const [installments, setInstallments] = useState(1);

  // Monta os campos seguros uma vez por chave pública.
  useEffect(() => {
    let cancelled = false;
    const mounted: MpField[] = [];

    loadSdk()
      .then(() => {
        if (cancelled || !window.MercadoPago) return;
        const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
        mpRef.current = mp;

        const make = (type: SecureField, id: string, options: Record<string, unknown>) => {
          const field = mp.fields.create(type, { style: FIELD_STYLE, ...options }).mount(id);
          field.on('focus', () => setFocused(type));
          field.on('blur', () => {
            setFocused((f) => (f === type ? null : f));
            setTouched((t) => ({ ...t, [type]: true }));
          });
          field.on('validityChange', (e) => {
            setInvalid((v) => ({ ...v, [type]: (e.errorMessages?.length ?? 0) > 0 }));
          });
          mounted.push(field);
          return field;
        };

        const number = make('cardNumber', 'pdl-card-number', { placeholder: '0000 0000 0000 0000', srLabel: 'Número do cartão' });
        make('expirationDate', 'pdl-card-exp', { placeholder: 'MM/AA', mode: 'short', srLabel: 'Validade' });
        const cvv = make('securityCode', 'pdl-card-cvv', { placeholder: '123', srLabel: 'Código de segurança' });

        number.on('ready', () => { if (!cancelled) setStatus('ready'); });
        number.on('binChange', async (e) => {
          const next = e.bin ?? null;
          setBin(next);
          if (!next) { setBrand(null); return; }
          try {
            const { results } = await mp.getPaymentMethods({ bin: next });
            const pm = results?.[0];
            if (!pm || cancelled) return;
            setBrand({ id: pm.id, type: pm.payment_type_id });
            // Ajusta os tamanhos aceitos (Amex tem 15 dígitos e código de 4).
            const settings = pm.settings?.[0];
            if (settings) {
              number.update({ settings: settings.card_number });
              cvv.update({ settings: settings.security_code });
            }
          } catch {
            setBrand(null);
          }
        });
      })
      .catch(() => { if (!cancelled) setStatus('error'); });

    return () => {
      cancelled = true;
      mounted.forEach((f) => { try { f.unmount(); } catch { /* já removido */ } });
      mpRef.current = null;
    };
  }, [publicKey, attempt]);

  // Parcelas disponíveis para este cartão e este valor.
  useEffect(() => {
    const mp = mpRef.current;
    if (!mp || !bin || amountCentavos <= 0) return;
    let cancelled = false;

    mp.getInstallments({ amount: (amountCentavos / 100).toFixed(2), bin, locale: 'pt-BR' })
      .then((res) => {
        if (cancelled) return;
        const list = (res?.[0]?.payer_costs ?? []).filter((c) => c.installments <= Math.max(1, maxInstallments));
        setCosts(list);
        setInstallments((cur) => (list.some((c) => c.installments === cur) ? cur : 1));
      })
      .catch(() => { if (!cancelled) setCosts([]); });

    return () => { cancelled = true; };
  }, [bin, amountCentavos, maxInstallments]);

  const isDebit = brand?.type === 'debit_card';
  const visibleCosts = bin && !isDebit ? costs : [];

  useImperativeHandle(ref, () => ({
    async submit(cpfDigits) {
      const mp = mpRef.current;
      if (!mp || status !== 'ready') {
        return { ok: false, message: 'O formulário do cartão ainda está carregando. Aguarde um instante e tente de novo.' };
      }

      setTouched({ cardNumber: true, expirationDate: true, securityCode: true });
      const name = holder.trim();
      if (name.length < 3) {
        setHolderError(true);
        document.getElementById('pdl-card-holder')?.focus();
        return { ok: false, message: 'Digite o nome como está escrito no cartão.' };
      }
      const firstInvalid = (['cardNumber', 'expirationDate', 'securityCode'] as SecureField[]).find((f) => invalid[f]);
      if (firstInvalid) return { ok: false, message: FIELD_MESSAGE[firstInvalid] };
      if (!brand) return { ok: false, message: 'Confira o número do cartão.' };

      try {
        const token = await mp.fields.createCardToken({
          cardholderName: name,
          identificationType: 'CPF',
          identificationNumber: cpfDigits,
        });
        if (!token?.id) return { ok: false, message: 'Confira os dados do cartão: algum campo está incompleto.' };

        return {
          ok: true,
          card: {
            token: token.id,
            brand: brand.id,
            cardType: isDebit ? 'debit_card' : 'credit_card',
            installments: isDebit ? 1 : installments,
            deviceId: window.MP_DEVICE_SESSION_ID,
          },
        };
      } catch (err) {
        // O SDK rejeita com a lista de campos vazios ou inválidos.
        const causes = Array.isArray(err) ? err : [];
        const field = causes.map((c: { field?: string }) => c?.field).find((f): f is SecureField => !!f && f in FIELD_MESSAGE);
        if (field) setInvalid((v) => ({ ...v, [field]: true }));
        return { ok: false, message: field ? FIELD_MESSAGE[field] : 'Confira os dados do cartão: algum campo está incompleto.' };
      }
    },
  }), [status, holder, invalid, brand, isDebit, installments]);

  if (status === 'error') {
    return (
      <div className="pdl-note pdl-note--error" role="alert">
        Não conseguimos abrir o formulário do cartão. Verifique sua internet e{' '}
        <button type="button" className="pdl-link" onClick={() => { setStatus('loading'); setAttempt((a) => a + 1); }}>
          tente de novo
        </button>
        {' '}— ou escolha Pix ou boleto.
      </div>
    );
  }

  const secure = (type: SecureField, id: string, label: string, hint?: string) => {
    const showError = !!invalid[type] && !!touched[type];
    return (
      <div className="pdl-field-group">
        <span className="pdl-pay-label" id={`${id}-label`}>{label}</span>
        <div
          id={id}
          className={`pdl-field pdl-secure-field${focused === type ? ' focused' : ''}${showError ? ' pdl-field--error' : ''}`}
          aria-labelledby={`${id}-label`}
        />
        {showError
          ? <span className="pdl-field-error">{FIELD_MESSAGE[type]}</span>
          : hint && <span className="pdl-pay-hint">{hint}</span>}
      </div>
    );
  };

  return (
    <fieldset className="pdl-card-fields" disabled={disabled} aria-busy={status === 'loading'}>
      <legend className="pdl-sr-only">Dados do cartão</legend>

      {secure('cardNumber', 'pdl-card-number', 'Número do cartão',
        brand ? `Cartão ${BRAND_LABEL[brand.id] ?? brand.id}` : 'Os 16 números da frente do cartão')}

      <div className="pdl-field-group">
        <label className="pdl-pay-label" htmlFor="pdl-card-holder">Nome impresso no cartão</label>
        <input
          id="pdl-card-holder"
          className={`pdl-field${holderError ? ' pdl-field--error' : ''}`}
          value={holder}
          onChange={(e) => { setHolder(e.target.value.toUpperCase()); setHolderError(false); }}
          autoComplete="cc-name"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="Como está escrito no cartão"
        />
        {holderError && <span className="pdl-field-error">Digite o nome como está escrito no cartão.</span>}
      </div>

      <div className="pdl-form-row two" style={{ marginBottom: 0 }}>
        {secure('expirationDate', 'pdl-card-exp', 'Validade', 'Mês e ano')}
        {secure('securityCode', 'pdl-card-cvv', 'Código de segurança', 'Os 3 números do verso')}
      </div>

      {isDebit ? (
        <div className="pdl-pay-hint" style={{ fontSize: 15 }}>Cartão de débito: pagamento à vista de {formatCentavos(amountCentavos)}.</div>
      ) : visibleCosts.length > 1 ? (
        <div className="pdl-field-group">
          <label className="pdl-pay-label" htmlFor="pdl-card-installments">Em quantas vezes?</label>
          <select
            id="pdl-card-installments"
            className="pdl-field"
            value={installments}
            onChange={(e) => setInstallments(Number(e.target.value))}
          >
            {visibleCosts.map((c) => {
              const each = formatCentavos(Math.round(c.installment_amount * 100));
              const total = formatCentavos(Math.round(c.total_amount * 100));
              const label = c.installments === 1
                ? `À vista · ${total}`
                : c.installment_rate === 0
                  ? `${c.installments}x de ${each} sem juros`
                  : `${c.installments}x de ${each} · total ${total} (com juros)`;
              return <option key={c.installments} value={c.installments}>{label}</option>;
            })}
          </select>
        </div>
      ) : visibleCosts.length === 1 ? (
        <div className="pdl-pay-hint" style={{ fontSize: 15 }}>Pagamento à vista no cartão: {formatCentavos(amountCentavos)}.</div>
      ) : null}

      {status === 'loading' && <div className="pdl-pay-hint" role="status">Abrindo o formulário seguro…</div>}
    </fieldset>
  );
});

export default CardFields;
