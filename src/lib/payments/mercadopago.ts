import MercadoPagoConfig, { Order, Payment } from 'mercadopago';
import { createHmac, timingSafeEqual } from 'crypto';
import { reaisToCentavos } from './amount';
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  NormalizedPaymentStatus,
  PaymentGateway,
  PaymentNotification,
  WebhookVerification,
} from './types';

/**
 * Adaptador Mercado Pago — Checkout Pro sobre a API de Orders (ADR-4).
 *
 * Este é o único arquivo do projeto que importa o SDK do Mercado Pago.
 * Tudo aqui dentro traduz entre o vocabulário do provedor e o contrato
 * em `types.ts`.
 *
 * Fluxo: `POST /v1/orders` (type `online`, processing_mode `manual`)
 * devolve um `checkout_url`; o cliente paga lá; o MP avisa pelo webhook
 * com `type: "order"` e buscamos a order com `GET /v1/orders/{id}`.
 *
 * A API de Preferences (fluxo antigo) não cria mais cobranças, mas o
 * webhook ainda entende notificações `type: "payment"` para pedidos que
 * nasceram antes da migração e podem ser pagos ou estornados depois.
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
export function buildOrderLines(input: CreateCheckoutInput): OrderLine[] {
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

// ─── Gateway ─────────────────────────────────────────────────

type OrderCreateBody = Parameters<Order['create']>[0]['body'];

export class MercadoPagoGateway implements PaymentGateway {
  readonly provider = 'mercadopago';

  private readonly client: MercadoPagoConfig;

  constructor(accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN) {
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');
    }
    this.client = new MercadoPagoConfig({ accessToken });
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const order = new Order(this.client);
    const [firstName, ...rest] = (input.payerName ?? '').trim().split(/\s+/);

    // `notificationUrl` não entra aqui: na API de Orders o webhook só é
    // configurado no painel do MP (evento "Order (Mercado Pago)").
    const body = {
      type: 'online',
      processing_mode: 'manual',
      total_amount: brl(input.totalCentavos),
      external_reference: toExternalReference(input.orderId),
      description: `Pedido ${input.orderNumber}`,
      payer: {
        email: input.payerEmail,
        ...(firstName ? { first_name: firstName } : {}),
        ...(rest.length ? { last_name: rest.join(' ') } : {}),
      },
      items: buildOrderLines(input),
      config: {
        statement_descriptor: 'PINGODELUZ',
        online: {
          success_url: input.successUrl,
          failure_url: input.failureUrl,
          pending_url: input.pendingUrl,
          auto_return: 'approved',
        },
      },
    } as OrderCreateBody;

    const response = await order.create({
      body,
      // O id do pedido é único: uma nova tentativa do mesmo pedido não
      // cria uma segunda cobrança no MP.
      requestOptions: { idempotencyKey: input.orderId },
    });

    const checkoutUrl = (response as typeof response & { checkout_url?: string }).checkout_url;
    if (!checkoutUrl) {
      throw new Error('Mercado Pago não devolveu checkout_url');
    }

    return { redirectUrl: checkoutUrl, externalId: response.id };
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

    if (body.type === 'order') return this.parseOrder(id);
    // Pedidos criados antes da migração para Orders.
    if (body.type === 'payment') return this.parseLegacyPayment(id);

    // merchant_order, chargebacks avulsos, etc. — nada a fazer.
    return null;
  }

  private async parseOrder(id: string): Promise<PaymentNotification | null> {
    const data = await new Order(this.client).get({ id });
    if (!data.external_reference) return null;

    // Na order com mais de uma tentativa, a última é a que vale.
    const payments = data.transactions?.payments ?? [];
    const payment = payments[payments.length - 1];

    return {
      // O status entra na chave para que uma transição real (created →
      // processed) seja processada, mas reentregas do mesmo evento não.
      eventId: `${data.id}:${data.status}:${data.status_detail ?? ''}`,
      externalPaymentId: String(data.id),
      orderId: fromExternalReference(data.external_reference),
      status: normalizeOrderStatus(data.status, data.status_detail),
      method: normalizeMethod(payment?.payment_method?.id, payment?.payment_method?.type),
      amountCentavos: reaisToCentavos(
        data.total_paid_amount != null ? Number(data.total_paid_amount) : undefined
      ),
      raw: data,
    };
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
