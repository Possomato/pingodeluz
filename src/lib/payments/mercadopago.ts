import MercadoPagoConfig, { Order, Payment } from 'mercadopago';
import type { OrderResponse } from 'mercadopago/dist/clients/order/commonTypes';
import { createHmac, timingSafeEqual } from 'crypto';
import { reaisToCentavos } from './amount';
import {
  PaymentRequestError,
  type CreatePaymentInput,
  type CreatePaymentResult,
  type NormalizedPaymentStatus,
  type PaymentGateway,
  type PaymentInstructions,
  type PaymentNotification,
  type PaymentRejection,
  type WebhookVerification,
} from './types';

/**
 * Adaptador Mercado Pago — Checkout Transparente sobre a API de Orders.
 *
 * Este é o único arquivo do projeto que importa o SDK do Mercado Pago.
 * Tudo aqui dentro traduz entre o vocabulário do provedor e o contrato
 * em `types.ts`.
 *
 * Fluxo: `POST /v1/orders` (type `online`, processing_mode `automatic`)
 * já cria e processa a cobrança. Cartão responde na hora (aprovado ou
 * recusado); Pix e boleto ficam `action_required` e devolvem o código
 * para pagar. Mudanças posteriores chegam pelo webhook `type: "order"`.
 *
 * O número do cartão nunca passa por aqui: o navegador o troca por um
 * token nos campos seguros do Mercado Pago (ADR-4).
 *
 * O webhook ainda entende notificações `type: "payment"` de pedidos
 * criados pela API antiga (Preferences).
 */

// ─── Tradução de vocabulário ─────────────────────────────────

/** Status da API de Payments (fluxo antigo) → status do domínio. */
export function normalizeStatus(mpStatus: string | undefined): NormalizedPaymentStatus {
  switch (mpStatus) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'cancelled':
      return 'cancelled';
    case 'refunded':
    case 'charged_back':
      return 'refunded';
    default:
      // in_process, in_mediation, pending, authorized…
      return 'pending';
  }
}

/**
 * Status de uma order → status do domínio.
 *
 * A order só fica `processed` quando o pagamento foi creditado; estorno
 * mantém `processed` e muda o `status_detail`. Estorno parcial conta
 * como pago — o pedido segue de pé e o ajuste é tratado à mão.
 */
export function normalizeOrderStatus(
  status: string | undefined,
  statusDetail?: string | undefined
): NormalizedPaymentStatus {
  if (statusDetail === 'refunded' || statusDetail === 'charged_back') return 'refunded';
  switch (status) {
    case 'processed':
      return 'approved';
    case 'refunded':
    case 'charged_back':
      return 'refunded';
    case 'failed':
      return 'rejected';
    case 'canceled':
    case 'cancelled':
    case 'expired':
      return 'cancelled';
    default:
      // created, action_required, processing…
      return 'pending';
  }
}

/** `payment_method` do MP → método genérico. */
export function normalizeMethod(
  paymentMethodId: string | undefined,
  paymentMethodType?: string | undefined
): string | undefined {
  const type = paymentMethodType?.toLowerCase();
  if (type === 'debit_card') return 'debit_card';
  if (type === 'ticket') return 'boleto';
  if (type === 'bank_transfer') return 'pix';

  if (!paymentMethodId) return type === 'credit_card' ? 'credit_card' : undefined;
  const id = paymentMethodId.toLowerCase();
  if (id.includes('pix')) return 'pix';
  if (id.includes('bolbradesco') || id.includes('boleto')) return 'boleto';
  // Cartões de débito do MP vêm como debvisa, debmaster, debelo…
  if (id.startsWith('deb')) return 'debit_card';
  return 'credit_card';
}

/** `status_detail` de uma cobrança recusada → motivo do domínio. */
export function normalizeRejection(statusDetail: string | undefined): PaymentRejection {
  const d = (statusDetail ?? '').toLowerCase();
  if (d.includes('insufficient')) return 'insufficient_funds';
  if (d.includes('bad_filled') || d.includes('invalid_card') || d.includes('security_code') || d.includes('expired')) {
    return 'card_data';
  }
  if (d.includes('installments') || d.includes('transaction_amount')) return 'installments';
  if (d.includes('risk') || d.includes('fraud') || d.includes('blacklist') || d.includes('regulations')) return 'risk';
  if (d.includes('issuer') || d.includes('call_for_authorize') || d.includes('card_disabled') || d.includes('max_attempts')) {
    return 'issuer';
  }
  return 'other';
}

// ─── Referência externa ──────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COMPACT_UUID_RE = /^[0-9a-f]{32}$/i;

/**
 * A API de Orders aceita só letras e números em `external_reference`.
 * O id do pedido é um UUID, então vai sem os hífens e volta com eles.
 */
export function toExternalReference(orderId: string): string {
  return UUID_RE.test(orderId) ? orderId.replace(/-/g, '') : orderId;
}

export function fromExternalReference(ref: string): string {
  if (!COMPACT_UUID_RE.test(ref)) return ref;
  const r = ref.toLowerCase();
  return `${r.slice(0, 8)}-${r.slice(8, 12)}-${r.slice(12, 16)}-${r.slice(16, 20)}-${r.slice(20)}`;
}

// ─── Montagem dos itens ──────────────────────────────────────

export interface OrderLine {
  external_code: string;
  title: string;
  quantity: number;
  unit_price: string;
}

const brl = (centavos: number) => (centavos / 100).toFixed(2);

/**
 * A order exige que a soma dos itens seja exatamente o `total_amount`, e
 * não aceita item negativo nem campo de cupom. Sem desconto, mandamos as
 * peças e o frete como linhas próprias. Com desconto (ou se as contas não
 * fecharem por qualquer motivo), uma linha única com o valor final — o
 * que o MP mostra é só exibição; o que vale é o total.
 */
export function buildOrderLines(
  input: Pick<CreatePaymentInput, 'items' | 'freightCentavos' | 'discountCentavos' | 'totalCentavos' | 'orderNumber'>
): OrderLine[] {
  const lines: OrderLine[] = input.items.map((item) => ({
    external_code: item.id,
    title: item.title,
    quantity: item.quantity,
    unit_price: brl(item.unitPriceCentavos),
  }));

  if (input.freightCentavos > 0) {
    lines.push({ external_code: 'frete', title: 'Frete', quantity: 1, unit_price: brl(input.freightCentavos) });
  }

  const sum = lines.reduce((n, l) => n + Math.round(Number(l.unit_price) * 100) * l.quantity, 0);
  if (input.discountCentavos > 0 || sum !== input.totalCentavos) {
    return [{
      external_code: input.orderNumber,
      title: `Pedido ${input.orderNumber} · Pingo de Luz`,
      quantity: 1,
      unit_price: brl(input.totalCentavos),
    }];
  }
  return lines;
}

// ─── Assinatura do webhook ───────────────────────────────────

function signatureMatches(manifest: string, secret: string, v1: string): boolean {
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');
  // Comparação em tempo constante evita vazar a assinatura por timing.
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(v1, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Assinatura do webhook: o MP manda `x-signature: ts=...,v1=...` e o
 * manifesto assinado é `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`.
 *
 * Ids de order são alfanuméricos (`ORD01J…`) e a regra do MP é usar o
 * `data.id` em minúsculas nesse caso. Aceitamos as duas grafias: a
 * documentação de Orders não é explícita e a segurança vem do HMAC, não
 * da caixa das letras.
 */
export function verifyMercadoPagoSignature(params: {
  xSignature: string;
  xRequestId: string;
  dataId: string;
  secret: string;
}): WebhookVerification {
  const { xSignature, xRequestId, dataId, secret } = params;

  if (!secret) return { valid: false, reason: 'MISSING_SECRET' };
  if (!xSignature) return { valid: false, reason: 'MISSING_SIGNATURE' };

  const parts = xSignature.split(',').reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return { valid: false, reason: 'MALFORMED_SIGNATURE' };

  const candidates = Array.from(new Set([dataId, dataId.toLowerCase()]));
  const ok = candidates.some((id) =>
    signatureMatches(`id:${id};request-id:${xRequestId};ts:${ts};`, secret, v1)
  );

  return ok ? { valid: true } : { valid: false, reason: 'SIGNATURE_MISMATCH' };
}

// ─── Corpo da order e leitura da resposta ────────────────────

type OrderCreateBody = Parameters<Order['create']>[0]['body'];

const digits = (v: string) => v.replace(/\D/g, '');

/** Monta o `POST /v1/orders`. Pura, para ser testada sem rede. */
export function buildOrderBody(input: CreatePaymentInput): OrderCreateBody {
  const total = brl(input.totalCentavos);
  const [firstName, ...rest] = input.payer.name.trim().split(/\s+/);
  const a = input.payer.address;

  const method = input.method;
  const paymentMethod =
    method.kind === 'pix'
      ? { id: 'pix', type: 'bank_transfer' }
      : method.kind === 'boleto'
        ? { id: 'boleto', type: 'ticket' }
        : {
            id: method.brand,
            type: method.cardType,
            token: method.token,
            installments: method.cardType === 'debit_card' ? 1 : method.installments,
            statement_descriptor: 'PINGODELUZ',
          };

  return {
    type: 'online',
    processing_mode: 'automatic',
    total_amount: total,
    external_reference: toExternalReference(input.orderId),
    description: `Pedido ${input.orderNumber} · Pingo de Luz`,
    payer: {
      email: input.payer.email,
      ...(firstName ? { first_name: firstName } : {}),
      ...(rest.length ? { last_name: rest.join(' ') } : {}),
      identification: { type: 'CPF', number: digits(input.payer.cpf) },
      ...(a
        ? {
            address: {
              zip_code: digits(a.zip),
              street_name: a.street,
              street_number: a.number,
              neighborhood: a.neighborhood,
              city: a.city,
              state: a.state,
              ...(a.complement ? { complement: a.complement } : {}),
            },
          }
        : {}),
    },
    items: buildOrderLines(input),
    transactions: { payments: [{ amount: total, payment_method: paymentMethod }] },
  } as OrderCreateBody;
}

const toCentavos = (v: string | undefined) => reaisToCentavos(v != null ? Number(v) : undefined);

function lastPayment(order: OrderResponse) {
  // Na order com mais de uma tentativa, a última é a que vale.
  const payments = order.transactions?.payments ?? [];
  return payments[payments.length - 1];
}

/**
 * Valor pago, para conferir contra o pedido. No parcelado com juros o
 * cliente paga mais que o total — a diferença é do financiamento, não
 * da loja — então pagar a mais conta como o total exato.
 */
export function paidCentavosOf(order: Pick<OrderResponse, 'total_amount' | 'total_paid_amount'>): number | undefined {
  const paid = toCentavos(order.total_paid_amount);
  const total = toCentavos(order.total_amount);
  if (paid === undefined) return undefined;
  return total !== undefined && paid >= total ? total : paid;
}

/** Pix ou boleto ainda em aberto dentro de uma order. */
export function instructionsFromOrder(order: OrderResponse): PaymentInstructions | null {
  const payment = lastPayment(order);
  const pm = payment?.payment_method;
  if (!pm) return null;

  if (pm.qr_code) {
    return {
      kind: 'pix',
      code: pm.qr_code,
      qrCodeBase64: pm.qr_code_base64,
      expiresAt: payment?.date_of_expiration,
    };
  }
  if (pm.type === 'ticket' && pm.ticket_url) {
    return {
      kind: 'boleto',
      url: pm.ticket_url,
      digitableLine: pm.digitable_line,
      expiresAt: payment?.date_of_expiration,
    };
  }
  return null;
}

export function notificationFromOrder(order: OrderResponse): PaymentNotification | null {
  if (!order.external_reference) return null;
  const pm = lastPayment(order)?.payment_method;

  return {
    // O status entra na chave para que uma transição real (pendente →
    // pago) seja processada, mas reentregas do mesmo evento não.
    eventId: `${order.id}:${order.status}:${order.status_detail ?? ''}`,
    externalPaymentId: String(order.id),
    orderId: fromExternalReference(order.external_reference),
    status: normalizeOrderStatus(order.status, order.status_detail),
    method: normalizeMethod(pm?.id, pm?.type),
    amountCentavos: paidCentavosOf(order),
    raw: order,
  };
}

// ─── Gateway ─────────────────────────────────────────────────

/** Formato do erro que o SDK lança quando a API responde fora de 2xx. */
interface MpApiError {
  data?: OrderResponse;
  errors?: { code?: string; message?: string; details?: string[] }[];
}

export class MercadoPagoGateway implements PaymentGateway {
  readonly provider = 'mercadopago';

  private readonly client: MercadoPagoConfig;

  constructor(accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN) {
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');
    }
    this.client = new MercadoPagoConfig({ accessToken });
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    let order: OrderResponse;

    try {
      order = await new Order(this.client).create({
        body: buildOrderBody(input),
        requestOptions: {
          // Um pedido da loja = uma cobrança: repetir a chamada (rede
          // instável, duplo clique) não cobra duas vezes.
          idempotencyKey: input.orderId,
          ...(input.deviceId ? { meliSessionId: input.deviceId } : {}),
        },
      });
    } catch (err) {
      const apiError = err as MpApiError;
      // Cartão recusado volta como 402 com a order criada dentro de `data`.
      if (apiError?.data?.id) {
        order = apiError.data;
      } else {
        // Não chegou a existir cobrança (ex.: parcelamento indisponível).
        const code = apiError?.errors?.[0]?.code ?? '';
        console.error('[mercadopago] order recusada:', JSON.stringify(apiError?.errors ?? err));
        throw new PaymentRequestError(normalizeRejection(code), code || 'falha ao criar a cobrança');
      }
    }

    const notification = notificationFromOrder(order);
    if (!notification) throw new Error('Mercado Pago devolveu order sem external_reference');

    const failedDetail = lastPayment(order)?.status_detail ?? order.status_detail;

    return {
      notification,
      ...(notification.status === 'rejected' ? { rejection: normalizeRejection(failedDetail) } : {}),
      ...(notification.status === 'pending' ? { instructions: instructionsFromOrder(order) ?? undefined } : {}),
    };
  }

  async getInstructions(externalPaymentId: string): Promise<PaymentInstructions | null> {
    const order = await new Order(this.client).get({ id: externalPaymentId });
    if (normalizeOrderStatus(order.status, order.status_detail) !== 'pending') return null;
    return instructionsFromOrder(order);
  }

  verifyWebhook(request: Request, _rawBody: string): WebhookVerification {
    const url = new URL(request.url);
    return verifyMercadoPagoSignature({
      xSignature: request.headers.get('x-signature') ?? '',
      xRequestId: request.headers.get('x-request-id') ?? '',
      dataId: url.searchParams.get('data.id') ?? '',
      secret: process.env.MERCADOPAGO_WEBHOOK_SECRET ?? '',
    });
  }

  async parseNotification(
    rawBody: string,
    _request: Request
  ): Promise<PaymentNotification | null> {
    let body: { type?: string; action?: string; data?: { id?: string } };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return null;
    }

    const id = body.data?.id ? String(body.data.id) : '';
    if (!id) return null;

    if (body.type === 'order') {
      return notificationFromOrder(await new Order(this.client).get({ id }));
    }
    // Pedidos criados pela API antiga (Preferences).
    if (body.type === 'payment') return this.parseLegacyPayment(id);

    // merchant_order, chargebacks avulsos, etc. — nada a fazer.
    return null;
  }

  private async parseLegacyPayment(id: string): Promise<PaymentNotification | null> {
    const data = await new Payment(this.client).get({ id });
    if (!data.external_reference) return null;

    return {
      eventId: `${data.id}:${data.status}`,
      externalPaymentId: String(data.id),
      orderId: fromExternalReference(data.external_reference),
      status: normalizeStatus(data.status),
      method: normalizeMethod(data.payment_method_id, data.payment_type_id),
      amountCentavos: reaisToCentavos(data.transaction_amount),
      raw: data,
    };
  }
}
